const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  const paisId    = user.get('oster_pai_id');
  const municipio = user.get('oster_municipio');

  const response = await fetch(
    `${API_BASE_URL}/centros-servicio/by-text?paisId=${encodeURIComponent(paisId)}&municipio=${encodeURIComponent(municipio)}`,
    { method: 'GET', headers: { 'X-API-Key': API_KEY } }
  );

  if (response.status === 400) {
    const err = await response.json();
    user.set('oster_centros_error', err.error || 'Parámetros inválidos.');
    return;
  }

  const data = await response.json();

  user.set('oster_centros_total',     String(data.totalCount));
  user.set('oster_centros_truncated', data.truncatedAtCap ? 'true' : 'false');
  user.set('oster_centros_error',     '');

  if (data.centros && data.centros.length > 0) {
    // Texto formateado para mostrar al usuario
    const texto = data.centros
      .map((c, i) => {
        const tipo = c.coverageType === 'zone_specific' ? '📍' : '🌎';
        return `${i + 1}. ${tipo} *${c.descripcion}*` +
          (c.direccion ? `\n   ${c.direccion}` : '') +
          (c.telefono  ? `\n   📞 ${c.telefono}` : '');
      })
      .join('\n\n');
    user.set('oster_centros_texto', texto);
    user.set('oster_centros_json',  JSON.stringify(data.centros));
  } else {
    user.set('oster_centros_texto', '⚠️ No encontramos centros de servicio para tu municipio.');
    user.set('oster_centros_json',  '[]');
  }
};

main()
  .catch(err => {
    user.set('oster_centros_error', err.message);
    bmconsole.log(`[Oster centros] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
