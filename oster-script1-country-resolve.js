const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  const phone = user.get('oster_phone') || context.userData.phone;

  const response = await fetch(`${API_BASE_URL}/country-resolve?phone=${encodeURIComponent(phone)}`, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  if (response.status === 404) {
    user.set('oster_country_kind', 'not_found');
    user.set('oster_country_error', 'No se encontró el país para este número.');
    return;
  }

  if (response.status === 400) {
    user.set('oster_country_kind', 'invalid');
    user.set('oster_country_error', 'Número de teléfono inválido.');
    return;
  }

  const data = await response.json();

  user.set('oster_country_kind', data.kind);

  if (data.kind === 'single') {
    user.set('oster_pai_id',   String(data.paiId));
    user.set('oster_pai_name', data.name);
    user.set('oster_country_candidates', '');
  } else if (data.kind === 'ambiguous') {
    // Guardar candidatos como JSON string para que Botmaker los pueda usar
    user.set('oster_country_candidates', JSON.stringify(data.candidates));
    user.set('oster_pai_id',   '');
    user.set('oster_pai_name', '');
  }
};

main()
  .catch(err => {
    user.set('oster_country_kind', 'error');
    user.set('oster_country_error', err.message);
    bmconsole.log(`[Oster country-resolve] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
