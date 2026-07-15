// src/services/salesforce.js
'use strict';

const jsforce = require('jsforce');

let conn = null;

async function getConnection() {
  if (conn && conn.accessToken) {
    return conn;
  }
  conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
  });
  await conn.login(
    process.env.SF_USERNAME,
    process.env.SF_PASSWORD + process.env.SF_SECURITY_TOKEN
  );
  console.log(`[Salesforce] Sesión iniciada. Instance: ${conn.instanceUrl}`);
  return conn;
}

// ─── EXISTENTES ────────────────────────────────────────────────────────────────

async function getSucursalesByCuit(cuit) {
  const sf = await getConnection();
  const cuitField = process.env.SF_CUIT_FIELD || 'CUIT__c';

  const cuitNormalizado = cuit.replace(/\D/g, '').trim();
  const cuitSoql = `${cuitNormalizado}.0`;

  console.log(`[Salesforce] Buscando CUIT: ${cuitNormalizado} → SOQL: ${cuitSoql}`);

  const madreResult = await sf.query(
    `SELECT Id, Name, ${cuitField}, Phone, BillingCity, BillingState
     FROM Account
     WHERE ${cuitField} = ${cuitSoql}
       AND ParentId = null
     LIMIT 1`
  );

  if (madreResult.totalSize === 0) {
    return null;
  }

  const cuentaMadre = madreResult.records[0];

  const sucursalesResult = await sf.query(
    `SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState,
            BillingPostalCode, BillingCountry
     FROM Account
     WHERE ParentId = '${cuentaMadre.Id}'
     ORDER BY Name ASC`
  );

  return {
    cuentaMadre: {
      id: cuentaMadre.Id,
      nombre: cuentaMadre.Name,
      cuit: cuentaMadre[cuitField],
    },
    sucursales: sucursalesResult.records.map((s) => ({
      id: s.Id,
      nombre: s.Name,
      ciudad: s.BillingCity || '',
      provincia: s.BillingState || '',
    })),
  };
}

async function getSucursalById(id) {
  const sf = await getConnection();

  const result = await sf.query(
    `SELECT Id, Name, Phone, Website,
            BillingStreet, BillingCity, BillingState,
            BillingPostalCode, BillingCountry,
            Description,
            Parent.Name, Parent.Id
     FROM Account
     WHERE Id = '${id}'
     LIMIT 1`
  );

  if (result.totalSize === 0) {
    return null;
  }

  const s = result.records[0];

  return {
    id: s.Id,
    nombre: s.Name,
    telefono: s.Phone || '',
    website: s.Website || '',
    domicilio: {
      calle: s.BillingStreet || '',
      ciudad: s.BillingCity || '',
      provincia: s.BillingState || '',
      codigoPostal: s.BillingPostalCode || '',
      pais: s.BillingCountry || '',
    },
    descripcion: s.Description || '',
    cuentaMadre: s.Parent
      ? { id: s.Parent.Id, nombre: s.Parent.Name }
      : null,
  };
}

// ─── NUEVOS ────────────────────────────────────────────────────────────────────

/**
 * Devuelve los campos de credenciales y contacto de una sucursal (Account).
 * Campos: Usuario/Contraseña Cajero, Usuario/Contraseña Dash Panel, Mail, Banco Pagador.
 */
async function getCredencialesByCuentaId(id) {
  const sf = await getConnection();

  const result = await sf.query(
    `SELECT Id, Name,
            Usuario_Cajero__c, Contrase_a_Cajero__c,
            Usuario_Dash_Panel__c, Contrase_a_Dash_Panel__c,
            Mail__c, Seleccione_Banco__c
     FROM Account
     WHERE Id = '${id}'
     LIMIT 1`
  );

  if (result.totalSize === 0) {
    return null;
  }

  const a = result.records[0];

  return {
    id: a.Id,
    nombre: a.Name,
    usuarioCajero: a.Usuario_Cajero__c || '',
    contrasenaCajero: a.Contrase_a_Cajero__c || '',
    usuarioDashPanel: a.Usuario_Dash_Panel__c || '',
    contrasenaDashPanel: a.Contrase_a_Dash_Panel__c || '',
    mail: a.Mail__c || '',
    bancoPagador: a.Seleccione_Banco__c || '',
  };
}

/**
 * Devuelve las Órdenes de Trabajo asociadas a una cuenta.
 * Ordenadas por fecha de creación descendente (la más reciente primero).
 */
