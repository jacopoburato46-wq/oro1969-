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
    const {
      form = {},
      items = []
    } = payload;

    const customerFullName = [form.client_name, form.client_surname]
      .filter(Boolean)
      .join(' ')
      .trim() || '—';

    const itemsRows = items.length
      ? items.map(item => `
          <tr>
            <td style="padding:10px 12px;border:1px solid #e7dfd4;">${escapeHtml(item.description || '-')}</td>
            <td style="padding:10px 12px;border:1px solid #e7dfd4;text-align:center;">${escapeHtml(item.quantity || 1)}</td>
            <td style="padding:10px 12px;border:1px solid #e7dfd4;text-align:right;">${formatNumber(item.grams)} g</td>
          </tr>
        `).join('')
      : `
        <tr>
          <td colspan="3" style="padding:10px 12px;border:1px solid #e7dfd4;text-align:center;">Nessun oggetto</td>
        </tr>
      `;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f8f5ef;padding:24px;color:#111;">
        <div style="max-width:900px;margin:0 auto;background:#fff;border:1px solid #e7dfd4;border-radius:18px;padding:28px;">
          <div style="display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e7dfd4;padding-bottom:18px;margin-bottom:24px;">
            <div>
              <div style="font-size:28px;font-weight:800;">Burato Gioielli</div>
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin-top:6px;">Scheda rientro oro</div>
            </div>
            <div style="font-size:13px;color:#444;text-align:right;">
              <div><strong>N° scheda:</strong> ${escapeHtml(form.scheda_number || '—')}</div>
              <div><strong>Negozio:</strong> ${escapeHtml(form.store || '—')}</div>
              <div><strong>Data:</strong> ${escapeHtml(form.created_at_display || '—')}</div>
            </div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:10px;">Dati cliente</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Cliente:</strong> ${escapeHtml(customerFullName)}</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Codice fiscale:</strong> ${escapeHtml(form.client_cf || '—')}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Telefono:</strong> ${escapeHtml(form.client_phone || '—')}</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>IBAN:</strong> ${escapeHtml(form.iban || '—')}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Indirizzo:</strong> ${escapeHtml(form.client_address || '—')}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:10px;">Documento</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Tipo:</strong> ${escapeHtml(form.document_type || '—')}</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Numero:</strong> ${escapeHtml(form.document_number || '—')}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Rilasciato da:</strong> ${escapeHtml(form.document_issued_by || '—')}</td>
                <td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Scadenza:</strong> ${escapeHtml(form.document_expiry || '—')}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:10px;">Oggetti conferiti</div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f7f3ec;">
                  <th style="padding:10px 12px;border:1px solid #e7dfd4;text-align:left;">Descrizione</th>
                  <th style="padding:10px 12px;border:1px solid #e7dfd4;text-align:center;">Pezzi</th>
                  <th style="padding:10px 12px;border:1px solid #e7dfd4;text-align:right;">Grammi</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <div style="border:1px solid #e7dfd4;border-radius:14px;padding:16px;background:#fcfaf6;">
              <div style="font-size:12px;text-transform:uppercase;color:#666;margin-bottom:8px;">Totale grammi</div>
              <div style="font-size:26px;font-weight:800;">${formatNumber(form.total_grams)} g</div>
            </div>
            <div style="border:1px solid #e7dfd4;border-radius:14px;padding:16px;background:#fcfaf6;">
              <div style="font-size:12px;text-transform:uppercase;color:#666;margin-bottom:8px;">Importo totale</div>
              <div style="font-size:26px;font-weight:800;">${formatNumber(form.total_eur)} €</div>
            </div>
          </div>

          <div style="margin-bottom:10px;">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:10px;">Note</div>
            <div style="padding:10px 0;border-bottom:1px solid #eee;">${escapeHtml(form.notes || '—')}</div>
          </div>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: ARCHIVE_EMAIL_FROM,
        to: [ARCHIVE_EMAIL_TO],
        subject: `Scheda rientro oro #${form.scheda_number || 'Senza numero'} - ${form.store || 'Negozio'}`,
        html
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
      body: JSON.stringify({ ok: false, error: error.message })
    };
  }
};
