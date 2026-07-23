const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  const payload = {
    cliId:                 Number(user.get('oster_case_cli_id')),
    proId:                 Number(user.get('oster_selected_pro_id')),
    facId:                 Number(user.get('oster_selected_fac_id')),
    cldId:                 Number(user.get('oster_selected_cld_id')),
    centroServicioId:      Number(user.get('oster_selected_centro_id')),
    numeroFactura:         user.get('oster_numero_factura')         || '',
    observacionProblema:   user.get('oster_observacion_problema')   || '',
    fechaReclamo:          user.get('oster_fecha_reclamo')          || new Date().toISOString().split('T')[0],
    disId:                 Number(user.get('oster_selected_dis_id')) || undefined,
    numeroSerie:           user.get('oster_numero_serie')           || undefined,
    ticketReferencia:      user.get('oster_ticket_referencia')      || undefined,
  };

  // Limpiar campos undefined para no enviarlos
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const idempotencyKey = `BOT-${context.userData._id_}-${Date.now()}`;

  const response = await fetch(`${API_BASE_URL}/cases`, {
    method: 'POST',
    headers: {
      'X-API-Key':       API_KEY,
      'Content-Type':    'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 400) {
    const err = await response.json();
    user.set('oster_create_case_error', err.error || 'Datos incompletos para crear el caso.');
    return;
  }

  if (response.status === 404) {
    const err = await response.json();
    user.set('oster_create_case_error', err.error || 'Cliente o producto no encontrado.');
    return;
  }

  const data = await response.json();
  user.set('oster_new_case_id',    String(data.caseId || data.odsId || ''));
  user.set('oster_new_case_estado', data.estado || 'NUEVO');
  user.set('oster_create_case_error', '');
  user.set('oster_create_case_texto',
    `✅ Tu caso fue creado exitosamente.\n📋 Número de caso: *${data.caseId || data.odsId}*\n📌 Estado: ${data.estado || 'NUEVO'}`
  );
};

main()
  .catch(err => {
    user.set('oster_create_case_error', err.message);
    bmconsole.log(`[Oster create-case] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
