// Helper compartilhado para enviar mensagens via Evolution API.
// Centraliza a leitura de secrets e o formato do POST, e mantem a key
// EVOLUTION_API_KEY APENAS no servidor (fora do bundle do frontend).
//
// Uso:
//   import { sendWhatsAppText } from "../_shared/whatsapp.ts";
//   await sendWhatsAppText({ instanceName, jid: "5511999@g.us", text: "..." });

// @ts-ignore Deno runtime
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
// @ts-ignore Deno runtime
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

export interface SendTextParams {
    instanceName: string;
    jid: string; // <numero>@s.whatsapp.net OU <id>@g.us
    text: string;
    delayMs?: number;
}

export async function sendWhatsAppText({ instanceName, jid, text, delayMs = 800 }: SendTextParams): Promise<void> {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        throw new Error("EVOLUTION_API_URL/EVOLUTION_API_KEY ausentes nos secrets do Supabase");
    }
    if (!instanceName || !jid || !text) {
        throw new Error("instanceName, jid e text sao obrigatorios");
    }

    const url = `${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendText/${instanceName}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
            number: jid,
            text,
            delay: delayMs,
            options: { linkPreview: true },
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Evolution API ${res.status}: ${body || res.statusText}`);
    }
}

/** Limpa um numero brasileiro para o formato aceito pelo wa.me e pela Evolution */
export function formatBrazilPhone(raw: string): string {
    const digits = (raw || "").replace(/\D/g, "");
    // Se ja vier com DDI 55, mantem; caso contrario adiciona
    if (digits.startsWith("55") && digits.length >= 12) return digits;
    if (digits.length >= 10) return "55" + digits;
    return digits;
}

/** Gera o link clicavel wa.me a partir do telefone */
export function waMeLink(phone: string): string {
    return `https://wa.me/${formatBrazilPhone(phone)}`;
}

/** Formata valor em BRL */
export function formatBRL(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value || 0);
}
