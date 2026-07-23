const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  // Paso 1: traer categorías
  const resCat = await fetch(`${API_BASE_URL}/categorias`, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  const dataCat = await resCat.json();
  const categorias = dataCat.categorias || [];

  user.set('oster_categorias_json', JSON.stringify(categorias));

  const textoCat = categorias
    .map((c, i) => `${i + 1}. ${c.denominacion}`)
    .join('\n');
  user.set('oster_categorias_texto', textoCat || 'No hay categorías disponibles.');

  // Paso 2: si ya hay una categoría seleccionada, traer sus fallas
  const catId = user.get('oster_selected_cat_id');
  if (!catId) {
    user.set('oster_fallas_json',  '[]');
    user.set('oster_fallas_texto', '');
    return;
  }

  const resFallas = await fetch(`${API_BASE_URL}/fallas?catId=${encodeURIComponent(catId)}`, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  if (resFallas.status === 400) {
    user.set('oster_fallas_error', 'catId inválido.');
    return;
  }

  const dataFallas = await resFallas.json();
  const fallas = dataFallas.fallas || [];

  user.set('oster_fallas_json', JSON.stringify(fallas));

  const textoFallas = fallas
    .map((f, i) => `${i + 1}. ${f.denominacion || f.nombre || f.name}`)
    .join('\n');
  user.set('oster_fallas_texto', textoFallas || 'No hay fallas disponibles para esta categoría.');
  user.set('oster_fallas_error', '');
};

main()
  .catch(err => {
    user.set('oster_fallas_error', err.message);
    bmconsole.log(`[Oster categorias-fallas] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
