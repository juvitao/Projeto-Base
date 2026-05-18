// Vercel Cron endpoint — dispara a edge function send-daily-receivables
// no Supabase. Vercel Cron so chama URLs dentro do projeto Vercel,
// entao este endpoint serve como ponte autenticada.
//
// Configurado em vercel.json: schedule "0 11 * * *" (11h UTC = 8h Sao Paulo).
//
// Variaveis de ambiente (configurar no Vercel — Production):
//   SUPABASE_FUNCTIONS_URL  = https://<project-ref>.supabase.co/functions/v1
//   CRON_SECRET             = string aleatoria (mesma usada no Supabase secret)

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
    // Vercel Cron envia GET com header "user-agent: vercel-cron/1.0"
    const isVercelCron = (req.headers.get("user-agent") || "").includes("vercel-cron");
    const bearer = req.headers.get("authorization") || "";

    // Permite chamada autenticada via bearer "Bearer <CRON_SECRET>" para teste manual
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return new Response(JSON.stringify({ error: "CRON_SECRET nao configurado no Vercel" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    const bearerOk = bearer === `Bearer ${cronSecret}`;
    if (!isVercelCron && !bearerOk) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
        return new Response(JSON.stringify({ error: "SUPABASE_FUNCTIONS_URL nao configurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const res = await fetch(`${functionsUrl.replace(/\/$/, "")}/send-daily-receivables`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-cron-secret": cronSecret,
            },
            body: JSON.stringify({ source: "vercel-cron" }),
        });
        const body = await res.text();
        return new Response(body, {
            status: res.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }
}
