import { formatBRL } from "@/lib/financial-utils";

interface RankingItem {
    name: string;
    subtitle?: string;
    value: number;
    badge?: "green" | "red" | "yellow";
    extra?: string;
}

interface RankingListProps {
    title: string;
    icon: React.ReactNode;
    items: RankingItem[];
    valueLabel?: string;
    valueColor?: string;
    emptyMessage?: string;
    formatValue?: (v: number) => string;
}

export function RankingList({
    title,
    icon,
    items,
    valueColor = "text-foreground",
    emptyMessage = "Sem dados no período.",
    formatValue = formatBRL,
}: RankingListProps) {
    return (
        <div className="border rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                {icon} {title}
            </h3>
            {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">{emptyMessage}</p>
            ) : (
                <div className="space-y-1">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            {/* Rank */}
                            <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                                {idx + 1}.
                            </span>

                            {/* Badge dot */}
                            {item.badge && (
                                <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${item.badge === "green"
                                            ? "bg-emerald-500"
                                            : item.badge === "red"
                                                ? "bg-red-500"
                                                : "bg-yellow-500"
                                        }`}
                                />
                            )}

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                {item.subtitle && (
                                    <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                                )}
                            </div>

                            {/* Value */}
                            <div className="text-right shrink-0">
                                <p className={`text-sm font-bold ${valueColor}`}>{formatValue(item.value)}</p>
                                {item.extra && (
                                    <p className="text-[10px] text-muted-foreground">{item.extra}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
