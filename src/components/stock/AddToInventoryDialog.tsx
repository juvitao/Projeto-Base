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
import { Loader2, Plus, Search, Package, Sparkles } from "lucide-react";
import { useBrands, useMasterProducts } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type MasterProduct = Database["public"]["Tables"]["master_products"]["Row"];

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (masterProductId: string, quantity: number, costPrice: number, salePrice: number) => Promise<void>;
}

type EntryMode = "direct" | "catalog";

export function AddToInventoryDialog({ open, onClose, onSave }: Props) {
    const { toast } = useToast();
    const { brands, createBrand } = useBrands();
    const [selectedBrandId, setSelectedBrandId] = useState("");
    const { products, isLoading: catalogLoading, searchCatalog, createProduct } = useMasterProducts(selectedBrandId);

    // Entry mode
    const [entryMode, setEntryMode] = useState<EntryMode>("direct");

    // Direct mode fields
    const [directProductName, setDirectProductName] = useState("");
    const [directCategory, setDirectCategory] = useState("");
    const [newBrandName, setNewBrandName] = useState("");
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);
    const [showNewBrandInput, setShowNewBrandInput] = useState(false);

    // Catalog mode fields
    const [productQuery, setProductQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Shared fields
    const [quantity, setQuantity] = useState("1");
    const [salePrice, setSalePrice] = useState("");
    const [commission, setCommission] = useState("30");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculated cost
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

    // Reset when opening
    useEffect(() => {
        if (open) {
            setEntryMode("direct");
            setSelectedBrandId("");
            setDirectProductName("");
            setDirectCategory("");
            setNewBrandName("");
            setShowNewBrandInput(false);
            setProductQuery("");
            setSelectedProduct(null);
            setQuantity("1");
            setSalePrice("");
            // Read default commission from Settings (localStorage)
            try {
                const settingsRaw = Object.keys(localStorage).find(k => k.startsWith("vora_settings_"));
                if (settingsRaw) {
                    const settings = JSON.parse(localStorage.getItem(settingsRaw) || "{}");
                    setCommission(settings.default_commission || "30");
                } else {
                    setCommission("30");
                }
            } catch {
                setCommission("30");
            }
        }
    }, [open]);

    // Catalog search
    useEffect(() => {
        if (entryMode === "catalog" && productQuery.length >= 2 && selectedBrandId) {
            searchCatalog(productQuery);
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    }, [productQuery, selectedBrandId, entryMode]);

    // Create a new brand inline
    const handleCreateBrand = async () => {
        if (!newBrandName.trim()) return;
        setIsCreatingBrand(true);
        try {
            const brand = await createBrand(newBrandName.trim());
            setSelectedBrandId(brand.id);
            setNewBrandName("");
            setShowNewBrandInput(false);
            toast({ title: `Marca "${brand.name}" criada!` });
        } catch (err: any) {
            toast({ title: "Erro ao criar marca", description: err.message, variant: "destructive" });
        } finally {
            setIsCreatingBrand(false);
        }
    };

    // Submit — for direct mode, first create the product in master_products then add to inventory
    const handleSubmit = async () => {
        if (!salePrice || !selectedBrandId) return;
        setIsSubmitting(true);
        try {
            let productId: string;

            if (entryMode === "direct") {
                if (!directProductName.trim()) {
                    toast({ title: "Digite o nome do produto", variant: "destructive" });
                    setIsSubmitting(false);
                    return;
                }
                // Create the product in master_products with is_custom = true
                const newProduct = await createProduct(
                    selectedBrandId,
                    directProductName.trim(),
                    directCategory.trim() || undefined,
                    parseFloat(salePrice) || undefined
                );
                productId = newProduct.id;
            } else {
                if (!selectedProduct) {
                    toast({ title: "Selecione um produto do catálogo", variant: "destructive" });
                    setIsSubmitting(false);
                    return;
                }
                productId = selectedProduct.id;
            }

            await onSave(
                productId,
                parseInt(quantity) || 1,
                Math.round(calculatedCost * 100) / 100,
                parseFloat(salePrice) || 0
            );
            onClose();
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const canSubmit = entryMode === "direct"
        ? (!!selectedBrandId && !!directProductName.trim() && !!salePrice)
        : (!!selectedProduct && !!salePrice);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">
                        Entrada de Mercadoria
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Mode Selector */}
                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                        <Button
                            variant={entryMode === "direct" ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 text-xs h-9 gap-1.5"
                            onClick={() => { setEntryMode("direct"); setSelectedProduct(null); setProductQuery(""); }}
                        >
                            <Package className="w-3.5 h-3.5" />
                            Cadastro Direto
                        </Button>
                        <Button
                            variant={entryMode === "catalog" ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 text-xs h-9 gap-1.5"
                            onClick={() => { setEntryMode("catalog"); setDirectProductName(""); setDirectCategory(""); }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Importar do Catálogo
                        </Button>
                    </div>

                    {/* Step 1: Brand */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Marca</Label>
                        {showNewBrandInput ? (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nome da nova marca..."
                                    value={newBrandName}
                                    onChange={(e) => setNewBrandName(e.target.value)}
                                    className="flex-1"
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateBrand()}
                                />
                                <Button
                                    size="sm"
                                    onClick={handleCreateBrand}
                                    disabled={isCreatingBrand || !newBrandName.trim()}
                                    className="shrink-0"
                                >
                                    {isCreatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setShowNewBrandInput(false); setNewBrandName(""); }}>
                                    ✕
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Select value={selectedBrandId} onValueChange={(v) => { setSelectedBrandId(v); setSelectedProduct(null); setProductQuery(""); }}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Selecione a marca..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.color || "#888" }} />
                                                    {b.name}
                                                    {b.is_custom && <span className="text-[9px] text-muted-foreground">(Custom)</span>}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => setShowNewBrandInput(true)}
                                    title="Criar nova marca"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Product — varies by mode */}
                    {selectedBrandId && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Produto</Label>

                            {entryMode === "direct" ? (
                                /* DIRECT MODE — free text fields */
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Nome do produto (ex: Perfume Malbec Gold 100ml)"
                                        value={directProductName}
                                        onChange={(e) => setDirectProductName(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Categoria (opcional: Perfumaria, Corpo, Rosto...)"
                                        value={directCategory}
                                        onChange={(e) => setDirectCategory(e.target.value)}
                                    />
                                </div>
                            ) : (
                                /* CATALOG MODE — search + select from master products */
                                selectedProduct ? (
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
                                                        {products.length === 0 && productQuery.length >= 2 && (
                                                            <div className="p-3 text-center text-xs text-muted-foreground">
                                                                Nenhum produto encontrado. Use "Cadastro Direto" para criar.
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* Step 3: Qty + Sale Price + Commission */}
                    {(entryMode === "direct" ? (selectedBrandId && directProductName.trim()) : selectedProduct) && (
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
                        disabled={isSubmitting || !canSubmit}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Adicionar ao Estoque
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
