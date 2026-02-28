import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/financial-utils";
import type { FinancialKPIs } from "@/hooks/useFinancialKPIs";

interface Props {
    kpis: FinancialKPIs;
    isLoading: boolean;
}

export function FinancialKPICards({ kpis, isLoading }: Props) {
    const cards = [
        {
            title: "Receita Total",
            value: kpis.totalIncome,
            icon: TrendingUp,
            color: "text-emerald-500",
            sub: kpis.totalNetIncome !== kpis.totalIncome
                ? `Líquido: ${formatBRL(kpis.totalNetIncome)}`
                : "Sem taxas aplicadas",
        },
        {
            title: "Despesas",
            value: kpis.totalExpenses,
            icon: TrendingDown,
            color: "text-red-500",
            sub: "Total de saídas",
        },
        {
            title: "Lucro Real",
            value: kpis.realProfit,
            icon: Wallet,
            color: kpis.realProfit >= 0 ? "text-emerald-500" : "text-red-500",
            sub: "Receita líquida − despesas",
        },
        {
            title: "Recebíveis Pendentes",
            value: kpis.pendingReceivables,
            icon: Clock,
            color: kpis.overdueCount > 0 ? "text-red-500" : "text-yellow-500",
            sub: kpis.overdueCount > 0
                ? `${kpis.overdueCount} atrasado(s)`
                : `${kpis.pendingReceivablesCount} pendente(s)`,
        },
    ];

    return (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {cards.map(({ title, value, icon: Icon, color, sub }) => (
                <Card key={title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
                        <Icon className={`h-4 w-4 ${color}`} />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-7 w-28" />
                        ) : (
                            <>
                                <div className={`text-lg sm:text-2xl font-bold ${color}`}>
                                    {formatBRL(value)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
