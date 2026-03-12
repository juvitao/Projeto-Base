import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, TrendingUp, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
    totalSellers: number;
    activeSellers: number;
    planBreakdown: Record<string, number>;
    totalRevenue: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc("admin_get_seller_stats");
            if (error) throw error;

            const sellers = data ?? [];
            const planBreakdown: Record<string, number> = {};
            let totalRevenue = 0;
            let activeSellers = 0;

            sellers.forEach((s: any) => {
                const planName = s.plan_name || "Sem plano";
                planBreakdown[planName] = (planBreakdown[planName] || 0) + 1;
                totalRevenue += Number(s.total_revenue || 0);
                if (s.is_active) activeSellers++;
            });

            setStats({
                totalSellers: sellers.length,
                activeSellers,
                planBreakdown,
                totalRevenue,
            });
        } catch (err) {
            console.error("Erro ao buscar stats:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const kpis = [
        { label: "Total Vendedoras", value: stats?.totalSellers ?? 0, icon: Users, color: "text-blue-500" },
        { label: "Ativas", value: stats?.activeSellers ?? 0, icon: Activity, color: "text-emerald-500" },
        {
            label: "MRR Estimado",
            value: `R$ ${((stats?.planBreakdown?.["Pro"] ?? 0) * 29.90 + (stats?.planBreakdown?.["Elite"] ?? 0) * 59.90).toFixed(2)}`,
            icon: TrendingUp,
            color: "text-amber-500"
        },
        {
            label: "Volume Total Vendas",
            value: `R$ ${(stats?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: CreditCard,
            color: "text-purple-500"
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Dashboard Admin</h1>
                <p className="text-muted-foreground text-sm">Visão global da plataforma VORA</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(kpi => (
                    <Card key={kpi.label}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {kpi.label}
                            </CardTitle>
                            <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black">{kpi.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Plan Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Distribuição por Plano</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(stats?.planBreakdown ?? {}).map(([plan, count]) => (
                            <div key={plan} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                        plan === "Elite" ? "bg-amber-500" :
                                        plan === "Pro" ? "bg-blue-500" : "bg-zinc-400"
                                    }`} />
                                    <span className="text-sm font-medium">{plan}</span>
                                </div>
                                <span className="text-sm font-bold">{count} vendedora{count !== 1 ? "s" : ""}</span>
                            </div>
                        ))}
                        {Object.keys(stats?.planBreakdown ?? {}).length === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhuma vendedora cadastrada ainda.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
