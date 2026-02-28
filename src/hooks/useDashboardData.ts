import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyData {
    date: string;       // "27/02"
    dateISO: string;    // "2026-02-27"
    vendas: number;
    receitas: number;
    despesas: number;
}

interface ClientSummary {
    id: string;
    name: string;
    phone: string | null;
    totalPurchases: number;
    lastPurchase: string | null;
}

export interface DashboardData {
    // Sales
    totalSalesAmount: number;
    totalSalesCount: number;
    salesToday: number;
    salesThisWeek: number;
    salesThisMonth: number;
    averageTicket: number;
    topPaymentMethod: string;

    // Clients
    totalClients: number;
    clientsThisMonth: number;
    topClients: ClientSummary[];

    // Inventory
    totalProducts: number;
    totalStockValue: number;
    totalCostValue: number;
    projectedProfit: number;
    lowStockCount: number;
    outOfStockCount: number;

    // Financial
    totalIncome: number;
    totalExpenses: number;
    realProfit: number;
    pendingReceivables: number;
    pendingReceivablesCount: number;
    overdueReceivables: number;
    overdueCount: number;

    // Chart
    dailyData: DailyData[];

    // Recent sales
    recentSales: {
        id: string;
        date: string;
        client: string;
        amount: number;
        method: string;
    }[];

    isLoading: boolean;
}

export function useDashboardData(): DashboardData {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [rawSales, setRawSales] = useState<any[]>([]);
    const [rawClients, setRawClients] = useState<any[]>([]);
    const [rawInventory, setRawInventory] = useState<any[]>([]);
    const [rawEntries, setRawEntries] = useState<any[]>([]);
    const [rawReceivables, setRawReceivables] = useState<any[]>([]);

    const fetchAll = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [salesRes, clientsRes, inventoryRes, entriesRes, receivablesRes] = await Promise.all([
                supabase.from("vora_sales").select("*, vora_clients(name, phone)").order("sale_date", { ascending: false }),
                supabase.from("vora_clients").select("*"),
                supabase.from("vora_inventory").select("*, vora_catalog_products(name, category, vora_brands(name, color))"),
                supabase.from("vora_financial_entries").select("*"),
                supabase.from("vora_receivables").select("*"),
            ]);
            setRawSales(salesRes.data ?? []);
            setRawClients(clientsRes.data ?? []);
            setRawInventory(inventoryRes.data ?? []);
            setRawEntries(entriesRes.data ?? []);
            setRawReceivables(receivablesRes.data ?? []);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return useMemo(() => {
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

        // Sales
        const totalSalesAmount = rawSales.reduce((s, sale) => s + Number(sale.total_amount || 0), 0);
        const salesToday = rawSales.filter(s => s.sale_date === today).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const salesThisWeek = rawSales.filter(s => s.sale_date >= weekAgo.toISOString().split("T")[0]).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const salesThisMonth = rawSales.filter(s => s.sale_date >= monthStart).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const averageTicket = rawSales.length > 0 ? totalSalesAmount / rawSales.length : 0;

        // Top payment method
        const methodCounts: Record<string, number> = {};
        rawSales.forEach(s => { const m = s.payment_method || "N/A"; methodCounts[m] = (methodCounts[m] || 0) + 1; });
        const topPaymentMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        // Clients
        const clientsThisMonth = rawClients.filter(c => c.created_at && c.created_at >= monthStart).length;

        // Top clients by purchases
        const clientPurchases: Record<string, { name: string; phone: string | null; total: number; lastDate: string | null }> = {};
        rawSales.forEach(s => {
            if (!s.client_id) return;
            const clientData = s.vora_clients as any;
            const name = clientData?.name || "Desconhecido";
            const phone = clientData?.phone || null;
            if (!clientPurchases[s.client_id]) {
                clientPurchases[s.client_id] = { name, phone, total: 0, lastDate: null };
            }
            clientPurchases[s.client_id].total += Number(s.total_amount || 0);
            if (!clientPurchases[s.client_id].lastDate || s.sale_date > clientPurchases[s.client_id].lastDate!) {
                clientPurchases[s.client_id].lastDate = s.sale_date;
            }
        });
        const topClients: ClientSummary[] = Object.entries(clientPurchases)
            .map(([id, d]) => ({ id, name: d.name, phone: d.phone, totalPurchases: d.total, lastPurchase: d.lastDate }))
            .sort((a, b) => b.totalPurchases - a.totalPurchases)
            .slice(0, 5);

        // Inventory
        const totalStockValue = rawInventory.reduce((s, i) => s + i.quantity * i.sale_price, 0);
        const totalCostValue = rawInventory.reduce((s, i) => s + i.quantity * i.cost_price, 0);
        const lowStockCount = rawInventory.filter(i => i.quantity > 0 && i.quantity <= 3).length;
        const outOfStockCount = rawInventory.filter(i => i.quantity === 0).length;

        // Financial
        const incomes = rawEntries.filter(e => e.type === "income");
        const expenses = rawEntries.filter(e => e.type === "expense");
        const totalIncome = incomes.reduce((s, e) => s + Number(e.amount), 0);
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
        const totalNetIncome = incomes.reduce((s, e) => s + Number(e.net_amount ?? e.amount), 0);
        const realProfit = totalNetIncome - totalExpenses;

        const pendingRecv = rawReceivables.filter(r => r.status === "pending" || r.status === "overdue");
        const overdueRecv = rawReceivables.filter(r => r.status === "overdue");
        const pendingReceivables = pendingRecv.reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid)), 0);
        const overdueReceivables = overdueRecv.reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid)), 0);

        // Daily chart (full current month: day 1 to today)
        const dailyData: DailyData[] = [];
        const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalDaysInMonth = Math.ceil((now.getTime() - monthStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        for (let i = 0; i < totalDaysInMonth; i++) {
            const d = new Date(monthStartDate);
            d.setDate(d.getDate() + i);
            const isoDate = d.toISOString().split("T")[0];
            const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

            const daySales = rawSales.filter(s => s.sale_date === isoDate).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
            const dayIncome = rawEntries.filter(e => e.type === "income" && e.date === isoDate).reduce((sum, e) => sum + Number(e.amount), 0);
            const dayExpense = rawEntries.filter(e => e.type === "expense" && e.date === isoDate).reduce((sum, e) => sum + Number(e.amount), 0);

            dailyData.push({ date: label, dateISO: isoDate, vendas: daySales, receitas: dayIncome, despesas: dayExpense });
        }

        // Recent sales
        const recentSales = rawSales.slice(0, 5).map(s => ({
            id: s.id,
            date: s.sale_date,
            client: (s.vora_clients as any)?.name || "Sem cliente",
            amount: Number(s.total_amount || 0),
            method: s.payment_method || "—",
        }));

        return {
            totalSalesAmount,
            totalSalesCount: rawSales.length,
            salesToday,
            salesThisWeek,
            salesThisMonth,
            averageTicket,
            topPaymentMethod,
            totalClients: rawClients.length,
            clientsThisMonth,
            topClients,
            totalProducts: rawInventory.length,
            totalStockValue,
            totalCostValue,
            projectedProfit: totalStockValue - totalCostValue,
            lowStockCount,
            outOfStockCount,
            totalIncome,
            totalExpenses,
            realProfit,
            pendingReceivables,
            pendingReceivablesCount: pendingRecv.length,
            overdueReceivables,
            overdueCount: overdueRecv.length,
            dailyData,
            recentSales,
            isLoading,
        };
    }, [rawSales, rawClients, rawInventory, rawEntries, rawReceivables, isLoading]);
}