async function getOrdenesByCuentaId(cuentaId) {
  const sf = await getConnection();

  const result = await sf.query(
    `SELECT Id, RecordTypeId, RecordType.Name, Status,
            N_de_seguimiento__c, Logistica__c, CreatedDate
     FROM WorkOrder
     WHERE AccountId = '${cuentaId}'
     ORDER BY CreatedDate DESC
     LIMIT 10`
  );

  return result.records.map((o) => ({
    id: o.Id,
    tipoOt: o.RecordType ? o.RecordType.Name : '',
    recordTypeId: o.RecordTypeId || '',
    estado: o.Status || '',
    numeroDeSeguimiento: o.N_de_seguimiento__c || '',
    logistica: o.Logistica__c || '',
    fechaCreacion: o.CreatedDate || '',
  }));
}

/**
 * Devuelve los Establecimientos asociados a una cuenta.
 * Campos: Terminal ID (Name) y Establecimiento VISA (Terminal_ID__c).
 */
async function getEstablecimientosByCuentaId(cuentaId) {
  const sf = await getConnection();

  const result = await sf.query(
    `SELECT Id, Name, Terminal_ID__c
     FROM Establecimiento__c
     WHERE Cuenta__c = '${cuentaId}'
     ORDER BY Name ASC`
  );

  return result.records.map((e) => ({
    id: e.Id,
    terminalId: e.Name || '',
    establecimientoVisa: e.Terminal_ID__c || '',
  }));
}

/**
 * Devuelve el Estado Financiero asociado a una cuenta madre.
 * Campos: Plan PP (PP_Plan__c) e Importe PP (PP_Importe__c).
 */
async function getEstadoFinancieroByCuentaId(cuentaId) {
  const sf = await getConnection();

  const volResult = await sf.query(
    `SELECT Id, RPN_Contract_EstadoFinanciero__c
     FROM RPN_Vol_Tot_Matriz__c
     WHERE RPN_Account__c = '${cuentaId}'
     LIMIT 1`
  );

  if (volResult.totalSize === 0 || !volResult.records[0].RPN_Contract_EstadoFinanciero__c) {
    return null;
  }

  const contratoId = volResult.records[0].RPN_Contract_EstadoFinanciero__c;

  const contratoResult = await sf.query(
    `SELECT Id, PP_Plan__c, PP_Importe__c
     FROM Contract
     WHERE Id = '${contratoId}'
     LIMIT 1`
  );

  if (contratoResult.totalSize === 0) {
    return null;
  }

  const ef = contratoResult.records[0];

  return {
    id: ef.Id,
    planPP: ef.PP_Plan__c || '',
    importePP: ef.PP_Importe__c || '',
  };
}

/**
 * Devuelve los Productos asociados a una cuenta (sucursal).
 * Campo: Terminal (Name del objeto Productos).
 */
async function getProductosByCuentaId(cuentaId) {
  const sf = await getConnection();

  const result = await sf.query(
    `SELECT Id, Name
     FROM Asset
     WHERE AccountId = '${cuentaId}'
     ORDER BY Name ASC`
  );

  return result.records.map((p) => ({
    id: p.Id,
    terminal: p.Name || '',
  }));
}

/**
 * Crea un Lead en Salesforce a partir de los datos capturados por el bot.
 */
async function createLead({ nombre, mail, telefono, cuit }) {
  const sf = await getConnection();
  const partes = (nombre || "").trim().split(/\s+/);
  const lastName = partes.length > 1 ? partes.slice(1).join(" ") : partes[0];
  const firstName = partes.length > 1 ? partes[0] : "";
  const payload = {
    FirstName: firstName,
    LastName: lastName,
    Email: mail || "",
    MobilePhone: telefono || "",
    Company: nombre || "Sin empresa",
    LeadSource: "Web",
    CUIT__c: cuit ? Number(cuit) : null,
  };
  console.log("[Lead] Payload:", JSON.stringify(payload));
  const result = await sf.sobject("Lead").create(payload);
  if (!result.success) { throw new Error("Error: " + JSON.stringify(result.errors)); }
  return { id: result.id };
}

module.exports = {
  getSucursalesByCuit,
  getSucursalById,
  getCredencialesByCuentaId,
  getOrdenesByCuentaId,
  getEstablecimientosByCuentaId,
  getEstadoFinancieroByCuentaId,
  getProductosByCuentaId,
  createLead,
  __getConnection: getConnection,
};