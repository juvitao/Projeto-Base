import { useEffect, useMemo, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, ChevronsUpDown, Check, AlertTriangle } from "lucide-react";
import { useBrands } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financial-utils";
import { cn } from "@/lib/utils";
import type { BulkInventoryItem } from "@/hooks/useBulkInventory";

interface Props {
    initialItems: BulkInventoryItem[];
    onCancel: () => void;
    onConfirm: (items: BulkInventoryItem[]) => Promise<void>;
    isCommitting: boolean;
}

/**
 * Calcula cost_price a partir de sale_price e comissao%.
 * Mesma logica do AddToInventoryDialog: custo = venda - (venda * comissao/100).
 */
function calcCost(salePrice: number, commissionPct: number): number {
    if (salePrice <= 0 || commissionPct <= 0) return 0;
    return Math.round((salePrice - salePrice * (commissionPct / 100)) * 100) / 100;
}

export function BulkInventoryReview({ initialItems, onCancel, onConfirm, isCommitting }: Props) {
    const { toast } = useToast();
    const { brands, createBrand } = useBrands();
    const [items, setItems] = useState<BulkInventoryItem[]>(initialItems);

    // Defaults globais aplicados em massa
    const [defaultSalePrice, setDefaultSalePrice] = useState("");
    const [defaultCommission, setDefaultCommission] = useState("30");

    // Le comissao padrao do localStorage (mesma fonte do AddToInventoryDialog)
    useEffect(() => {
        try {
            const settingsRaw = Object.keys(localStorage).find((k) => k.startsWith("vora_settings_"));
            if (settingsRaw) {
                const settings = JSON.parse(localStorage.getItem(settingsRaw) || "{}");
                if (settings.default_commission) setDefaultCommission(String(settings.default_commission));
            }
        } catch { /* ignore */ }
    }, []);

    // Aplica os defaults globais nas linhas que ainda nao tem preco definido
    const applyDefaultsToAll = () => {
        const sale = parseFloat(defaultSalePrice) || 0;
        const comm = parseFloat(defaultCommission) || 0;
        if (sale <= 0) {
            toast({ title: "Defina o preco de venda padrao primeiro", variant: "destructive" });
            return;
        }
        setItems((prev) =>
            prev.map((it) => ({
                ...it,
                sale_price: sale,
                cost_price: calcCost(sale, comm),
            }))
        );
        toast({ title: `Preco aplicado em ${items.length} produto(s)` });
    };

    const updateItem = (idx: number, patch: Partial<BulkInventoryItem>) => {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    };

    const removeItem = (idx: number) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const addEmptyRow = () => {
        setItems((prev) => [
            ...prev,
            {
                brand_name: "",
                product_name: "",
                quantity: 1,
                sale_price: 0,
                cost_price: 0,
                _ui: { from: "manual" },
            },
        ]);
    };

    // Cria uma marca nova inline e ja seleciona ela na linha
    const handleCreateBrandForRow = async (idx: number, name: string) => {
        try {
            const brand = await createBrand(name);
            updateItem(idx, { brand_id: brand.id, brand_name: brand.name });
            toast({ title: `Marca "${brand.name}" criada` });
        } catch (err: any) {
            toast({ title: "Erro ao criar marca", description: err.message, variant: "destructive" });
        }
    };

    // Validacao basica antes do submit (espelha o que o RPC valida)
    const invalidRows = useMemo(() => {
        const errors: Record<number, string> = {};
        items.forEach((it, i) => {
            if (!it.brand_name?.trim()) errors[i] = "Marca obrigatoria";
            else if (!it.product_name?.trim()) errors[i] = "Nome do produto obrigatorio";
            else if (!it.quantity || it.quantity <= 0) errors[i] = "Quantidade invalida";
            else if (!it.sale_price || it.sale_price <= 0) errors[i] = "Preco invalido";
        });
        return errors;
    }, [items]);

    const canSubmit = items.length > 0 && Object.keys(invalidRows).length === 0 && !isCommitting;

    const handleSubmit = async () => {
        if (!canSubmit) {
            toast({ title: "Existem linhas com erro", description: "Corrija antes de confirmar", variant: "destructive" });
            return;
        }
        await onConfirm(items);
    };

    return (
        <div className="space-y-4">
            {/* Header — defaults globais */}
            <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Aplicar em todos os produtos
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs">Preco de venda padrao (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={defaultSalePrice}
                            onChange={(e) => setDefaultSalePrice(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Comissao padrao (%)</Label>
                        <Input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={defaultCommission}
                            onChange={(e) => setDefaultCommission(e.target.value)}
                        />
                    </div>
                    <Button variant="secondary" onClick={applyDefaultsToAll} disabled={items.length === 0}>
                        Aplicar a todos
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Voce pode sobrescrever preco/comissao linha a linha na tabela abaixo.
                </p>
            </div>

            {/* Tabela editavel */}
            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[180px]">Marca</TableHead>
                            <TableHead className="min-w-[220px]">Produto</TableHead>
                            <TableHead className="w-[80px]">Qtd</TableHead>
                            <TableHead className="w-[120px]">Venda (R$)</TableHead>
                            <TableHead className="w-[100px]">Comissao %</TableHead>
                            <TableHead className="w-[120px]">Validade</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((it, idx) => {
                            const rowError = invalidRows[idx];
                            const lowConfidence = (it._ui?.confidence ?? 1) < 0.5;
                            // Reverso: a comissao salva eh derivada de cost/sale; mas eh mais util
                            // mostrar uma comissao editavel que recalcula o cost na hora.
                            const currentCommission = it.sale_price > 0
                                ? Math.round(((it.sale_price - it.cost_price) / it.sale_price) * 100)
                                : parseFloat(defaultCommission) || 0;

                            return (
                                <TableRow
                                    key={idx}
                                    className={cn(
                                        rowError && "bg-destructive/5",
                                        lowConfidence && !rowError && "bg-amber-500/5"
                                    )}
                                >
                                    {/* Marca */}
                                    <TableCell>
                                        <BrandCombobox
                                            value={it.brand_id}
                                            label={it.brand_name}
                                            brands={brands}
                                            onSelect={(b) => updateItem(idx, { brand_id: b.id, brand_name: b.name })}
                                            onCreate={(name) => handleCreateBrandForRow(idx, name)}
                                        />
                                    </TableCell>
                                    {/* Produto */}
                                    <TableCell>
                                        <Input
                                            value={it.product_name}
                                            onChange={(e) => updateItem(idx, { product_name: e.target.value, master_product_id: undefined })}
                                            placeholder="Nome do produto"
                                            className="h-9"
                                        />
                                    </TableCell>
                                    {/* Quantidade */}
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={it.quantity}
                                            onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                                            className="h-9"
                                        />
                                    </TableCell>
                                    {/* Preco venda */}
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={it.sale_price || ""}
                                            onChange={(e) => {
                                                const sale = parseFloat(e.target.value) || 0;
                                                updateItem(idx, {
                                                    sale_price: sale,
                                                    cost_price: calcCost(sale, currentCommission),
                                                });
                                            }}
                                            placeholder="0,00"
                                            className="h-9"
                                        />
                                    </TableCell>
                                    {/* Comissao */}
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="1"
                                            min="0"
                                            max="100"
                                            value={currentCommission}
                                            onChange={(e) => {
                                                const comm = parseFloat(e.target.value) || 0;
                                                updateItem(idx, { cost_price: calcCost(it.sale_price, comm) });
                                            }}
                                            className="h-9"
                                        />
                                    </TableCell>
                                    {/* Validade */}
                                    <TableCell>
                                        <Input
                                            placeholder="MM/AAAA"
                                            value={it.expiration_date ?? ""}
                                            maxLength={7}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/\D/g, "");
                                                if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2, 6);
                                                updateItem(idx, { expiration_date: val || null });
                                            }}
                                            className="h-9"
                                        />
                                    </TableCell>
                                    {/* Acoes */}
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(idx)}
                                            aria-label="Remover linha"
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    Nenhum produto para revisar. Adicione manualmente abaixo ou volte e tente outra foto/CSV.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Avisos / atalhos */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={addEmptyRow}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar linha manual
                </Button>

                {Object.keys(invalidRows).length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        {Object.keys(invalidRows).length} linha(s) com erro
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={onCancel} disabled={isCommitting}>
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit}>
                    {isCommitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmar e adicionar {items.length} produto(s)
                </Button>
            </div>
        </div>
    );
}

// ───────────────────────────────────────
// Combobox interno reutilizado por linha
// ───────────────────────────────────────

interface BrandLite { id: string; name: string; color?: string | null }

interface BrandComboboxProps {
    value: string | undefined;
    label: string;
    brands: BrandLite[];
    onSelect: (b: BrandLite) => void;
    onCreate: (name: string) => Promise<void> | void;
}

function BrandCombobox({ value, label, brands, onSelect, onCreate }: BrandComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const exactMatch = brands.find((b) => b.name.toLowerCase() === search.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-9 truncate"
                >
                    <span className="truncate">{label || "Selecionar marca..."}</span>
                    <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Buscar marca..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {search.trim() && !exactMatch ? (
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                                    onClick={async () => {
                                        await onCreate(search.trim());
                                        setSearch("");
                                        setOpen(false);
                                    }}
                                >
                                    + Criar marca "<strong>{search.trim()}</strong>"
                                </button>
                            ) : "Nenhuma marca encontrada"}
                        </CommandEmpty>
                        <CommandGroup>
                            {brands.map((b) => (
                                <CommandItem
                                    key={b.id}
                                    value={b.name}
                                    onSelect={() => {
                                        onSelect(b);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === b.id ? "opacity-100" : "opacity-0")} />
                                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: b.color || "#888" }} />
                                    {b.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
