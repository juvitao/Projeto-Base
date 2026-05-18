import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Linha de revisao apresentada ao usuario antes do commit.
 * Pode ter brand_id/master_product_id quando ja existe no catalogo,
 * ou somente brand_name/product_name (vira is_custom=true no servidor).
 */
export interface BulkInventoryItem {
    brand_id?: string;
    brand_name: string;
    master_product_id?: string;
    product_name: string;
    category?: string;
    quantity: number;
    sale_price: number;
    cost_price: number;
    expiration_date?: string | null;
    /** Sinalizadores de UI - nao vao para o servidor. */
    _ui?: {
        from: "photo" | "csv" | "manual";
        confidence?: number;
        error?: string;
    };
}

/** Strip de campos somente-UI antes do RPC. */
function toServerPayload(items: BulkInventoryItem[]) {
    return items.map(({ _ui, ...rest }) => rest);
}

export function useBulkInventory() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCommitting, setIsCommitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    /** Chama o RPC que insere/atualiza tudo em uma transacao. */
    const commitBulk = useCallback(async (items: BulkInventoryItem[]): Promise<number> => {
        if (items.length === 0) {
            toast({ title: "Nenhum item para adicionar", variant: "destructive" });
            return 0;
        }
        setIsCommitting(true);
        try {
            const payload = toServerPayload(items);
            const { data, error } = await supabase.rpc("bulk_add_to_inventory", {
                p_items: payload as unknown as Record<string, unknown>,
            });
            if (error) throw error;
            const count = (data as unknown as number) ?? items.length;
            toast({ title: `${count} produto(s) adicionado(s) ao estoque!` });
            return count;
        } catch (err: any) {
            toast({
                title: "Erro ao salvar estoque",
                description: err.message ?? "Tente novamente",
                variant: "destructive",
            });
            throw err;
        } finally {
            setIsCommitting(false);
        }
    }, [toast]);

    /**
     * Sobe foto para o bucket inventory-photos e chama a edge function
     * analyze-inventory-photo. Retorna lista de items detectados pelo Gemini.
     * A foto eh deletada do Storage logo apos a analise (limpa LGPD/custo).
     */
    const analyzePhoto = useCallback(async (file: File): Promise<BulkInventoryItem[]> => {
        setIsAnalyzing(true);
        let uploadedPath: string | null = null;
        try {
            if (!user) throw new Error("Usuario nao autenticado");

            const filename = `${user.id}/${crypto.randomUUID()}.jpg`;
            const { error: upErr } = await supabase.storage
                .from("inventory-photos")
                .upload(filename, file, { contentType: file.type || "image/jpeg", upsert: false });
            if (upErr) throw upErr;
            uploadedPath = filename;

            const { data, error } = await supabase.functions.invoke("analyze-inventory-photo", {
                body: { photo_path: filename },
            });
            if (error) throw error;

            const items = (data?.items ?? []) as BulkInventoryItem[];
            return items.map((it) => ({
                ...it,
                quantity: it.quantity || 1,
                sale_price: it.sale_price || 0,
                cost_price: it.cost_price || 0,
                _ui: { from: "photo", confidence: (it as any).confidence },
            }));
        } catch (err: any) {
            toast({
                title: "Erro ao analisar foto",
                description: err.message ?? "Tente novamente",
                variant: "destructive",
            });
            throw err;
        } finally {
            // Limpa a foto do Storage independente de sucesso ou erro
            if (uploadedPath) {
                await supabase.storage.from("inventory-photos").remove([uploadedPath]).catch(() => {});
            }
            setIsAnalyzing(false);
        }
    }, [toast, user]);

    return { commitBulk, analyzePhoto, isCommitting, isAnalyzing };
}
