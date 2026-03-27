const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ARCHIVE_EMAIL_TO = process.env.ARCHIVE_EMAIL_TO;
const ARCHIVE_EMAIL_FROM = process.env.ARCHIVE_EMAIL_FROM;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value) {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function isSilverOnlyItems(items = []) {
  return items.length > 0 && items.every(item => String(item.karat || '') === '800');
}

function getSheetLabel(items = []) {
  return isSilverOnlyItems(items)
    ? 'Scheda operazione rientro argento 800'
    : 'Scheda operazione compro oro (Art. 5 D.Lgs. 92/2017)';
}

function getAttachmentFileName(form = {}, items = []) {
  const base = isSilverOnlyItems(items) ? 'scheda-rientro-argento-800' : 'scheda-rientro-oro';
  return `${base}-${form.scheda_number || 'senza-numero'}.html`;
}

function getEmailSubject(form = {}, items = []) {
  const base = isSilverOnlyItems(items)
    ? 'Scheda rientro argento 800'
    : 'Scheda operazione compro oro';
  return `${base} #${form.scheda_number || 'Senza numero'} - ${form.store || 'Negozio'}`;
}

function getEmailText(form = {}, items = []) {
  const base = isSilverOnlyItems(items)
    ? 'scheda rientro argento 800'
    : 'scheda operazione compro oro';
  return `In allegato trovi la ${base} scaricabile #${form.scheda_number || 'Senza numero'}.`;
}

function buildItemsRows(items = []) {
  if (!items.length) {
    return `
      <tr>
        <td colspan="4" style="padding:6px 8px;border:1px solid #e8e1d5;text-align:center;">
          Nessun oggetto
        </td>
      </tr>
    `;
  }

  return items.map(item => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #e8e1d5;">
        ${escapeHtml(item.description || '-')}
      </td>
      <td style="padding:6px 8px;border:1px solid #e8e1d5;text-align:center;">
        ${String(item.karat || '18') === '800' ? '800' : `${escapeHtml(item.karat || '18')} kt`}
      </td>
      <td style="padding:6px 8px;border:1px solid #e8e1d5;text-align:center;">
        ${escapeHtml(item.quantity || 1)}
      </td>
      <td style="padding:6px 8px;border:1px solid #e8e1d5;text-align:right;">
        ${formatNumber(item.grams)} g
      </td>
    </tr>
  `).join('');
}

function buildPrintableHtml(form = {}, items = []) {
  const itemsRows = buildItemsRows(items);
  const sheetLabel = getSheetLabel(items);

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${sheetLabel}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 9mm;
    }

    .print-sheet {
      color: #111;
    }

    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #d9d1c4;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .print-brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: .01em;
      line-height: 1;
    }

    .print-sub {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-top: 4px;
    }

    .print-meta {
      text-align: right;
      font-size: 11px;
      color: #444;
      line-height: 1.45;
    }

    .print-section {
      margin-bottom: 10px;
    }

    .print-section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: #666;
      margin-bottom: 5px;
      font-weight: 700;
    }

    .print-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 12px;
    }

    .print-row {
      padding: 4px 0;
      border-bottom: 1px solid #ece6dc;
      font-size: 11px;
      line-height: 1.3;
    }

    .print-row strong {
      display: inline-block;
      min-width: 92px;
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    .print-table th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #666;
      background: #f7f3ec;
      padding: 6px 8px;
      border: 1px solid #e8e1d5;
      line-height: 1.2;
    }

    .print-table td {
      padding: 6px 8px;
      border: 1px solid #e8e1d5;
      font-size: 11px;
      line-height: 1.25;
    }

    .print-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .print-summary-box {
      border: 1px solid #e8e1d5;
      border-radius: 10px;
      padding: 10px 12px;
      background: #fcfaf6;
    }

    .print-summary-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #777;
      letter-spacing: .05em;
      margin-bottom: 4px;
    }

    .print-summary-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.05;
    }

    .print-declarations {
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid #e8e1d5;
      border-radius: 10px;
      background: #fcfaf6;
    }

    .print-declaration-text {
      font-size: 10.5px;
      line-height: 1.45;
      color: #333;
      margin-bottom: 8px;
    }

    .print-declaration-text:last-child {
      margin-bottom: 0;
    }

    .print-signatures {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
      margin-top: 18px;
    }

    .print-sign-box {
      padding-top: 20px;
      border-top: 1px solid #444;
      font-size: 11px;
      color: #444;
      text-align: center;
    }

    @page {
      size: A4;
      margin: 9mm;
    }
  </style>
</head>
<body>
  <section class="print-sheet">
    <div class="print-header">
  <div>
    <div class="print-brand">BURATO GIOIELLI S.P.A.</div>
    <div class="print-sub">
      Sede legale: Piazza Milano, 12 – 30016 Jesolo (VE) · P.IVA e C.F. 02543700278
    </div>
    <div class="print-sub" style="margin-top:6px;">
      ${sheetLabel}
    </div>
  </div>
  <div class="print-meta">
    <div><strong>N° scheda:</strong> ${escapeHtml(form.scheda_number || '—')}</div>
    <div><strong>Negozio:</strong> ${escapeHtml(form.store || '—')}</div>
    <div><strong>Data:</strong> ${escapeHtml(form.created_at_display || '—')}</div>
  </div>
</div>

    <div class="print-section">
      <div class="print-section-title">Dati cliente</div>
      <div class="print-grid">
        <div class="print-row"><strong>Nome:</strong> ${escapeHtml(form.client_name || '—')}</div>
        <div class="print-row"><strong>Cognome:</strong> ${escapeHtml(form.client_surname || '—')}</div>
        <div class="print-row"><strong>Codice fiscale:</strong> ${escapeHtml(form.client_cf || '—')}</div>
        <div class="print-row"><strong>Telefono:</strong> ${escapeHtml(form.client_phone || '—')}</div>
        <div class="print-row" style="grid-column:1 / -1;"><strong>Indirizzo:</strong> ${escapeHtml(form.client_address || '—')}</div>
        <div class="print-row" style="grid-column:1 / -1;"><strong>IBAN:</strong> ${escapeHtml(form.iban || '—')}</div>
      </div>
    </div>

    <div class="print-section">
      <div class="print-section-title">Documento</div>
      <div class="print-grid">
        <div class="print-row"><strong>Tipo:</strong> ${escapeHtml(form.document_type || '—')}</div>
        <div class="print-row"><strong>Numero:</strong> ${escapeHtml(form.document_number || '—')}</div>
        <div class="print-row"><strong>Rilasciato da:</strong> ${escapeHtml(form.document_issued_by || '—')}</div>
        <div class="print-row"><strong>Scadenza:</strong> ${escapeHtml(form.document_expiry || '—')}</div>
      </div>
    </div>

    <div class="print-section">
      <div class="print-section-title">Oggetti conferiti</div>
      <table class="print-table">
        <thead>
          <tr>
            <th style="width:50%;">Descrizione</th>
            <th style="width:15%; text-align:center;">Caratura</th>
            <th style="width:15%; text-align:center;">Pezzi</th>
            <th style="width:20%; text-align:right;">Grammi</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div class="print-summary">
      <div class="print-summary-box">
        <div class="print-summary-label">Totale grammi</div>
        <div class="print-summary-value">${formatNumber(form.total_grams)} g</div>
      </div>
      <div class="print-summary-box">
        <div class="print-summary-label">Importo totale</div>
        <div class="print-summary-value">${formatNumber(form.total_eur)} €</div>
      </div>
    </div>

    <div class="print-section" style="margin-top:10px;">
      <div class="print-section-title">Note</div>
      <div class="print-row" style="min-height:40px;">${escapeHtml(form.notes || '—')}</div>
    </div>

    <div class="print-section print-declarations">
  <div class="print-section-title">Dichiarazioni cliente</div>

  <div class="print-declaration-text">
    Il sottoscritto dichiara di operare in qualità di soggetto privato e che gli oggetti ceduti sono usati, di sua piena ed esclusiva proprietà, nella sua libera disponibilità giuridica e di lecita provenienza, non derivanti da furto, appropriazione indebita, ricettazione o altra provenienza illecita.
  </div>

  <div class="print-declaration-text">
    Il sottoscritto dichiara inoltre di aver ricevuto e preso visione dell’informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) e di essere stato informato che i dati forniti saranno trattati da Burato Gioielli S.P.A. per finalità connesse alla gestione dell’operazione, agli adempimenti amministrativi, fiscali e agli obblighi di legge.
  </div>

  <div class="print-declaration-text">
    Il cliente si impegna, qualora a seguito di verifica il titolo degli oggetti risulti diverso da quello dichiarato o presunto, a restituire eventuali differenze di importo entro 7 giorni dalla richiesta.
  </div>
</div>

<div class="print-signatures">
  <div class="print-sign-box">Firma del cliente / dichiarante</div>
  <div class="print-sign-box">Firma operatore addetto all’identificazione</div>
</div>
  </section>
</body>
</html>`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Method not allowed' })
      };
    }

    if (!RESEND_API_KEY || !ARCHIVE_EMAIL_TO || !ARCHIVE_EMAIL_FROM) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Missing environment variables' })
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const { form = {}, items = [] } = payload;

    const attachmentHtml = buildPrintableHtml(form, items);
    const attachmentBase64 = Buffer.from(attachmentHtml, 'utf8').toString('base64');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: ARCHIVE_EMAIL_FROM,
        to: [ARCHIVE_EMAIL_TO],
        subject: getEmailSubject(form, items),
        text: getEmailText(form, items),
        attachments: [
          {
            filename: getAttachmentFileName(form, items),
            content: attachmentBase64
          }
        ]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: result })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, result })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message || 'Unknown error' })
    };
  }
};
