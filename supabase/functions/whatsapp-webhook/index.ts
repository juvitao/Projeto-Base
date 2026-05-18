// Edge function: whatsapp-webhook
// ----------------------------------------------------------------
// Recebe webhook da Evolution API quando uma mensagem chega.
// Identifica mensagens no grupo de notificacoes do user que comecam
// com a palavra-chave "estoque" (case-insensitive) e respondem no
// proprio grupo com a quantidade em estoque do produto consultado.
//
// Payload esperado (Evolution API v2 — evento messages.upsert):
//   {
//     event: "messages.upsert",
//     instance: "<instanceName>",
//     data: {
//       key: { remoteJid: "<id>@g.us", fromMe: false, ... },
//       message: { conversation: "estoque malbec", ... },
//       pushName: "..."
//     }
//   }
// ----------------------------------------------------------------

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWhatsAppText, formatBRL } from "../_shared/whatsapp.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TRIGGER_REGEX = /^\s*estoque\s+(.+)/i;

/** Normaliza nome (lower, sem acentos, sem pontuacao). */
function normalize(s: string): string {
    return (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    // Evolution geralmente envia POST. GET para health check.
    if (req.method === "GET") {
        return new Response(JSON.stringify({ ok: true, hint: "POST messages.upsert here" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const payload = await req.json().catch(() => ({} as any));

        // Suporta os formatos comuns da Evolution v2
        const data = payload?.data ?? payload?.body?.data ?? payload;
        const instanceName: string | undefined =
            payload?.instance ?? payload?.body?.instance ?? data?.instance;
        const remoteJid: string | undefined = data?.key?.remoteJid;
        const fromMe: boolean = !!data?.key?.fromMe;
        const text: string =
            data?.message?.conversation
            ?? data?.message?.extendedTextMessage?.text
            ?? "";

        // 1. Filtros baratos: ignora mensagens proprias, fora de grupo, sem texto
        if (fromMe) return ok({ skipped: "fromMe" });
        if (!remoteJid || !remoteJid.endsWith("@g.us")) return ok({ skipped: "nao e grupo" });
        if (!text) return ok({ skipped: "sem texto" });

        // 2. Match da palavra-chave
        const match = text.match(TRIGGER_REGEX);
        if (!match) return ok({ skipped: "sem palavra-chave estoque" });
        const query = match[1].trim();
        if (!query) return ok({ skipped: "query vazia" });

        // @ts-ignore Deno
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        // @ts-ignore Deno
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !serviceKey) throw new Error("Supabase env vars ausentes");
        const admin = createClient(supabaseUrl, serviceKey);

        // 3. Identifica o user pelo grupo (mesma instancia + mesmo grupo configurado)
        let userQuery = admin
            .from("whatsapp_connections")
            .select("user_id, instance_name, notification_group_jid")
            .eq("notification_group_jid", remoteJid)
            .eq("status", "connected");
        if (instanceName) userQuery = userQuery.eq("instance_name", instanceName);

        const { data: conn } = await userQuery.maybeSingle();
        if (!conn?.user_id || !conn.instance_name) {
            return ok({ skipped: "grupo nao vinculado a nenhum user" });
        }

        // 4. Busca o produto no master_products (ilike) e filtra os
        //    que existem no inventory do user
        const queryNorm = normalize(query);
        const { data: products } = await admin
            .from("master_products")
            .select("id, name, brand_id")
            .ilike("name", `%${query}%`)
            .limit(50);

        let matches: Array<{ id: string; name: string; brand_id: string }> = (products || []) as any;
        // Tenta tambem por substring normalizada se a busca direta nao acertou
        if (matches.length === 0) {
            const { data: all } = await admin
                .from("master_products")
                .select("id, name, brand_id")
                .limit(2000);
            matches = (all || []).filter((p: any) => normalize(p.name).includes(queryNorm)) as any;
        }

        if (matches.length === 0) {
            await sendWhatsAppText({
                instanceName: conn.instance_name,
                jid: remoteJid,
                text: `🔍 Nenhum produto encontrado com "${query}".`,
            });
            return ok({ replied: "nenhum produto encontrado" });
        }

        // 5. Filtra apenas os que o user tem em estoque (qty > 0 ou ate zerado)
        const productIds = matches.map(m => m.id);
        const { data: stock } = await admin
            .from("vora_inventory")
            .select("master_product_id, quantity, sale_price")
            .eq("user_id", conn.user_id)
            .in("master_product_id", productIds);

        const stockMap = new Map((stock || []).map((s: any) => [s.master_product_id, s]));

        // 6. Pega nomes de marca pra exibir
        const brandIds = [...new Set(matches.map(m => m.brand_id))];
        const { data: brands } = await admin
            .from("master_brands")
            .select("id, name")
            .in("id", brandIds);
        const brandName = new Map((brands || []).map((b: any) => [b.id, b.name]));

        // 7. Monta resposta — prioriza produtos COM estoque, depois sem
        const enriched = matches.map(m => ({
            ...m,
            brand: brandName.get(m.brand_id) || "",
            stock: stockMap.get(m.id) as any,
        }));
        enriched.sort((a, b) => {
            const qa = a.stock?.quantity || 0;
            const qb = b.stock?.quantity || 0;
            if (qa === 0 && qb > 0) return 1;
            if (qb === 0 && qa > 0) return -1;
            return qb - qa;
        });

        const top = enriched.slice(0, 10);
        const lines = [`📦 *ESTOQUE — "${query}"*`, ""];
        for (const item of top) {
            const qty = item.stock?.quantity ?? 0;
            const price = item.stock?.sale_price;
            const icon = qty > 0 ? "✅" : "❌";
            const qtyLabel = qty > 0 ? `${qty} un` : "sem estoque";
            const priceLabel = price ? ` — ${formatBRL(Number(price))}` : "";
            lines.push(`${icon} *${item.name}* (${item.brand})`);
            lines.push(`   ${qtyLabel}${priceLabel}`);
            lines.push("");
        }
        if (enriched.length > top.length) {
            lines.push(`_+ ${enriched.length - top.length} resultado(s). Refine a busca._`);
        }

        await sendWhatsAppText({
            instanceName: conn.instance_name,
            jid: remoteJid,
            text: lines.join("\n").trim(),
        });

        return ok({ replied: matches.length });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[whatsapp-webhook]", msg);
        // Importante: sempre responde 200 pro Evolution nao re-enviar em loop
        return ok({ error: msg });
    }
});

function ok(body: Record<string, unknown>): Response {
    return new Response(JSON.stringify({ ok: true, ...body }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
