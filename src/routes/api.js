// src/routes/api.js
// Define los dos endpoints públicos de la API.

'use strict';

const express = require('express');
const router = express.Router();
const { getSucursalesByCuit, getSucursalById } = require('../services/salesforce');

// ─── Helpers de formato para Botmaker ─────────────────────────────────────────

/**
 * Genera el texto estructurado que Botmaker mostrará al usuario
 * con el listado de sucursales.
 */
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

/**
 * Genera el texto estructurado con el detalle de una sucursal.
 */
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

// ─── GET /api/sucursales?cuit= ─────────────────────────────────────────────────

router.get('/sucursales', async (req, res) => {
  const { cuit } = req.query;

  // Validación básica del parámetro
  if (!cuit || cuit.trim() === '') {
    return res.status(400).json({
      ok: false,
      error: 'El parámetro "cuit" es requerido.',
    });
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

// ─── GET /api/sucursal?id= ─────────────────────────────────────────────────────

router.get('/sucursal', async (req, res) => {
  const { id } = req.query;

  if (!id || id.trim() === '') {
    return res.status(400).json({
      ok: false,
      error: 'El parámetro "id" es requerido.',
    });
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

module.exports = router;
