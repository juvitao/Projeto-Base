import { useState, useMemo, useEffect } from "react";
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    Package,
    CircleDollarSign,
    ShoppingCart,
    AlertTriangle,
    Clock,
    DollarSign,
    BarChart3,
    Loader2,
    Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/lib/financial-utils";
import { RankingList } from "@/components/dashboard/RankingList";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const PAYMENT_LABELS: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "Pix",
    debito: "Débito",
    credito: "Crédito",
    fiado: "Fiado",
};

type FilterPreset = "today" | "7days" | "month" | "custom";

const Dashboard = () => {
    const data = useDashboardData();
    const { user } = useAuth();
    const [filter, setFilter] = useState<FilterPreset>("month");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    // BI Rankings (server-side)
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [topClients, setTopClients] = useState<any[]>([]);
    const [delinquentClients, setDelinquentClients] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchRankings = async () => {
            const [prodRes, clientRes, delinqRes] = await Promise.all([
                (supabase.rpc as any)("get_top_products", { p_user_id: user.id, p_limit: 10 }),
                (supabase.rpc as any)("get_top_clients", { p_user_id: user.id, p_limit: 10 }),
                (supabase.rpc as any)("get_delinquent_clients", { p_user_id: user.id, p_limit: 10 }),
            ]);
            setTopProducts(prodRes.data ?? []);
            setTopClients(clientRes.data ?? []);
            setDelinquentClients(delinqRes.data ?? []);
        };
        fetchRankings();
    }, [user, data.isLoading]);

    // Filter logic
    const filteredDaily = useMemo(() => {
        const now = new Date();
        let startISO: string;
        let endISO = now.toISOString().split("T")[0];

        switch (filter) {
            case "today":
                startISO = endISO;
                break;
            case "7days": {
                const d = new Date(now);
                d.setDate(d.getDate() - 6);
                startISO = d.toISOString().split("T")[0];
                break;
            }
            case "month": {
                const d = new Date(now.getFullYear(), now.getMonth(), 1);
                startISO = d.toISOString().split("T")[0];
                break;
            }
            case "custom":
                startISO = customStart || endISO;
                endISO = customEnd || endISO;
                break;
        }

        return data.dailyData.filter(d => d.dateISO >= startISO && d.dateISO <= endISO);
    }, [data.dailyData, filter, customStart, customEnd]);

    const filteredTotals = useMemo(() => {
        const vendas = filteredDaily.reduce((s, d) => s + d.vendas, 0);
        const receitas = filteredDaily.reduce((s, d) => s + d.receitas, 0);
        const despesas = filteredDaily.reduce((s, d) => s + d.despesas, 0);
        return { vendas, receitas, despesas, lucro: receitas - despesas };
    }, [filteredDaily]);

    if (data.isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const filterLabel = filter === "today" ? "Hoje" : filter === "7days" ? "7 dias" : filter === "month" ? "Este mês" : `${customStart} → ${customEnd}`;

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-20">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-3">
                        <LayoutDashboard className="w-7 h-7 text-primary" /> Diagnóstico Geral
                    </h1>
                    <p className="text-muted-foreground text-sm">Visão completa do seu negócio em tempo real</p>
                </div>

                {/* FILTER BUTTONS */}
                <div className="flex items-center gap-2 flex-wrap">
                    {(["today", "7days", "month"] as FilterPreset[]).map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? "default" : "outline"}
                            size="sm"
                            className="text-xs font-bold uppercase h-8 px-4 rounded-full"
                            onClick={() => setFilter(f)}
                        >
                            {f === "today" ? "Hoje" : f === "7days" ? "7 dias" : "Mês"}
                        </Button>
                    ))}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={filter === "custom" ? "default" : "outline"}
                                size="sm"
                                className="text-xs font-bold h-8 px-3 gap-1.5 rounded-full"
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                Período
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-4" align="end">
                            <div className="space-y-3">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Selecionar período</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted-foreground">De</label>
                                        <Input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => { setCustomStart(e.target.value); setFilter("custom"); }}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted-foreground">Até</label>
                                        <Input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => { setCustomEnd(e.target.value); setFilter("custom"); }}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* ==================== ROW 1: PERIOD KPIs ==================== */}
            <section>
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5" /> Resumo — {filterLabel}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <KPICard label="Vendas (período)" value={formatBRL(filteredTotals.vendas)} accent />
                    <KPICard label="Receitas" value={formatBRL(filteredTotals.receitas)} color="text-emerald-500" />
                    <KPICard label="Despesas" value={formatBRL(filteredTotals.despesas)} color="text-red-500" />
                    <KPICard label="Resultado" value={formatBRL(filteredTotals.lucro)} color={filteredTotals.lucro >= 0 ? "text-emerald-500" : "text-red-500"} />
                    <KPICard label="Ticket Médio" value={formatBRL(data.averageTicket)} sub={`Top: ${PAYMENT_LABELS[data.topPaymentMethod] ?? data.topPaymentMethod}`} />
                </div>
            </section>

            {/* ==================== ROW 2: CHART + RECENT ==================== */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" /> Movimentação Diária
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {filteredDaily.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    Sem dados para o período selecionado
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredDaily} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--card))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                                fontSize: "12px",
                                            }}
                                            formatter={(value: number) => formatBRL(value)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                                        <Bar dataKey="vendas" name="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider">Vendas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.recentSales.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma venda registrada.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.recentSales.map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{sale.client}</p>
                                            <p className="text-[10px] text-muted-foreground">{sale.date} • {PAYMENT_LABELS[sale.method] ?? sale.method}</p>
                                        </div>
                                        <p className="text-sm font-black text-emerald-500 shrink-0 ml-3">{formatBRL(sale.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ==================== ROW 3: GLOBAL KPIs ==================== */}
            <section>
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <CircleDollarSign className="w-3.5 h-3.5" /> Financeiro Geral
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <KPICard label="Receita Total" value={formatBRL(data.totalIncome)} color="text-emerald-500" icon={<DollarSign className="w-4 h-4" />} />
                    <KPICard label="Despesas Totais" value={formatBRL(data.totalExpenses)} color="text-red-500" />
                    <KPICard label="Lucro Real" value={formatBRL(data.realProfit)} color={data.realProfit >= 0 ? "text-emerald-500" : "text-red-500"} accent />
                    <KPICard label="A Receber (Fiado)" value={formatBRL(data.pendingReceivables)} sub={`${data.pendingReceivablesCount} parcelas`} color="text-yellow-500" icon={<Clock className="w-4 h-4" />} />
                    <KPICard label="Vencidas" value={formatBRL(data.overdueReceivables)} sub={`${data.overdueCount} em atraso`} color="text-red-500" icon={<AlertTriangle className="w-4 h-4" />} />
                </div>
            </section>

            {/* ==================== ROW 4: ESTOQUE + CLIENTES ==================== */}
            <div className="grid gap-4 lg:grid-cols-2">
                <section>
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" /> Estoque
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <KPICard label="Itens" value={String(data.totalProducts)} />
                        <KPICard label="Valor de Estoque" value={formatBRL(data.totalStockValue)} />
                        <KPICard label="Custo de Estoque" value={formatBRL(data.totalCostValue)} />
                        <KPICard label="Lucro Previsto" value={formatBRL(data.projectedProfit)} color={data.projectedProfit >= 0 ? "text-emerald-500" : "text-red-500"} accent />
                    </div>
                    {(data.lowStockCount > 0 || data.outOfStockCount > 0) && (
                        <div className="mt-3 flex gap-3 flex-wrap">
                            {data.lowStockCount > 0 && <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-full">⚠ {data.lowStockCount} estoque baixo</span>}
                            {data.outOfStockCount > 0 && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full">🚫 {data.outOfStockCount} zerado</span>}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Clientes
                    </h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <KPICard label="Total" value={String(data.totalClients)} icon={<Users className="w-4 h-4" />} />
                        <KPICard label="Novos (mês)" value={String(data.clientsThisMonth)} accent />
                    </div>
                </section>
            </div>

            {/* ==================== ROW 5: BI RANKINGS ==================== */}
            <div className="grid gap-4 lg:grid-cols-3">
                <RankingList
                    title="Top 10 Produtos"
                    icon={<Package className="w-3.5 h-3.5" />}
                    items={topProducts.map(p => ({
                        name: p.product_name,
                        subtitle: p.brand_name,
                        value: Number(p.total_revenue),
                        extra: `${p.total_qty} vendidos`,
                    }))}
                    valueColor="text-emerald-500"
                />
                <RankingList
                    title="Melhores Clientes"
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    items={topClients.map(c => ({
                        name: c.client_name,
                        subtitle: c.client_phone,
                        value: Number(c.total_paid),
                        badge: "green" as const,
                        extra: `${c.on_time_payments} pagtos em dia`,
                    }))}
                    valueColor="text-emerald-500"
                />
                <RankingList
                    title="Clientes Inadimplentes"
                    icon={<AlertTriangle className="w-3.5 h-3.5" />}
                    items={delinquentClients.map(c => ({
                        name: c.client_name,
                        subtitle: c.client_phone,
                        value: Number(c.overdue_amount),
                        badge: "red" as const,
                        extra: `${c.overdue_count} parcela(s)`,
                    }))}
                    valueColor="text-red-500"
                />
            </div>
        </div>
    );
};

function KPICard({ label, value, sub, icon, color, accent }: {
    label: string; value: string; sub?: string; icon?: React.ReactNode; color?: string; accent?: boolean;
}) {
    return (
        <Card className={accent ? "border-primary/30 bg-primary/[0.03]" : ""}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
                    {icon && <span className="text-muted-foreground/50">{icon}</span>}
                </div>
                <p className={`text-xl font-black mt-1 ${color ?? ""}`}>{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
            </CardContent>
        </Card>
    );
}

export default Dashboard;
