import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["vora_clients"]["Row"];
type Product = Database["public"]["Tables"]["vora_products"]["Row"];

export function useClientSearch() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchClients = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setClients([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from("vora_clients")
                .select("*")
                .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(10);
            if (error) throw error;
            setClients(data ?? []);
        } catch {
            setClients([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const fetchAllClients = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("vora_clients")
                .select("*")
                .eq("status", "active")
                .order("name");
            if (error) throw error;
            setClients(data ?? []);
        } catch {
            setClients([]);
        }
    }, []);

    return { clients, isSearching, searchClients, fetchAllClients };
}

export function useProductSearch() {
    const [products, setProducts] = useState<Product[]>([]);

    const searchProducts = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setProducts([]);
            return;
        }
        try {
            const { data, error } = await supabase
                .from("vora_products")
                .select("*")
                .ilike("name", `%${query}%`)
                .limit(10);
            if (error) throw error;
            setProducts(data ?? []);
        } catch {
            setProducts([]);
        }
    }, []);

    const fetchAllProducts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("vora_products")
                .select("*")
                .order("name");
            if (error) throw error;
            setProducts(data ?? []);
        } catch {
            setProducts([]);
        }
    }, []);

    return { products, searchProducts, fetchAllProducts };
}
