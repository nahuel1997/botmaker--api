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

module.exports = { getSucursalesByCuit, getSucursalById };