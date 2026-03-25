exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Missing environment variables' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'check';

    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    };

    function formatNumber(value) {
      return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value || 0));
    }

    async function getState() {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/gold_state?id=eq.1&select=id,last_reset_at,last_notified_step,last_pure_alert_sent`,
        { headers }
      );
      const data = await res.json();
      return data[0] || {
        id: 1,
        last_reset_at: null,
        last_notified_step: 0,
        last_pure_alert_sent: 0,
      };
    }

    async function upsertState(payload) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gold_state`, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify([payload]),
      });
      if (!res.ok) throw new Error(await res.text());
    }

    async function sendTelegramMessage(text) {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
          }),
        }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(JSON.stringify(data));
    }

    const state = await getState();

    // ===== RESET / CHIUSURA FUSIONE =====
    if (action === 'reset') {
      const closedAt = body.closedAt || new Date().toLocaleString('it-IT');
      const totalGrams = Number(body.totalGrams || 0);
      const totalPureGrams = Number(body.totalPureGrams || 0);
      const foundryPrice = Number(body.foundryPrice || 0);
      const totalPaidToClients = Number(body.totalPaidToClients || 0);
      const totalFusionRevenue = Number(body.totalFusionRevenue || 0);
      const grossMargin = Number(body.grossMargin || 0);

      const message =
`🔒 Fusione chiusa

Data chiusura: ${closedAt}
Totale grammi ritirati: ${formatNumber(totalGrams)} g
Totale puro ritirato: ${formatNumber(totalPureGrams)} g
Prezzo fonderia: ${formatNumber(foundryPrice)} €/g
Totale pagato: ${formatNumber(totalPaidToClients)} €
Totale incassato: ${formatNumber(totalFusionRevenue)} €
Margine: ${formatNumber(grossMargin)} €`;

      await sendTelegramMessage(message);

      await upsertState({
        id: 1,
        last_reset_at: new Date().toISOString(),
        last_notified_step: 0,
        last_pure_alert_sent: 0,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, reset: true }),
      };
    }

    // ===== ALERT PURO OGNI 300g =====
    if (action === 'pure_alert') {
      const pureGrams = Number(body.pureGrams || 0);
      const threshold = Number(body.threshold || 0);

      const message =
`⚠️ Alert oro puro

Raggiunta soglia: ${formatNumber(threshold)} g puro
Puro attuale in casa: ${formatNumber(pureGrams)} g`;

      await sendTelegramMessage(message);

      await upsertState({
        id: 1,
        last_reset_at: state.last_reset_at,
        last_notified_step: Number(state.last_notified_step || 0),
        last_pure_alert_sent: threshold,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          pureGrams,
          threshold,
        }),
      };
    }

    // ===== CHECK GENERICO DISATTIVATO (vecchio alert 100g rimosso) =====
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: 'No generic check action active',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
