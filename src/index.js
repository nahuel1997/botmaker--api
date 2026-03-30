// src/index.js
// Entry point de la API middleware Botmaker ↔ Salesforce.

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const apiKeyAuth = require('./middleware/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health check (sin auth, para monitoreo básico del servidor) ───────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Rutas de la API (protegidas por API Key) ──────────────────────────────────
app.use('/api', apiKeyAuth, apiRoutes);

// ─── Ruta no encontrada ────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint no encontrado.' });
});

// ─── Error handler global ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error global]', err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor.' });
});

// ─── Inicio del servidor ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ API corriendo en http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Sucursales:   http://localhost:${PORT}/api/sucursales?cuit=XXXX`);
  console.log(`   Sucursal:     http://localhost:${PORT}/api/sucursal?id=XXXX`);
});
