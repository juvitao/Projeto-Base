// Edge function: send-daily-receivables
// ----------------------------------------------------------------
// Roda 1x/dia (chamada pelo Vercel Cron as 08h Brasilia = 11h UTC).
// Para cada user com grupo de notificacoes configurado, busca os
// recebiveis vencendo HOJE e envia UMA mensagem unica no grupo com a
// lista do dia (nome, parcela, valor, telefone clicavel).
//
// Autenticacao: a chamada externa precisa enviar o header
//   x-cron-secret: <valor configurado no secret CRON_SECRET>
// para evitar que qualquer pessoa dispare a cobranca via HTTP.
// ----------------------------------------------------------------

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWhatsAppText, formatBRL, waMeLink } from "../_shared/whatsapp.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Receivable {
    id: string;
    user_id: string;
    client_name: string;
    products: string | null;
    amount_due: number;
    amount_paid: number;
    due_date: string;
    sale_id: string | null;
}

/** Retorna a data de hoje no fuso de Sao Paulo no formato YYYY-MM-DD */
function todayInBrazil(): string {
    const now = new Date();
    // GMT-3 (Sao Paulo, sem horario de verao desde 2019)
    const tz = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return tz.toISOString().slice(0, 10);
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        // 1. Autenticacao da chamada cron
        // @ts-ignore Deno
        const expectedSecret = Deno.env.get("CRON_SECRET");
        const providedSecret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
        if (!expectedSecret || providedSecret !== expectedSecret) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // @ts-ignore Deno
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        // @ts-ignore Deno
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !serviceKey) throw new Error("Supabase env vars ausentes");
        const admin = createClient(supabaseUrl, serviceKey);

        const today = todayInBrazil();

        // 2. Recebiveis vencendo hoje, agrupados por user_id
        const { data: receivables, error } = await admin
            .from("vora_receivables")
            .select("id, user_id, client_name, products, amount_due, amount_paid, due_date, sale_id")
            .eq("due_date", today)
            .eq("status", "pending");
        if (error) throw error;

        if (!receivables || receivables.length === 0) {
            return new Response(JSON.stringify({ ok: true, today, total: 0 }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Agrupa por user_id
        const byUser = new Map<string, Receivable[]>();
        for (const r of receivables as Receivable[]) {
            if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
            byUser.get(r.user_id)!.push(r);
        }

        const summary: { user_id: string; sent: boolean; count: number; reason?: string }[] = [];

        for (const [userId, list] of byUser.entries()) {
            // 3. Conexao do user
            const { data: conn } = await admin
                .from("whatsapp_connections")
                .select("instance_name, status, notification_group_jid")
                .eq("user_id", userId)
                .maybeSingle();

            if (!conn?.notification_group_jid || conn.status !== "connected") {
                summary.push({ user_id: userId, sent: false, count: list.length, reason: "sem grupo/desconectado" });
                continue;
            }

            // 4. Busca telefones via sale_id -> vora_sales.client_id -> vora_clients
            const saleIds = list.map(r => r.sale_id).filter(Boolean) as string[];
            const phoneByClientName = new Map<string, string>();
            const phoneBySaleId = new Map<string, string>();
            if (saleIds.length > 0) {
                const { data: sales } = await admin
                    .from("vora_sales")
                    .select("id, client_id")
                    .in("id", saleIds);
                const clientIds = (sales || []).map((s: any) => s.client_id).filter(Boolean);
                if (clientIds.length > 0) {
                    const { data: clients } = await admin
                        .from("vora_clients")
                        .select("id, name, phone")
                        .in("id", clientIds);
                    const phoneByClientId = new Map((clients || []).map((c: any) => [c.id, c.phone]));
                    for (const s of (sales || [])) {
                        const ph = phoneByClientId.get(s.client_id);
                        if (ph) phoneBySaleId.set(s.id, ph);
                    }
                    // tambem indexa por nome como fallback
                    for (const c of (clients || [])) {
                        if (c?.name && c?.phone) phoneByClientName.set(c.name.toLowerCase(), c.phone);
                    }
                }
            }

            // 5. Monta a mensagem unica
            const totalAmount = list.reduce((sum, r) => sum + Number(r.amount_due || 0) - Number(r.amount_paid || 0), 0);
            const header = [
                `📅 *COBRANCAS DE HOJE (${today.split("-").reverse().join("/")})*`,
                `${list.length} recebivel(is) — total ${formatBRL(totalAmount)}`,
                "",
            ];
            const lines = list.map((r, idx) => {
                const remaining = Number(r.amount_due || 0) - Number(r.amount_paid || 0);
                const phone = (r.sale_id && phoneBySaleId.get(r.sale_id))
                    || phoneByClientName.get((r.client_name || "").toLowerCase());
                const block = [
                    `*${idx + 1}. ${r.client_name}*`,
                    `   💰 ${formatBRL(remaining)}`,
                    r.products ? `   📦 ${r.products}` : null,
                    phone ? `   📞 ${waMeLink(phone)}` : null,
                ].filter(Boolean).join("\n");
                return block;
            });

            const text = [...header, ...lines].join("\n\n");

            try {
                await sendWhatsAppText({
                    instanceName: conn.instance_name,
                    jid: conn.notification_group_jid,
                    text,
                });
                summary.push({ user_id: userId, sent: true, count: list.length });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                summary.push({ user_id: userId, sent: false, count: list.length, reason: msg });
            }
        }

        return new Response(JSON.stringify({ ok: true, today, summary }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[send-daily-receivables]", msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
