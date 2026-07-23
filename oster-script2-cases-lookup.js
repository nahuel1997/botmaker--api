const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  const phone  = user.get('oster_phone') || context.userData.phone;
  const paiId  = user.get('oster_pai_id') || '';

  let url = `${API_BASE_URL}/cases?phone=${encodeURIComponent(phone)}`;
  if (paiId) url += `&paiId=${encodeURIComponent(paiId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  if (response.status === 404) {
    user.set('oster_cases_kind', 'not_found');
    user.set('oster_cases_error', 'No encontramos ningún cliente con ese número de teléfono.');
    return;
  }

  if (response.status === 400) {
    user.set('oster_cases_kind', 'invalid');
    user.set('oster_cases_error', 'Número de teléfono inválido.');
    return;
  }

  const data = await response.json();

  user.set('oster_cases_kind', data.kind);

  if (data.kind === 'ambiguous_country') {
    user.set('oster_country_candidates', JSON.stringify(data.candidates));
    return;
  }

  // kind === 'list'
  user.set('oster_cases_total', String(data.totalCount));
  user.set('oster_cases_truncated', data.truncatedAtCap ? 'true' : 'false');
  user.set('oster_cases_groups', JSON.stringify(data.groups));

  // Si hay casos, guardar el primer caso disponible como referencia rápida
  if (data.groups && data.groups.length > 0 && data.groups[0].cases.length > 0) {
    const primerCaso = data.groups[0].cases[0];
    user.set('oster_first_case_id',     String(primerCaso.odsId || primerCaso.id || ''));
    user.set('oster_first_case_estado', primerCaso.estado || '');
  }

  user.set('oster_cases_error', '');
};

main()
  .catch(err => {
    user.set('oster_cases_kind', 'error');
    user.set('oster_cases_error', err.message);
    bmconsole.log(`[Oster cases-lookup] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
