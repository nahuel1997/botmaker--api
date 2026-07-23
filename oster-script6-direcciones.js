const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  const cliId = user.get('oster_case_cli_id');

  const response = await fetch(`${API_BASE_URL}/clientes/${encodeURIComponent(cliId)}/direcciones`, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  const data = await response.json();
  const direcciones = data.direcciones || data || [];

  user.set('oster_direcciones_json', JSON.stringify(direcciones));

  if (direcciones.length === 0) {
    user.set('oster_direcciones_texto', 'No tenés direcciones registradas.');
    return;
  }

  const texto = direcciones
    .map((d, i) => `${i + 1}. ${d.direccion || d.descripcion || JSON.stringify(d)}`)
    .join('\n');
  user.set('oster_direcciones_texto', texto);
  user.set('oster_direcciones_error', '');
};

main()
  .catch(err => {
    user.set('oster_direcciones_error', err.message);
    bmconsole.log(`[Oster direcciones] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
