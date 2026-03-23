exports.handler = async (event) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  const data = JSON.parse(event.body);

  const htmlContent = data.html;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Archivio Oro <noreply@archiviooro.com>",
        to: ["jacopo.burato@burato1969.com"],
        subject: `Nuova scheda oro - ${data.numeroScheda}`,
        html: htmlContent
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
