// src/routes/api.js
'use strict';

const express = require('express');
const router = express.Router();
const {
  getSucursalesByCuit,
  getSucursalById,
  getCredencialesByCuentaId,
  getOrdenesByCuentaId,
  getEstablecimientosByCuentaId,
  getEstadoFinancieroByCuentaId,
  getProductosByCuentaId,
  createLead,
} = require('../services/salesforce');

// ─── Helpers de formato para Botmaker ─────────────────────────────────────────

function formatearListadoParaBotmaker(cuentaMadre, sucursales) {
  if (sucursales.length === 0) {
    return `La cuenta *${cuentaMadre.nombre}* no tiene sucursales registradas.`;
  }
  const items = sucursales
    .map((s, i) => `${i + 1}. *${s.nombre}*${s.ciudad ? ` — ${s.ciudad}` : ''}`)
    .join('\n');
  return (
    `📋 *Sucursales de ${cuentaMadre.nombre}*\n\n` +
    `${items}\n\n` +
    `Seleccioná el número de la sucursal para ver más información.`
  );
}

function formatearDetalleParaBotmaker(sucursal) {
  const domicilio = [
    sucursal.domicilio.calle,
    sucursal.domicilio.ciudad,
    sucursal.domicilio.provincia,
    sucursal.domicilio.codigoPostal,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    `🏢 *${sucursal.nombre}*\n\n` +
    (domicilio ? `📍 Domicilio: ${domicilio}\n` : '') +
    (sucursal.telefono ? `📞 Teléfono: ${sucursal.telefono}\n` : '') +
    (sucursal.website ? `🌐 Web: ${sucursal.website}\n` : '') +
    (sucursal.descripcion ? `\n${sucursal.descripcion}` : '')
  ).trim();
}

function formatearCredencialesParaBotmaker(c) {
  return (
    `🔐 *Credenciales de ${c.nombre}*\n\n` +
    (c.usuarioCajero ? `👤 Usuario Cajero: ${c.usuarioCajero}\n` : '') +
    (c.contrasenaCajero ? `🔑 Contraseña Cajero: ${c.contrasenaCajero}\n` : '') +
    (c.usuarioDashPanel ? `👤 Usuario Dash Panel: ${c.usuarioDashPanel}\n` : '') +
    (c.contrasenaDashPanel ? `🔑 Contraseña Dash Panel: ${c.contrasenaDashPanel}\n` : '') +
    (c.mail ? `📧 Mail: ${c.mail}\n` : '') +
    (c.bancoPagador ? `🏦 Banco Pagador: ${c.bancoPagador}\n` : '')
  ).trim();
}

function formatearOrdenesParaBotmaker(ordenes) {
  if (ordenes.length === 0) {
    return '📋 No hay órdenes de trabajo registradas para esta sucursal.';
  }
  const items = ordenes
    .map((o, i) =>
      `${i + 1}. *${o.tipoOt || 'OT'}* — Estado: ${o.estado}` +
      (o.numeroDeSeguimiento ? ` — Seguimiento: ${o.numeroDeSeguimiento}` : '') +
      (o.logistica ? ` — Logística: ${o.logistica}` : '')
    )
    .join('\n');
  return `📋 *Órdenes de Trabajo*\n\n${items}`;
}

function formatearEstablecimientosParaBotmaker(establecimientos) {
  if (establecimientos.length === 0) {
    return '🏪 No hay establecimientos registrados para esta sucursal.';
  }
  const items = establecimientos
    .map((e, i) =>
      `${i + 1}. Terminal ID: *${e.terminalId}*` +
      (e.establecimientoVisa ? ` — VISA: ${e.establecimientoVisa}` : '')
    )
    .join('\n');
  return `🏪 *Establecimientos*\n\n${items}`;
}

function formatearEstadoFinancieroParaBotmaker(ef) {
  return (
    `💰 *Estado Financiero*\n\n` +
    (ef.planPP ? `📄 Plan PP: ${ef.planPP}\n` : '') +
    (ef.importePP ? `💵 Importe PP: ${ef.importePP}\n` : '')
  ).trim();
}

function formatearProductosParaBotmaker(productos) {
  if (productos.length === 0) {
    return '📦 No hay productos registrados para esta sucursal.';
  }
  const items = productos
    .map((p, i) => `${i + 1}. Terminal: *${p.terminal}*`)
    .join('\n');
  return `📦 *Productos*\n\n${items}`;
}

// ─── EXISTENTES ────────────────────────────────────────────────────────────────

// GET /api/sucursales?cuit=
router.get('/sucursales', async (req, res) => {
  const { cuit } = req.query;
  if (!cuit || cuit.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "cuit" es requerido.' });
  }
  try {
    const data = await getSucursalesByCuit(cuit);
    if (!data) {
      return res.status(404).json({
        ok: false,
        error: `No se encontró ninguna cuenta madre con el CUIT ${cuit}.`,
        textoBotmaker: `❌ No encontramos ninguna cuenta asociada al CUIT *${cuit}*. Verificá el número e intentá nuevamente.`,
      });
    }
    return res.status(200).json({
      ok: true,
      cuentaMadre: data.cuentaMadre,
      sucursales: data.sucursales,
      total: data.sucursales.length,
      textoBotmaker: formatearListadoParaBotmaker(data.cuentaMadre, data.sucursales),
    });
  } catch (err) {
    console.error('[GET /api/sucursales] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener las sucursales. Por favor intentá más tarde.',
    });
  }
});

