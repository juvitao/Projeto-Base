// Edge function: analyze-inventory-photo
// ---------------------------------------------------------
// Recebe { photo_path } (caminho dentro do bucket inventory-photos),
// baixa a imagem com service_role, chama Gemini 2.0 Flash com response_schema,
// faz fuzzy match contra master_brands/master_products e retorna lista
// normalizada de itens para revisao no frontend.
//
// Variaveis de ambiente obrigatorias:
//   GEMINI_API_KEY        - chave da Google AI Studio (free tier serve)
//   SUPABASE_URL          - injetada automaticamente pelo Supabase
//   SUPABASE_SERVICE_ROLE_KEY - injetada automaticamente
// ---------------------------------------------------------

// @ts-ignore Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DetectedItem {
    brand: string;
    product_name: string;
    quantity: number;
    confidence: number;
}

interface NormalizedItem {
    brand_id?: string;
    brand_name: string;
    master_product_id?: string;
    product_name: string;
    quantity: number;
    sale_price: number;
    cost_price: number;
    confidence: number;
}

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `Voce eh um assistente de identificacao de produtos de perfumaria e cosmeticos brasileiros (Natura, O Boticario, Eudora, Mary Kay, Avon, Jequiti, Hinode, WePink, Granado, Mahogany, e similares).

Analise a imagem fornecida e identifique TODOS os produtos visiveis. Para cada produto distinto:
- "brand": nome da marca (exatamente como aparece na embalagem)
- "product_name": nome completo do produto incluindo variante/volume quando legivel (ex: "Desodorante Colonia Kaiak Masculino 100ml")
- "quantity": quantas unidades daquele produto especifico estao visiveis na foto
- "confidence": de 0 a 1, quanto voce confia que identificou corretamente

REGRAS:
- Se varios produtos identicos aparecem (mesma marca/nome/volume), agregue em uma unica entrada com quantity=N.
- Produtos diferentes da mesma marca = entradas separadas.
- Se a imagem nao tiver produtos identificaveis, retorne items vazio.
- NAO invente produtos. Quando nao tiver certeza, use confidence baixo (<0.5).`;

const responseSchema = {
    type: "OBJECT",
    properties: {
        items: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    brand: { type: "STRING" },
                    product_name: { type: "STRING" },
                    quantity: { type: "INTEGER" },
                    confidence: { type: "NUMBER" },
                },
                required: ["brand", "product_name", "quantity", "confidence"],
            },
        },
    },
    required: ["items"],
};

/** Normaliza string para fuzzy match (lower, sem acentos, sem pontuacao). */
function normalize(s: string): string {
    return s.toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Levenshtein simples para nomes curtos. */
function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { photo_path } = await req.json();
        if (!photo_path || typeof photo_path !== "string") {
            return new Response(JSON.stringify({ error: "photo_path obrigatorio" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // @ts-ignore Deno
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        // @ts-ignore Deno
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        // @ts-ignore Deno
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "GEMINI_API_KEY nao configurada na edge function" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        if (!supabaseUrl || !serviceKey) {
            return new Response(JSON.stringify({ error: "Supabase env vars ausentes" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const admin = createClient(supabaseUrl, serviceKey);

        // 1. Baixa a imagem do bucket privado
        const { data: blob, error: dlErr } = await admin.storage
            .from("inventory-photos")
            .download(photo_path);
        if (dlErr || !blob) {
            return new Response(JSON.stringify({ error: `Falha ao baixar foto: ${dlErr?.message}` }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        const arrayBuf = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
        const mimeType = blob.type || "image/jpeg";

        // 2. Chama Gemini com response_schema (forca JSON valido)
        const geminiResp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: PROMPT },
                        { inlineData: { mimeType, data: base64 } },
                    ],
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    responseSchema,
                },
            }),
        });

        if (!geminiResp.ok) {
            const txt = await geminiResp.text();
            return new Response(JSON.stringify({ error: `Gemini ${geminiResp.status}: ${txt}` }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const geminiJson = await geminiResp.json();
        const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return new Response(JSON.stringify({ items: [] }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let detected: { items: DetectedItem[] } = { items: [] };
        try {
            detected = JSON.parse(text);
        } catch {
            return new Response(JSON.stringify({ items: [] }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Fuzzy match contra catalogo
        const { data: brands } = await admin.from("master_brands").select("id, name");
        const { data: products } = await admin.from("master_products").select("id, brand_id, name, suggested_price");

        const normalized: NormalizedItem[] = (detected.items || []).map((it) => {
            const detectedBrandNorm = normalize(it.brand);
            const detectedProdNorm = normalize(it.product_name);

            // Match marca: exato → contem → levenshtein <=2
            let brandMatch = brands?.find((b) => normalize(b.name) === detectedBrandNorm);
            if (!brandMatch) {
                brandMatch = brands?.find((b) => {
                    const bn = normalize(b.name);
                    return bn.includes(detectedBrandNorm) || detectedBrandNorm.includes(bn);
                });
            }
            if (!brandMatch && brands) {
                const ranked = brands
                    .map((b) => ({ b, d: levenshtein(normalize(b.name), detectedBrandNorm) }))
                    .filter((x) => x.d <= 2)
                    .sort((a, b) => a.d - b.d);
                brandMatch = ranked[0]?.b;
            }

            // Match produto (so dentro da marca encontrada)
            let productMatch;
            let suggestedPrice = 0;
            if (brandMatch && products) {
                const sameBrand = products.filter((p) => p.brand_id === brandMatch!.id);
                productMatch = sameBrand.find((p) => normalize(p.name) === detectedProdNorm);
                if (!productMatch) {
                    productMatch = sameBrand.find((p) => {
                        const pn = normalize(p.name);
                        return pn.includes(detectedProdNorm) || detectedProdNorm.includes(pn);
                    });
                }
                suggestedPrice = productMatch?.suggested_price ?? 0;
            }

            return {
                brand_id: brandMatch?.id,
                brand_name: brandMatch?.name ?? it.brand,
                master_product_id: productMatch?.id,
                product_name: productMatch?.name ?? it.product_name,
                quantity: Math.max(1, it.quantity || 1),
                sale_price: suggestedPrice,
                cost_price: 0,
                confidence: typeof it.confidence === "number" ? it.confidence : 0.5,
            };
        });

        return new Response(JSON.stringify({ items: normalized }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
