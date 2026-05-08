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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Loader2, Plus, Search, ChevronsUpDown, Check } from "lucide-react";
import { useBrands, useMasterProducts } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financial-utils";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type MasterProduct = Database["public"]["Tables"]["master_products"]["Row"];

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (masterProductId: string, quantity: number, costPrice: number, salePrice: number, expirationDate?: string | null) => Promise<void>;
}

export function AddToInventoryDialog({ open, onClose, onSave }: Props) {
    const { toast } = useToast();
    const { brands, createBrand } = useBrands();
    const [selectedBrandId, setSelectedBrandId] = useState("");
    const { createProduct } = useMasterProducts(selectedBrandId);

    // Brand combobox state
    const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);

    // Product fields
    const [directProductName, setDirectProductName] = useState("");
    const [directCategory, setDirectCategory] = useState("");
    const [newBrandName, setNewBrandName] = useState("");
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);
    const [showNewBrandInput, setShowNewBrandInput] = useState(false);

    // Shared fields
    const [quantity, setQuantity] = useState("1");
    const [salePrice, setSalePrice] = useState("");
    const [commission, setCommission] = useState("30");
    const [expirationDate, setExpirationDate] = useState("");
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
            setSelectedBrandId("");
            setDirectProductName("");
            setDirectCategory("");
            setNewBrandName("");
            setShowNewBrandInput(false);
            setQuantity("1");
            setSalePrice("");
            setExpirationDate("");
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

    // Submit — create the product in master_products then add to inventory
    const handleSubmit = async () => {
        if (!salePrice || !selectedBrandId) return;
        setIsSubmitting(true);
        try {
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

            await onSave(
                newProduct.id,
                parseInt(quantity) || 1,
                Math.round(calculatedCost * 100) / 100,
                parseFloat(salePrice) || 0,
                expirationDate.trim() || null
            );
            onClose();
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const canSubmit = !!selectedBrandId && !!directProductName.trim() && !!salePrice;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">
                        Entrada de Mercadoria
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Step 1: Brand — searchable combobox */}
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
                                <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={brandPopoverOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {selectedBrand ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedBrand.color || "#888" }} />
                                                    {selectedBrand.name}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                    <Search className="w-4 h-4" />
                                                    Buscar marca...
                                                </span>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Pesquisar marca..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                                                <CommandGroup>
                                                    {brands.map((b) => (
                                                        <CommandItem
                                                            key={b.id}
                                                            value={b.name}
                                                            onSelect={() => {
                                                                setSelectedBrandId(b.id);
                                                                setBrandPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedBrandId === b.id ? "opacity-100" : "opacity-0")} />
                                                            <span className="w-3 h-3 rounded-full shrink-0 mr-2" style={{ backgroundColor: b.color || "#888" }} />
                                                            {b.name}
                                                            {b.is_custom && <span className="text-[9px] text-muted-foreground ml-1">(Custom)</span>}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
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

                    {/* Step 2: Product — direct entry */}
                    {selectedBrandId && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Produto</Label>
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
                        </div>
                    )}

                    {/* Step 3: Qty + Sale Price + Commission */}
                    {selectedBrandId && directProductName.trim() && (
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Quantidade e Preços</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                                <div className="space-y-1">
                                    <Label className="text-xs">Validade</Label>
                                    <Input
                                        placeholder="MM/AAAA"
                                        value={expirationDate}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, "");
                                            if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2, 6);
                                            setExpirationDate(val);
                                        }}
                                        maxLength={7}
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
