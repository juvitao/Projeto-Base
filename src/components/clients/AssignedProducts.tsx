import { Badge } from "@/components/ui/badge";
import { PRODUCTS, ProductItem, getPricingLabel, getPricingColor } from "@/config/products.config";
import { Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignedProductsDisplayProps {
    assignedProductIds: string[];
    className?: string;
}

export function AssignedProductsDisplay({ assignedProductIds, className }: AssignedProductsDisplayProps) {
    if (!assignedProductIds || assignedProductIds.length === 0) {
        return (
            <div className={cn("p-4 rounded-lg border border-dashed border-border bg-muted/20", className)}>
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Package className="w-5 h-5" />
                    <span className="text-sm">Nenhum produto atribuído</span>
                </div>
            </div>
        );
    }

    const assignedProducts = PRODUCTS.filter(p => assignedProductIds.includes(p.id));

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Produtos Atribuídos</h3>
                <Badge variant="secondary" className="text-xs">
                    {assignedProducts.length} produto(s)
                </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignedProducts.map((product) => {
                    const Icon = product.icon;
                    return (
                        <div
                            key={product.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${product.color}20` }}
                            >
                                <div style={{ color: product.color }}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                    {product.name}
                                </p>
                                <Badge
                                    variant="outline"
                                    className={cn("text-[10px] font-medium", getPricingColor(product.pricingType))}
                                >
                                    {getPricingLabel(product.pricingType)}
                                </Badge>
                            </div>
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Converte produtos atribuídos em fases de OnboardingTimeline
export function convertProductsToPhases(assignedProductIds: string[]): import("@/types/lever-os").OnboardingPhase[] {
    const assignedProducts = PRODUCTS.filter(p => assignedProductIds.includes(p.id));

    if (assignedProducts.length === 0) {
        return [];
    }

    return assignedProducts.map((product, pIndex) => ({
        id: `product-${product.id}`,
        title: product.name,
        isLocked: false,
        steps: product.features.map((feature, fIndex) => ({
            id: `${product.id}-step-${fIndex}`,
            title: feature,
            status: "pending" as const,
            assigneeRole: "head" as const, // Default, can be customized
            description: undefined,
        }))
    }));
}
