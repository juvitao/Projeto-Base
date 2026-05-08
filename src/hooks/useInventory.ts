import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Brand = Database["public"]["Tables"]["master_brands"]["Row"];
type MasterProduct = Database["public"]["Tables"]["master_products"]["Row"];
type InventoryItem = Database["public"]["Tables"]["vora_inventory"]["Row"];

export interface InventoryWithProduct extends InventoryItem {
    master_product?: MasterProduct & { brand?: Brand };
}

// ─── Brands ───
export function useBrands() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBrands = useCallback(async () => {
        const { data } = await supabase.from("master_brands").select("*").order("name");
        setBrands(data ?? []);
        setIsLoading(false);
    }, []);

    useEffect(() => { fetchBrands(); }, [fetchBrands]);

    const createBrand = async (name: string) => {
        const { data, error } = await supabase
            .from("master_brands")
            .insert({ name, is_custom: true })
            .select()
            .single();
        if (error) throw error;
        await fetchBrands();
        return data;
    };

    return { brands, isLoading, fetchBrands, createBrand };
}

// ─── Master Products (for search autocomplete) ───
export function useMasterProducts(brandId?: string) {
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchByBrand = useCallback(async (bid: string) => {
        setIsLoading(true);
        const { data } = await supabase
            .from("master_products")
            .select("*")
            .eq("brand_id", bid)
            .order("name");
        setProducts(data ?? []);
        setIsLoading(false);
    }, []);

    const searchCatalog = useCallback(async (query: string) => {
        if (query.length < 2) { setProducts([]); return; }
        setIsLoading(true);
        let q = supabase.from("master_products").select("*").ilike("name", `%${query}%`).limit(20);
        if (brandId) q = q.eq("brand_id", brandId);
        const { data } = await q;
        setProducts(data ?? []);
        setIsLoading(false);
    }, [brandId]);

    const createProduct = async (brandId: string, name: string, category?: string, suggestedPrice?: number) => {
        const { data, error } = await supabase
            .from("master_products")
            .insert({
                brand_id: brandId,
                name,
                category: category || null,
                suggested_price: suggestedPrice || null,
                is_custom: true
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    };

    useEffect(() => {
        if (brandId) fetchByBrand(brandId);
    }, [brandId, fetchByBrand]);

    return { products, isLoading, fetchByBrand, searchCatalog, createProduct };
}

// ─── Inventory (with JOIN — eliminates N+1) ───
export function useInventory() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInventory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // 1) Fetch inventory items
            const { data: invData, error } = await supabase
                .from("vora_inventory")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;

            const items = invData ?? [];
            if (items.length === 0) {
                setInventory([]);
                setIsLoading(false);
                return;
            }

            // 2) Batch-fetch all referenced products in one query
            const productIds = [...new Set(items.map(i => i.master_product_id))];
            const { data: productsData } = await supabase
                .from("master_products")
                .select("*")
                .in("id", productIds);
            const productsMap = new Map((productsData ?? []).map(p => [p.id, p]));

            // 3) Batch-fetch all referenced brands in one query
            const brandIds = [...new Set((productsData ?? []).map(p => p.brand_id).filter(Boolean))];
            const { data: brandsData } = brandIds.length > 0
                ? await supabase.from("master_brands").select("*").in("id", brandIds)
                : { data: [] };
            const brandsMap = new Map((brandsData ?? []).map(b => [b.id, b]));

            // 4) Enrich inventory with product + brand
            const enriched: InventoryWithProduct[] = items.map(item => {
                const product = productsMap.get(item.master_product_id);
                const brand = product ? brandsMap.get(product.brand_id) : undefined;
                return {
                    ...item,
                    master_product: product ? { ...product, brand: brand ?? undefined } : undefined,
                };
            });

            setInventory(enriched);
        } catch (err: any) {
            toast({ title: "Erro ao carregar estoque", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const addToInventory = async (masterProductId: string, quantity: number, costPrice: number, salePrice: number, expirationDate?: string | null) => {
        if (!user) return;
        try {
            // Upsert: if product already in inventory, add quantity
            const existing = inventory.find(i => i.master_product_id === masterProductId);
            if (existing) {
                const { error } = await supabase
                    .from("vora_inventory")
                    .update({
                        quantity: existing.quantity + quantity,
                        cost_price: costPrice,
                        sale_price: salePrice,
                        expiration_date: expirationDate || existing.expiration_date,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("vora_inventory")
                    .insert({ user_id: user.id, master_product_id: masterProductId, quantity, cost_price: costPrice, sale_price: salePrice, expiration_date: expirationDate || null });
                if (error) throw error;
            }
            toast({ title: "Estoque atualizado!" });
            fetchInventory();
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
    };

    const updateInventory = async (id: string, data: { quantity?: number; cost_price?: number; sale_price?: number }) => {
        try {
            const { error } = await supabase
                .from("vora_inventory")
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
            toast({ title: "Estoque atualizado!" });
            fetchInventory();
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
    };

    const deleteInventoryItem = async (id: string) => {
        try {
            const { error } = await supabase.from("vora_inventory").delete().eq("id", id);
            if (error) throw error;
            toast({ title: "Item removido!" });
            fetchInventory();
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
    };

    /** Deduct stock after a sale. Called from SaleFormSheet. */
    const deductStock = async (items: { inventory_id: string | null; quantity: number }[]) => {
        try {
            for (const item of items) {
                if (!item.inventory_id) continue;
                const inv = inventory.find(i => i.id === item.inventory_id);
                if (!inv) continue;
                const newQty = Math.max(0, inv.quantity - item.quantity);
                await supabase
                    .from("vora_inventory")
                    .update({ quantity: newQty, updated_at: new Date().toISOString() })
                    .eq("id", item.inventory_id);
            }
            fetchInventory();
        } catch (err: any) {
            console.error("Erro ao descontar estoque:", err);
        }
    };

    return { inventory, isLoading, fetchInventory, addToInventory, updateInventory, deleteInventoryItem, deductStock };
}
