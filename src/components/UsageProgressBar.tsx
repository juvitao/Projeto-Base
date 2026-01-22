import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PlanUsage } from "@/hooks/usePlanUsage";

interface UsageProgressBarProps {
    usage: PlanUsage;
    isLoading?: boolean;
}

const UsageProgressBar = ({ usage, isLoading }: UsageProgressBarProps) => {
    if (isLoading) {
        return <div className="h-24 w-full bg-muted animate-pulse rounded-xl" />;
    }

    const formattedSpend = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usage.currentSpend);
    const formattedLimit = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usage.limit);

    return (
        <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Uso do Plano ({usage.planName})</h3>
                    <p className="text-sm text-muted-foreground">Gasto acumulado nos últimos 30 dias</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-foreground">{formattedSpend}</span>
                    <span className="text-sm text-muted-foreground"> / {formattedLimit}</span>
                </div>
            </div>

            <div className="relative h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-500 ease-in-out rounded-full bg-primary")}
                    style={{ width: `${usage.percentage}%` }}
                />
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{usage.percentage.toFixed(1)}% utilizado</span>
                {usage.isOverLimit && <span className="text-red-500 font-medium">Limite excedido! Faça upgrade.</span>}
            </div>
        </div >
    );
};

export default UsageProgressBar;
