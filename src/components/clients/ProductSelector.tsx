import { useState } from "react";
import { Check, Package, CheckCircle2, Sparkles, Loader2, Star, ShoppingBag, Code, Palette, Zap, Globe, ImageIcon, Workflow, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgencyProducts, AgencyProduct, getPricingLabel } from "@/hooks/useAgencyProducts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Star, Package, ShoppingBag, Code, Palette, Zap, Globe, ImageIcon, Workflow, Calendar, TrendingUp
};

const getPricingColor = (type: AgencyProduct['pricing_type']) => {
    switch (type) {
        case 'fixed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        case 'percentage': return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
        case 'unique': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
};

interface ProductSelectorProps {
    clientId: string;
    clientName: string;
    assignedProducts?: string[];
    onProductsAssigned?: (productIds: string[]) => void;
    trigger?: React.ReactNode;
}

export function ProductSelectorModal({
    clientId,
    clientName,
    assignedProducts = [],
    onProductsAssigned,
    trigger
}: ProductSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>(assignedProducts);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successData, setSuccessData] = useState<{ products: number; tasks: number }>({ products: 0, tasks: 0 });
    const { toast } = useToast();

    // Use dynamic products from database
    const { products: dynamicProducts, isLoading: isLoadingProducts } = useAgencyProducts();

    const toggleProduct = (productId: string) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleAssign = async () => {
        setIsLoading(true);
        try {
            // Get the newly selected products (not previously assigned)
            const newProductIds = selectedProducts.filter(id => !assignedProducts.includes(id));
            const selectedProductItems = dynamicProducts.filter((p: AgencyProduct) => newProductIds.includes(p.id));

            // Create tasks from product features - including client name in task title
            const tasksToCreate = selectedProductItems.flatMap((product: AgencyProduct) =>
                (product.features || []).map((feature, index) => ({
                    client_id: clientId,
                    title: `[${clientName}] ${feature.name}`,
                    description: `Executável do produto "${product.name}" para o cliente ${clientName}`,
                    status: 'pending',
                    priority: index === 0 ? 'high' : 'medium',
                    product_id: product.id,
                    product_name: product.name,
                    created_at: new Date().toISOString(),
                }))
            );

            // Insert tasks if any
            if (tasksToCreate.length > 0) {
                const { error } = await (supabase as any)
                    .from('client_tasks')
                    .insert(tasksToCreate);

                if (error) {
                    console.warn("Could not create tasks:", error);
                }
            }

            // Update client with assigned products
            const { error: updateError } = await (supabase as any)
                .from('agency_clients')
                .update({ assigned_products: selectedProducts })
                .eq('id', clientId);

            if (updateError) {
                console.warn("Could not update client products:", updateError);
            }

            // Show success confirmation
            setSuccessData({ products: newProductIds.length, tasks: tasksToCreate.length });
            setShowSuccess(true);

            toast({
                title: "✅ Produtos atribuídos!",
                description: `${newProductIds.length} produto(s) atribuído(s). ${tasksToCreate.length} demanda(s) criada(s).`,
            });

            onProductsAssigned?.(selectedProducts);

            // Auto-close after 2 seconds
            setTimeout(() => {
                setShowSuccess(false);
                setOpen(false);
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            console.error("Erro ao atribuir produtos:", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: error.message || "Não foi possível atribuir os produtos.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
                setShowSuccess(false);
            }
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Package className="w-4 h-4" />
                        Atribuir Produtos
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                {/* Success Confirmation Overlay */}
                {showSuccess ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-in zoom-in duration-300">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                            <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-foreground">
                                Produtos Atribuídos!
                            </h3>
                            <p className="text-muted-foreground">
                                <span className="font-semibold text-primary">{successData.products}</span> produto(s) vinculado(s) a <span className="font-semibold">{clientName}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-emerald-500">{successData.tasks}</span> demanda(s) criada(s) automaticamente
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                            <Check className="w-3 h-3 text-emerald-500" />
                            Fechando automaticamente...
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                Atribuir Produtos a {clientName}
                            </DialogTitle>
                            <DialogDescription>
                                Selecione os produtos. Cada executável será criado como demanda com o nome do cliente.
                            </DialogDescription>
                        </DialogHeader>

                        {isLoadingProducts ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : dynamicProducts.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>Nenhum produto cadastrado.</p>
                                <p className="text-sm">Crie produtos na aba "Produtos" primeiro.</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {dynamicProducts.map((product: AgencyProduct) => {
                                        const isSelected = selectedProducts.includes(product.id);
                                        const wasAlreadyAssigned = assignedProducts.includes(product.id);
                                        const Icon = ICON_MAP[product.icon_name] || Package;

                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() => !wasAlreadyAssigned && toggleProduct(product.id)}
                                                className={cn(
                                                    "relative p-4 rounded-lg border-2 transition-all",
                                                    wasAlreadyAssigned
                                                        ? "border-emerald-500/50 bg-emerald-500/5 cursor-not-allowed opacity-70"
                                                        : isSelected
                                                            ? "border-primary bg-primary/5 cursor-pointer"
                                                            : "border-border hover:border-primary/50 cursor-pointer"
                                                )}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Checkbox */}
                                                    <Checkbox
                                                        checked={isSelected || wasAlreadyAssigned}
                                                        onCheckedChange={() => !wasAlreadyAssigned && toggleProduct(product.id)}
                                                        disabled={wasAlreadyAssigned}
                                                        className="mt-1"
                                                    />

                                                    {/* Icon */}
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: `${product.color}20` }}
                                                    >
                                                        <Icon className="w-5 h-5" style={{ color: product.color }} />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-foreground">{product.name}</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn("text-[10px] font-medium", getPricingColor(product.pricing_type))}
                                                            >
                                                                {getPricingLabel(product.pricing_type)}
                                                            </Badge>
                                                            {wasAlreadyAssigned && (
                                                                <Badge className="bg-emerald-500 text-white text-[10px]">
                                                                    Já atribuído
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>

                                                        {/* Features - All visible */}
                                                        {product.features && product.features.length > 0 && (
                                                            <div className="space-y-1 mt-2">
                                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                                    Demandas que serão criadas:
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {product.features.map((feature) => (
                                                                        <Badge key={feature.id} variant="secondary" className="text-[10px] font-normal">
                                                                            {feature.name}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Selected/Assigned Indicator */}
                                                    {(isSelected || wasAlreadyAssigned) && (
                                                        <div className="absolute top-2 right-2">
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center",
                                                                wasAlreadyAssigned ? "bg-emerald-500" : "bg-primary"
                                                            )}>
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}

                        <DialogFooter className="flex items-center justify-between sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                {selectedProducts.length} produto(s) selecionado(s)
                                {assignedProducts.length > 0 && (
                                    <span className="text-emerald-500 ml-2">
                                        ({assignedProducts.length} já atribuído(s))
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleAssign}
                                    disabled={isLoading || selectedProducts.filter(id => !assignedProducts.includes(id)).length === 0}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Atribuindo...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Atribuir Produtos
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
