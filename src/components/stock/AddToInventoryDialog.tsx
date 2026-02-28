import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search } from "lucide-react";
import { useBrands, useCatalogProducts } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type CatalogProduct = Database["public"]["Tables"]["vora_catalog_products"]["Row"];

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (catalogProductId: string, quantity: number, costPrice: number, salePrice: number) => Promise<void>;
}

export function AddToInventoryDialog({ open, onClose, onSave }: Props) {
    const { toast } = useToast();
    const { brands } = useBrands();
    const [selectedBrandId, setSelectedBrandId] = useState("");
    const { products, isLoading: catalogLoading, searchCatalog, createProduct } = useCatalogProducts(selectedBrandId);

    const [productQuery, setProductQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [quantity, setQuantity] = useState("1");
    const [salePrice, setSalePrice] = useState("");
    const [commission, setCommission] = useState("30");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);

    // Calculated cost: Custo = Valor de Venda - (Valor de Venda * (Comissão / 100))
    const calculatedCost = useMemo(() => {
        const sale = parseFloat(salePrice) || 0;
        const comm = parseFloat(commission) || 0;
        if (sale <= 0 || comm <= 0) return 0;
        return sale - (sale * (comm / 100));
    }, [salePrice, commission]);

    const projectedProfit = useMemo(() => {
        const sale = parseFloat(salePrice) || 0;
        return sale - calculatedCost;
    }, [salePrice, calculatedCost]);

    useEffect(() => {
        if (open) {
            setSelectedBrandId("");
            setProductQuery("");
            setSelectedProduct(null);
            setQuantity("1");
            setSalePrice("");
            setCommission("30");
        }
    }, [open]);

    useEffect(() => {
        if (productQuery.length >= 2 && selectedBrandId) {
            searchCatalog(productQuery);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    }, [productQuery, selectedBrandId]);

    const handleCreateProduct = async () => {
        if (!selectedBrandId || !productQuery.trim()) return;
        setIsCreatingProduct(true);
        try {
            const newProduct = await createProduct(selectedBrandId, productQuery.trim());
            setSelectedProduct(newProduct);
            setShowDropdown(false);
            toast({ title: "Produto criado no catálogo!" });
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        } finally {
            setIsCreatingProduct(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !salePrice) return;
        setIsSubmitting(true);
        try {
            await onSave(
                selectedProduct.id,
                parseInt(quantity) || 1,
                Math.round(calculatedCost * 100) / 100,
                parseFloat(salePrice) || 0
            );
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedBrand = brands.find(b => b.id === selectedBrandId);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Adicionar ao Estoque</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Step 1: Brand */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Marca</Label>
                        <Select value={selectedBrandId} onValueChange={(v) => { setSelectedBrandId(v); setSelectedProduct(null); setProductQuery(""); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a marca..." />
                            </SelectTrigger>
                            <SelectContent>
                                {brands.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        <span className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                                            {b.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: Product */}
                    {selectedBrandId && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Produto</Label>
                            {selectedProduct ? (
                                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                                    <div>
                                        <p className="font-medium text-sm">{selectedProduct.name}</p>
                                        {selectedProduct.category && (
                                            <p className="text-xs text-muted-foreground">{selectedProduct.category}</p>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(null); setProductQuery(""); }}>
                                        Trocar
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={`Buscar produto ${selectedBrand?.name ?? ""}...`}
                                        className="pl-9"
                                        value={productQuery}
                                        onChange={(e) => setProductQuery(e.target.value)}
                                    />
                                    {showDropdown && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
                                            {catalogLoading ? (
                                                <div className="p-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                            ) : (
                                                <>
                                                    {products.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                                                            onClick={() => { setSelectedProduct(p); setShowDropdown(false); }}
                                                        >
                                                            <span className="font-medium">{p.name}</span>
                                                            {p.category && <span className="text-muted-foreground ml-2 text-xs">{p.category}</span>}
                                                        </button>
                                                    ))}
                                                    {productQuery.length >= 2 && (
                                                        <button
                                                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-t text-primary flex items-center gap-2"
                                                            onClick={handleCreateProduct}
                                                            disabled={isCreatingProduct}
                                                        >
                                                            {isCreatingProduct ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                                            Criar &quot;{productQuery}&quot; na marca {selectedBrand?.name}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Qty + Sale Price + Commission */}
                    {selectedProduct && (
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Quantidade e Preços</Label>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Quantidade</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Venda (R$) *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0,00"
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Comissão (%)</Label>
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        placeholder="30"
                                        value={commission}
                                        onChange={(e) => setCommission(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                            </div>

                            {/* Live calculation preview */}
                            {parseFloat(salePrice) > 0 && parseFloat(commission) > 0 && (
                                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Preço de Venda</span>
                                        <span className="font-medium">{formatBRL(parseFloat(salePrice) || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Comissão ({commission}%)</span>
                                        <span className="font-medium text-emerald-500">+{formatBRL(projectedProfit)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t border-border/50 pt-1.5">
                                        <span className="text-muted-foreground font-bold">Custo calculado</span>
                                        <span className="font-black">{formatBRL(calculatedCost)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedProduct || !salePrice}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Adicionar ao Estoque
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
