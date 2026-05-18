// Edge function: notify-new-sale
// ----------------------------------------------------------------
// Recebe payload do Supabase Database Webhook quando uma nova linha
// e inserida em vora_sales. Busca os detalhes da venda (cliente,
// produtos, valor) e envia uma mensagem no grupo de notificacoes
// configurado para aquele user.
//
// Payload esperado (Supabase Database Webhook formato Postgres changes):
//   { type: "INSERT", table: "vora_sales", record: { id, user_id, ... } }
// ----------------------------------------------------------------

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWhatsAppText, formatBRL, waMeLink } from "../_shared/whatsapp.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const payload = await req.json();
        const sale = payload?.record;
        if (!sale?.id || !sale?.user_id) {
            return new Response(JSON.stringify({ skipped: "payload sem record.id/user_id" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // @ts-ignore Deno
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        // @ts-ignore Deno
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !serviceKey) {
            throw new Error("Supabase env vars ausentes");
        }
        const admin = createClient(supabaseUrl, serviceKey);

        // 1. Conexao WhatsApp do user (instancia + grupo selecionado)
        const { data: conn } = await admin
            .from("whatsapp_connections")
            .select("instance_name, status, notification_group_jid, notification_group_name")
            .eq("user_id", sale.user_id)
            .maybeSingle();

        if (!conn?.notification_group_jid || conn.status !== "connected") {
            return new Response(JSON.stringify({ skipped: "user sem grupo de notificacoes ou desconectado" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Itens da venda
        const { data: items } = await admin
            .from("vora_sale_items")
            .select("name, quantity, unit_price")
            .eq("sale_id", sale.id);

        // 3. Cliente (telefone para o link wa.me)
        let clientName = "Cliente avulso";
        let clientPhone: string | null = null;
        if (sale.client_id) {
            const { data: client } = await admin
                .from("vora_clients")
                .select("name, phone")
                .eq("id", sale.client_id)
                .maybeSingle();
            if (client) {
                clientName = client.name || clientName;
                clientPhone = client.phone || null;
            }
        }

        // 4. Monta mensagem
        const itemsLines = (items || []).map((it: any) =>
            `  • ${it.quantity}x ${it.name} — ${formatBRL(it.unit_price)}`
        ).join("\n") || "  • (sem itens)";

        const method = (sale.payment_method || "").toLowerCase();
        const methodLabel = method === "fiado"
            ? `Fiado em ${sale.installments || 1}x`
            : method.charAt(0).toUpperCase() + method.slice(1);

        const lines = [
            "🛒 *NOVA VENDA REGISTRADA*",
            "",
            `👤 ${clientName}`,
            clientPhone ? `📞 ${waMeLink(clientPhone)}` : null,
            "",
            "*Produtos:*",
            itemsLines,
            "",
            `💰 *Total:* ${formatBRL(sale.total_amount || 0)}`,
            sale.discount > 0 ? `🏷️ Desconto: ${formatBRL(sale.discount)}` : null,
            `💳 ${methodLabel}`,
            sale.display_id ? `📋 Venda #${sale.display_id}` : null,
        ].filter(Boolean);

        await sendWhatsAppText({
            instanceName: conn.instance_name,
            jid: conn.notification_group_jid,
            text: lines.join("\n"),
        });

        return new Response(JSON.stringify({ ok: true, sale_id: sale.id }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[notify-new-sale]", msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
