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
            // 1) Fetch sales with client data in one query
            const { data: salesData, error } = await supabase
                .from("vora_sales")
                .select("*, client:vora_clients(*)")
                .order("sale_date", { ascending: false });
            if (error) throw error;

            const allSales = salesData ?? [];
            if (allSales.length === 0) {
                setSales([]);
                setIsLoading(false);
                return;
            }

            // 2) Batch-fetch all items for all sales in one query
            const saleIds = allSales.map(s => s.id);
            const { data: allItems } = await supabase
                .from("vora_sale_items")
                .select("*")
                .in("sale_id", saleIds);

            const itemsBySale = new Map<string, SaleItem[]>();
            (allItems ?? []).forEach(item => {
                const list = itemsBySale.get(item.sale_id!) ?? [];
                list.push(item);
                itemsBySale.set(item.sale_id!, list);
            });

            // 3) Assemble
            const salesWithDetails: SaleWithDetails[] = allSales.map((sale: any) => ({
                ...sale,
                client: sale.client ?? null,
                items: itemsBySale.get(sale.id) ?? [],
            }));

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
            // 1) Fetch sale items to know what quantities to revert
            const { data: saleItems } = await supabase
                .from("vora_sale_items")
                .select("*")
                .eq("sale_id", id);

            // 2) Revert stock for each item that has a product_id in inventory
            if (saleItems && saleItems.length > 0 && user) {
                const { data: invItems } = await supabase
                    .from("vora_inventory")
                    .select("id, master_product_id, quantity")
                    .eq("user_id", user.id);

                for (const si of saleItems) {
                    if (!si.product_id) continue;
                    // Find inventory item by master_product_id matching sale_item.product_id
                    const inv = invItems?.find(i => i.master_product_id === si.product_id);
                    if (inv) {
                        await supabase
                            .from("vora_inventory")
                            .update({ quantity: inv.quantity + si.quantity, updated_at: new Date().toISOString() })
                            .eq("id", inv.id);
                    }
                }
            }

            // 3) Delete associated receivables
            await supabase.from("vora_receivables").delete().eq("sale_id", id);

            // 4) Delete sale items (cascade may handle this, but explicit is safer)
            await supabase.from("vora_sale_items").delete().eq("sale_id", id);

            // 5) Delete the sale itself
            const { error } = await supabase.from("vora_sales").delete().eq("id", id);
            if (error) throw error;

            toast({ title: "Venda excluída e estoque revertido!" });
            fetchSales();
        } catch (err: any) {
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        }
    };

    return { sales, isLoading, fetchSales, createSale, deleteSale };
}
