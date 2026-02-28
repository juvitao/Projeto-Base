import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Receivable = Database["public"]["Tables"]["vora_receivables"]["Row"];
type InsertReceivable = Database["public"]["Tables"]["vora_receivables"]["Insert"];
type UpdateReceivable = Database["public"]["Tables"]["vora_receivables"]["Update"];

export function useReceivables() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReceivables = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("vora_receivables")
                .select("*")
                .eq("user_id", user.id)
                .order("due_date", { ascending: true });
            if (error) throw error;

            // Auto-update overdue status
            const today = new Date().toISOString().split("T")[0];
            const updated = (data ?? []).map((r) => {
                if (r.status === "pending" && r.due_date < today) {
                    return { ...r, status: "overdue" };
                }
                return r;
            });

            setReceivables(updated);
        } catch (err: any) {
            toast({ title: "Erro ao carregar recebíveis", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchReceivables();
    }, [fetchReceivables]);

    const createReceivable = async (data: Omit<InsertReceivable, "user_id">) => {
        if (!user) return;
        try {
            const { error } = await supabase.from("vora_receivables").insert({
                ...data,
                user_id: user.id,
            });
            if (error) throw error;
            toast({ title: "Recebível registrado!" });
            fetchReceivables();
        } catch (err: any) {
            toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
        }
    };

    const updateReceivable = async (id: string, data: UpdateReceivable) => {
        try {
            const { error } = await supabase
                .from("vora_receivables")
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
            toast({ title: "Recebível atualizado!" });
            fetchReceivables();
        } catch (err: any) {
            toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
        }
    };

    const deleteReceivable = async (id: string) => {
        try {
            const { error } = await supabase
                .from("vora_receivables")
                .delete()
                .eq("id", id);
            if (error) throw error;
            toast({ title: "Recebível excluído!" });
            fetchReceivables();
        } catch (err: any) {
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        }
    };

    const markAsPaid = async (id: string, paymentDate?: string) => {
        const date = paymentDate || new Date().toISOString().split("T")[0];
        await updateReceivable(id, {
            status: "paid",
            amount_paid: receivables.find(r => r.id === id)?.amount_due,
            ...(({ payment_date: date }) as any),
        });
    };

    return { receivables, isLoading, fetchReceivables, createReceivable, updateReceivable, deleteReceivable, markAsPaid };
}
