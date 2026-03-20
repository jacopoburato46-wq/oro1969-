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

    async function getState() {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/gold_state?id=eq.1&select=id,last_reset_at,last_notified_step`,
        { headers }
      );
      const data = await res.json();
      return data[0] || { id: 1, last_reset_at: null, last_notified_step: 0 };
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
      if (!res.ok) {
        throw new Error(`State upsert failed: ${await res.text()}`);
      }
    }

    async function getEntriesSince(lastResetAt) {
      let url = `${SUPABASE_URL}/rest/v1/gold_entries?select=grams,created_at`;

      if (lastResetAt) {
        url += `&created_at=gt.${encodeURIComponent(lastResetAt)}`;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
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
      if (!data.ok) {
        throw new Error(`Telegram send failed: ${JSON.stringify(data)}`);
      }
    }

    const state = await getState();

    if (action === 'reset') {
      await upsertState({
        id: 1,
        last_reset_at: state.last_reset_at,
        last_notified_step: 0,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, reset: true }),
      };
    }

    const entries = await getEntriesSince(state.last_reset_at);
    const total = entries.reduce((sum, row) => sum + Number(row.grams || 0), 0);
    const currentStep = Math.floor(total / 100);
    const lastNotifiedStep = Number(state.last_notified_step || 0);

    if (currentStep > lastNotifiedStep) {
      for (let step = lastNotifiedStep + 1; step <= currentStep; step++) {
        const threshold = step * 100;
        await sendTelegramMessage(`Burato Gioielli\nTotale ritiri raggiunto: ${threshold} g`);
      }

      await upsertState({
        id: 1,
        last_reset_at: state.last_reset_at,
        last_notified_step: currentStep,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        total,
        currentStep,
        lastNotifiedStep,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
