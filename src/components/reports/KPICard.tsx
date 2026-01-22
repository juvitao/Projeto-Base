import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string;
    subValue?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string; // e.g. "vs last period"
    };
    className?: string;
}

export function KPICard({ title, value, subValue, icon: Icon, trend, className }: KPICardProps) {
    return (
        <Card className={cn("border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all", className)}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-md">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                            trend.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{value}</span>
                        {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