// GET /api/sucursal?id=
router.get('/sucursal', async (req, res) => {
  const { id } = req.query;
  if (!id || id.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "id" es requerido.' });
  }
  try {
    const sucursal = await getSucursalById(id);
    if (!sucursal) {
      return res.status(404).json({
        ok: false,
        error: `No se encontró ninguna sucursal con el id ${id}.`,
        textoBotmaker: '❌ No encontramos información para la sucursal seleccionada.',
      });
    }
    return res.status(200).json({
      ok: true,
      sucursal,
      textoBotmaker: formatearDetalleParaBotmaker(sucursal),
    });
  } catch (err) {
    console.error('[GET /api/sucursal] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener los datos de la sucursal. Por favor intentá más tarde.',
    });
  }
});

// ─── NUEVOS ────────────────────────────────────────────────────────────────────

// GET /api/credenciales?cuentaId=
router.get('/credenciales', async (req, res) => {
  const { cuentaId } = req.query;
  if (!cuentaId || cuentaId.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "cuentaId" es requerido.' });
  }
  try {
    const credenciales = await getCredencialesByCuentaId(cuentaId);
    if (!credenciales) {
      return res.status(404).json({
        ok: false,
        error: `No se encontró la cuenta con id ${cuentaId}.`,
        textoBotmaker: '❌ No encontramos credenciales para la cuenta seleccionada.',
      });
    }
    return res.status(200).json({
      ok: true,
      credenciales,
      textoBotmaker: formatearCredencialesParaBotmaker(credenciales),
    });
  } catch (err) {
    console.error('[GET /api/credenciales] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener las credenciales. Por favor intentá más tarde.',
    });
  }
});

// GET /api/ordenes?cuentaId=
router.get('/ordenes', async (req, res) => {
  const { cuentaId } = req.query;
  if (!cuentaId || cuentaId.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "cuentaId" es requerido.' });
  }
  try {
    const ordenes = await getOrdenesByCuentaId(cuentaId);
    return res.status(200).json({
      ok: true,
      ordenes,
      total: ordenes.length,
      textoBotmaker: formatearOrdenesParaBotmaker(ordenes),
    });
  } catch (err) {
    console.error('[GET /api/ordenes] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener las órdenes. Por favor intentá más tarde.',
    });
  }
});

// GET /api/establecimientos?cuentaId=
router.get('/establecimientos', async (req, res) => {
  const { cuentaId } = req.query;
  if (!cuentaId || cuentaId.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "cuentaId" es requerido.' });
  }
  try {
    const establecimientos = await getEstablecimientosByCuentaId(cuentaId);
    return res.status(200).json({
      ok: true,
      establecimientos,
      total: establecimientos.length,
      textoBotmaker: formatearEstablecimientosParaBotmaker(establecimientos),
    });
  } catch (err) {
    console.error('[GET /api/establecimientos] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener los establecimientos. Por favor intentá más tarde.',
    });
  }
});

// GET /api/estado-financiero?cuentaId=
router.get('/estado-financiero', async (req, res) => {
  const { cuentaId } = req.query;
  if (!cuentaId || cuentaId.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "cuentaId" es requerido.' });
  }
  try {
    const estadoFinanciero = await getEstadoFinancieroByCuentaId(cuentaId);
    if (!estadoFinanciero) {
      return res.status(404).json({
        ok: false,
        error: `No se encontró estado financiero para la cuenta ${cuentaId}.`,
        textoBotmaker: '❌ No encontramos información financiera para esta cuenta.',
      });
    }
    return res.status(200).json({
      ok: true,
      estadoFinanciero,
      textoBotmaker: formatearEstadoFinancieroParaBotmaker(estadoFinanciero),
    });
  } catch (err) {
    console.error('[GET /api/estado-financiero] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener el estado financiero. Por favor intentá más tarde.',
    });
  }
});

// GET /api/productos?cuentaId=
router.get('/productos', async (req, res) => {
  const { cuentaId } = req.query;
  if (!cuentaId || cuentaId.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El parámetro "cuentaId" es requerido.' });
  }
  try {
    const productos = await getProductosByCuentaId(cuentaId);
    return res.status(200).json({
      ok: true,
      productos,
      total: productos.length,
      textoBotmaker: formatearProductosParaBotmaker(productos),
    });
  } catch (err) {
    console.error('[GET /api/productos] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al consultar Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al obtener los productos. Por favor intentá más tarde.',
    });
  }
});

// POST /api/leads
router.post('/leads', async (req, res) => {
  const { nombre, mail, telefono, cuit } = req.body;

  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El campo "nombre" es requerido.' });
  }
  if (!mail || mail.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El campo "mail" es requerido.' });
  }
  if (!telefono || telefono.trim() === '') {
    return res.status(400).json({ ok: false, error: 'El campo "telefono" es requerido.' });
  }

  try {
    const result = await createLead({ nombre, mail, telefono, cuit });
    return res.status(201).json({
      ok: true,
      leadId: result.id,
      textoBotmaker: `✅ ¡Gracias *${nombre}*! Tus datos fueron registrados correctamente. Un asesor te va a contactar a la brevedad.`,
    });
  } catch (err) {
    console.error('[POST /api/leads] Error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al crear el Lead en Salesforce.',
      textoBotmaker: '⚠️ Ocurrió un error al registrar tus datos. Por favor intentá más tarde.',
    });
  }
});


module.exports = router;
