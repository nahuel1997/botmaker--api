const main = async () => {
  const API_BASE_URL = 'https://api.procare-latam.com/v1/bot/api';
  const API_KEY = 'pk_procare_OIYhc7lou7AL9tHk2SMPSMgiB0VwdIL44YIkzLPFhC8';

  const caseId = user.get('oster_selected_case_id');

  // Caso detalle
  const resCaso = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  if (resCaso.status === 404) {
    user.set('oster_case_error', 'No se encontró el caso seleccionado.');
    return;
  }

  const caso = await resCaso.json();
  user.set('oster_case_estado',     caso.estado      || '');
  user.set('oster_case_sub_estado', caso.subEstado   || '');
  user.set('oster_case_producto',   caso.producto    || '');
  user.set('oster_case_cli_id',     String(caso.cliId || ''));
  user.set('oster_case_error',      '');

  // Garantía
  const resGar = await fetch(`${API_BASE_URL}/warranty/${encodeURIComponent(caseId)}`, {
    method: 'GET',
    headers: { 'X-API-Key': API_KEY },
  });

  if (resGar.status === 404) {
    user.set('oster_warranty_reason', 'not_found');
    return;
  }

  const gar = await resGar.json();

  // IMPORTANTE: siempre usar 'reason', nunca el signo de daysRemaining
  user.set('oster_warranty_in_warranty',  gar.inWarranty ? 'true' : 'false');
  user.set('oster_warranty_reason',       gar.reason         || '');
  user.set('oster_warranty_fecha_compra', gar.fechaCompra    || '');
  user.set('oster_warranty_meses',        String(gar.warrantyMonths || ''));
  user.set('oster_warranty_ends',         gar.warrantyEnds   || '');
  user.set('oster_warranty_days',         String(gar.daysRemaining || ''));
};

main()
  .catch(err => {
    user.set('oster_case_error', err.message);
    bmconsole.log(`[Oster case-detail-warranty] Error - ${context.userData._id_} - ${err.message}`);
  })
  .finally(result.done);
