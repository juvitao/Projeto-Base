import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["vora_clients"]["Row"];

/**
 * Sanitiza input de busca removendo caracteres que podem manipular filtros PostgREST.
 */
function sanitizeSearchInput(input: string): string {
    // Remove caracteres que podem interferir com a sintaxe de filtros PostgREST
    return input.replace(/[%_(),."'\\]/g, '');
}

export function useClientSearch() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchClients = useCallback(async (query: string) => {
        const sanitized = sanitizeSearchInput(query);
        if (!sanitized || sanitized.length < 2) {
            setClients([]);
            return;
        }
        setIsSearching(true);
        try {
            // Busca por nome e telefone usando filtros separados (mais seguro que .or() com interpolação)
            const [nameRes, phoneRes] = await Promise.all([
                supabase
                    .from("vora_clients")
                    .select("*")
                    .ilike("name", `%${sanitized}%`)
                    .limit(10),
                supabase
                    .from("vora_clients")
                    .select("*")
                    .ilike("phone", `%${sanitized}%`)
                    .limit(10),
            ]);

            // Merge e deduplica resultados
            const merged = new Map<string, Client>();
            [...(nameRes.data ?? []), ...(phoneRes.data ?? [])].forEach(c => merged.set(c.id, c));
            setClients([...merged.values()].slice(0, 10));
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

