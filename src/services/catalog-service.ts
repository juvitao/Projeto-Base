import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MasterBrand = Database["public"]["Tables"]["master_brands"]["Row"];
type MasterProduct = Database["public"]["Tables"]["master_products"]["Row"];

export const CatalogService = {
    /**
     * Fetch globally available Master Brands alongside custom created ones
     */
    async getBrands(): Promise<MasterBrand[]> {
        const { data, error } = await supabase
            .from("master_brands")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch Master Products by filtering out specific brands or querying names
     */
    async searchMasterProducts(query: string, brandId?: string): Promise<(MasterProduct & { brand?: MasterBrand })[]> {
        if (!query || query.length < 2) return [];

        let q = supabase
            .from("master_products")
            .select("*, brand:master_brands(*)")
            .ilike("name", `%${query}%`)
            .limit(30);

        if (brandId) {
            q = q.eq("brand_id", brandId);
        }

        const { data, error } = await q;

        if (error) throw error;
        // Map the relational payload correctly to match interface
        return (data || []).map((item: any) => ({
            ...item,
            brand: item.brand,
        }));
    },

    /**
     * Helper to fetch the hottest Top 50 global products to populate recommendations
     */
    async getTrendingProducts(): Promise<(MasterProduct & { brand?: MasterBrand })[]> {
        const { data, error } = await supabase
            .from("master_products")
            .select("*, brand:master_brands(*)")
            .eq("is_custom", false)
            .order("name", { ascending: true })
            .limit(50);

        if (error) throw error;
        return (data || []).map((item: any) => ({
            ...item,
            brand: item.brand,
        }));
    },

    /**
     * Create a custom "Local" Brand for the user
     */
    async createCustomBrand(name: string): Promise<MasterBrand> {
        const { data, error } = await supabase
            .from("master_brands")
            .insert({ name, is_custom: true })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a custom "Local" Product for the user
     */
    async createCustomProduct(brandId: string, name: string, category: string, suggestedPrice: number): Promise<MasterProduct> {
        const { data, error } = await supabase
            .from("master_products")
            .insert({
                brand_id: brandId,
                name,
                category: category || null,
                suggested_price: suggestedPrice || 0,
                is_custom: true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
