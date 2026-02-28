import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Sale = Database["public"]["Tables"]["vora_sales"]["Row"];
type SaleItem = Database["public"]["Tables"]["vora_sale_items"]["Row"];
type Client = Database["public"]["Tables"]["vora_clients"]["Row"];

export interface SaleWithDetails extends Sale {
    client?: Client | null;
    items?: SaleItem[];
}

export interface CreateSalePayload {
    client_id: string;
    sale_date: string;
    payment_method: string;
    discount: number;
    total_amount: number;
    installments: number;
    first_installment_date: string;
    items: {
        product_id: string | null;
        inventory_id: string | null;
        name: string;
        quantity: number;
        unit_price: number;
        needs_ordering: boolean;
    }[];
    receivables: {
        amount_due: number;
        due_date: string;
    }[];
}

export function useSales() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sales, setSales] = useState<SaleWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSales = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data: salesData, error } = await supabase
                .from("vora_sales")
                .select("*")
                .order("sale_date", { ascending: false });
            if (error) throw error;

            // Fetch clients and items for each sale
            const salesWithDetails: SaleWithDetails[] = [];
            for (const sale of salesData ?? []) {
                let client: Client | null = null;
                if (sale.client_id) {
                    const { data: c } = await supabase
                        .from("vora_clients")
                        .select("*")
                        .eq("id", sale.client_id)
                        .single();
                    client = c;
                }
                const { data: items } = await supabase
                    .from("vora_sale_items")
                    .select("*")
                    .eq("sale_id", sale.id);

                salesWithDetails.push({ ...sale, client, items: items ?? [] });
            }

            setSales(salesWithDetails);
        } catch (err: any) {
            toast({ title: "Erro ao carregar vendas", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const createSale = async (payload: CreateSalePayload) => {
        if (!user) return null;
        try {
            const { data, error } = await supabase.rpc("create_sale_with_receivables", {
                p_user_id: user.id,
                p_client_id: payload.client_id,
                p_sale_date: payload.sale_date,
                p_payment_method: payload.payment_method,
                p_discount: payload.discount,
                p_total_amount: payload.total_amount,
                p_installments: payload.installments,
                p_first_installment_date: payload.first_installment_date || "",
                p_items: payload.items,
                p_receivables: payload.receivables,
            });
            if (error) throw error;
            toast({ title: "Venda registrada com sucesso!" });
            fetchSales();
            return data;
        } catch (err: any) {
            toast({ title: "Erro ao registrar venda", description: err.message, variant: "destructive" });
            return null;
        }
    };

    const deleteSale = async (id: string) => {
        try {
            const { error } = await supabase.from("vora_sales").delete().eq("id", id);
            if (error) throw error;
            toast({ title: "Venda excluída!" });
            fetchSales();
        } catch (err: any) {
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        }
    };

    return { sales, isLoading, fetchSales, createSale, deleteSale };
}
