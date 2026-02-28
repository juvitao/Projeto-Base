import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { calculateNetAmount } from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type FinancialEntry = Database["public"]["Tables"]["vora_financial_entries"]["Row"];
type InsertEntry = Database["public"]["Tables"]["vora_financial_entries"]["Insert"];
type UpdateEntry = Database["public"]["Tables"]["vora_financial_entries"]["Update"];

interface UseFinancialEntriesOptions {
    typeFilter?: "income" | "expense";
}

export function useFinancialEntries(options?: UseFinancialEntriesOptions) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEntries = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            let query = supabase
                .from("vora_financial_entries")
                .select("*")
                .eq("user_id", user.id)
                .order("entry_date", { ascending: false });

            if (options?.typeFilter) {
                query = query.eq("type", options.typeFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setEntries(data ?? []);
        } catch (err: any) {
            toast({ title: "Erro ao carregar lançamentos", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, options?.typeFilter]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const createEntry = async (data: Omit<InsertEntry, "user_id">) => {
        if (!user) return;
        try {
            const net = calculateNetAmount(data.amount, data.card_fee_percent ?? 0);
            const { error } = await supabase.from("vora_financial_entries").insert({
                ...data,
                user_id: user.id,
                net_amount: net,
            });
            if (error) throw error;
            toast({ title: "Lançamento registrado!" });
            fetchEntries();
        } catch (err: any) {
            toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
        }
    };

    const updateEntry = async (id: string, data: UpdateEntry) => {
        try {
            const net = data.amount != null
                ? calculateNetAmount(data.amount, data.card_fee_percent ?? 0)
                : undefined;
            const { error } = await supabase
                .from("vora_financial_entries")
                .update({ ...data, net_amount: net, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
            toast({ title: "Lançamento atualizado!" });
            fetchEntries();
        } catch (err: any) {
            toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
        }
    };

    const deleteEntry = async (id: string) => {
        try {
            const { error } = await supabase
                .from("vora_financial_entries")
                .delete()
                .eq("id", id);
            if (error) throw error;
            toast({ title: "Lançamento excluído!" });
            fetchEntries();
        } catch (err: any) {
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        }
    };

    return { entries, isLoading, fetchEntries, createEntry, updateEntry, deleteEntry };
}
