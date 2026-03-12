import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for ABAC plan limit checks.
 * Provides client count vs plan limit for the current user.
 */
export function usePlanLimits() {
    const { user, plan } = useAuth();
    const [clientCount, setClientCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        supabase
            .from("vora_clients")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .then(({ count }) => {
                setClientCount(count ?? 0);
                setIsLoading(false);
            });
    }, [user]);

    const maxClients = plan?.max_clients ?? null; // null = unlimited
    const canAddClient = maxClients === null || clientCount < maxClients;
    const clientsRemaining = maxClients === null ? Infinity : Math.max(0, maxClients - clientCount);

    const refresh = async () => {
        if (!user) return;
        const { count } = await supabase
            .from("vora_clients")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
        setClientCount(count ?? 0);
    };

    return {
        clientCount,
        maxClients,
        canAddClient,
        clientsRemaining,
        isLoading,
        planName: plan?.name ?? "Grátis",
        hasAiAccess: plan?.has_ai_access ?? false,
        features: plan?.features_json ?? {},
        refresh,
    };
}
