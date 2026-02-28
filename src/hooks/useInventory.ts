import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Brand = Database["public"]["Tables"]["vora_brands"]["Row"];
type CatalogProduct = Database["public"]["Tables"]["vora_catalog_products"]["Row"];
type InventoryItem = Database["public"]["Tables"]["vora_inventory"]["Row"];

export interface InventoryWithProduct extends InventoryItem {
    catalog_product?: CatalogProduct & { brand?: Brand };
}

// ─── Brands ───
export function useBrands() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from("vora_brands").select("*").order("name");
            setBrands(data ?? []);
            setIsLoading(false);
        })();
    }, []);

    return { brands, isLoading };
}

// ─── Catalog Products ───
export function useCatalogProducts(brandId?: string) {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchByBrand = useCallback(async (bid: string) => {
        setIsLoading(true);
        const { data } = await supabase
            .from("vora_catalog_products")
            .select("*")
            .eq("brand_id", bid)
            .order("name");
        setProducts(data ?? []);
        setIsLoading(false);
    }, []);

    const searchCatalog = useCallback(async (query: string) => {
        if (query.length < 2) { setProducts([]); return; }
        setIsLoading(true);
        let q = supabase.from("vora_catalog_products").select("*").ilike("name", `%${query}%`).limit(20);
        if (brandId) q = q.eq("brand_id", brandId);
        const { data } = await q;
        setProducts(data ?? []);
        setIsLoading(false);
    }, [brandId]);

    const createProduct = async (brandId: string, name: string, category?: string) => {
        const { data, error } = await supabase
            .from("vora_catalog_products")
            .insert({ brand_id: brandId, name, category: category || null })
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

// ─── Inventory ───
export function useInventory() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInventory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data: invData, error } = await supabase
                .from("vora_inventory")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            if (error) throw error;

            // Enrich with catalog product + brand
            const enriched: InventoryWithProduct[] = [];
            for (const item of invData ?? []) {
                const { data: cp } = await supabase
                    .from("vora_catalog_products")
                    .select("*")
                    .eq("id", item.catalog_product_id)
                    .single();
                let brand: Brand | undefined;
                if (cp) {
                    const { data: b } = await supabase
                        .from("vora_brands")
                        .select("*")
                        .eq("id", cp.brand_id)
                        .single();
                    brand = b ?? undefined;
                }
                enriched.push({ ...item, catalog_product: cp ? { ...cp, brand } : undefined });
            }
            setInventory(enriched);
        } catch (err: any) {
            toast({ title: "Erro ao carregar estoque", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const addToInventory = async (catalogProductId: string, quantity: number, costPrice: number, salePrice: number) => {
        if (!user) return;
        try {
            // Upsert: if already exists, increase quantity
            const existing = inventory.find(i => i.catalog_product_id === catalogProductId);
            if (existing) {
                const { error } = await supabase
                    .from("vora_inventory")
                    .update({
                        quantity: existing.quantity + quantity,
                        cost_price: costPrice,
                        sale_price: salePrice,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("vora_inventory")
                    .insert({ user_id: user.id, catalog_product_id: catalogProductId, quantity, cost_price: costPrice, sale_price: salePrice });
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

    return { inventory, isLoading, fetchInventory, addToInventory, updateInventory, deleteInventoryItem };
}
