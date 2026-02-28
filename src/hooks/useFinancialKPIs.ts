import { useMemo } from "react";
import { useFinancialEntries } from "./useFinancialEntries";
import { useReceivables } from "./useReceivables";

export interface FinancialKPIs {
    totalIncome: number;
    totalExpenses: number;
    realProfit: number;
    totalNetIncome: number;
    pendingReceivables: number;
    pendingReceivablesCount: number;
    overdueReceivables: number;
    overdueCount: number;
}

export function useFinancialKPIs(): { kpis: FinancialKPIs; isLoading: boolean } {
    const { entries, isLoading: entriesLoading } = useFinancialEntries();
    const { receivables, isLoading: receivablesLoading } = useReceivables();

    const kpis = useMemo<FinancialKPIs>(() => {
        const incomes = entries.filter((e) => e.type === "income");
        const expenses = entries.filter((e) => e.type === "expense");

        const totalIncome = incomes.reduce((sum, e) => sum + Number(e.amount), 0);
        const totalNetIncome = incomes.reduce((sum, e) => sum + Number(e.net_amount ?? e.amount), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const realProfit = totalNetIncome - totalExpenses;

        const pendingRecv = receivables.filter((r) => r.status === "pending" || r.status === "overdue");
        const overdueRecv = receivables.filter((r) => r.status === "overdue");

        return {
            totalIncome,
            totalExpenses,
            realProfit,
            totalNetIncome,
            pendingReceivables: pendingRecv.reduce((sum, r) => sum + (Number(r.amount_due) - Number(r.amount_paid)), 0),
            pendingReceivablesCount: pendingRecv.length,
            overdueReceivables: overdueRecv.reduce((sum, r) => sum + (Number(r.amount_due) - Number(r.amount_paid)), 0),
            overdueCount: overdueRecv.length,
        };
    }, [entries, receivables]);

    return { kpis, isLoading: entriesLoading || receivablesLoading };
}
