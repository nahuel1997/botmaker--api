// src/middleware/auth.js
// Valida que todas las requests incluyan el header x-api-key correcto.

'use strict';

/**
 * Middleware de autenticación por API Key.
 * Botmaker debe enviar el header: x-api-key: <API_KEY>
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'No autorizado: falta el header x-api-key.',
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      ok: false,
      error: 'No autorizado: API Key inválida.',
    });
  }

  next();
}

module.exports = apiKeyAuth;
