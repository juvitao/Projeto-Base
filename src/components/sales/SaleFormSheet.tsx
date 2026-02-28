import { useState, useEffect, useMemo } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Plus,
    Trash2,
    Loader2,
    UserPlus,
    User,
    Search,
    ShoppingCart,
} from "lucide-react";
import { formatBRL } from "@/lib/financial-utils";
import { useClientSearch } from "@/hooks/useClientSearch";
import { useInventory, type InventoryWithProduct } from "@/hooks/useInventory";
import { QuickClientDialog } from "./QuickClientDialog";
import type { CreateSalePayload } from "@/hooks/useSales";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["vora_clients"]["Row"];

interface CartItem {
    id: string;
    product_id: string | null;
    inventory_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    max_qty: number;
}

interface Installment {
    amount_due: number;
    due_date: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (payload: CreateSalePayload) => Promise<any>;
}

const PAYMENT_OPTIONS = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "pix", label: "Pix" },
    { value: "debito", label: "Débito" },
    { value: "credito", label: "Crédito" },
    { value: "fiado", label: "Fiado / Parcelamento de Boca" },
];

let itemIdCounter = 0;

export function SaleFormSheet({ open, onClose, onSave }: Props) {
    // Client
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientQuery, setClientQuery] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [quickClientOpen, setQuickClientOpen] = useState(false);
    const { clients, searchClients, fetchAllClients } = useClientSearch();

    // Cart
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [productQuery, setProductQuery] = useState("");
    const { inventory } = useInventory();
    const availableInventory = inventory.filter(i => i.quantity > 0);

    // Payment
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
    const [discount, setDiscount] = useState("");

    // Installments
    const [numInstallments, setNumInstallments] = useState(2);
    const [downPayment, setDownPayment] = useState("");
    const [firstInstallmentDate, setFirstInstallmentDate] = useState("");
    const [installments, setInstallments] = useState<Installment[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Init
    useEffect(() => {
        if (open) {
            setSelectedClient(null);
            setClientQuery("");
            setCartItems([]);
            setPaymentMethod("dinheiro");
            setSaleDate(new Date().toISOString().split("T")[0]);
            setDiscount("");
            setNumInstallments(2);
            setDownPayment("");
            setFirstInstallmentDate("");
            setInstallments([]);
            fetchAllClients();
        }
    }, [open]);

    // Client search
    useEffect(() => {
        if (clientQuery.length >= 2) {
            searchClients(clientQuery);
            setShowClientDropdown(true);
        } else {
            setShowClientDropdown(false);
        }
    }, [clientQuery]);

    // Filtered inventory for product search
    const filteredInventory = productQuery.length >= 2
        ? availableInventory.filter(i => i.catalog_product?.name.toLowerCase().includes(productQuery.toLowerCase()))
        : [];

    // Totals
    const subtotal = useMemo(
        () => cartItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
        [cartItems]
    );
    const discountNum = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - discountNum);

    // Generate installments when fiado settings change
    useEffect(() => {
        if (paymentMethod !== "fiado" || !firstInstallmentDate || numInstallments < 1) {
            setInstallments([]);
            return;
        }
        const dp = parseFloat(downPayment) || 0;
        const remaining = total - dp;
        if (remaining <= 0) {
            setInstallments([]);
            return;
        }
        const perInstallment = Math.round((remaining / numInstallments) * 100) / 100;
        const newInstallments: Installment[] = [];
        for (let i = 0; i < numInstallments; i++) {
            const date = new Date(firstInstallmentDate + "T12:00:00");
            date.setDate(date.getDate() + i * 30);
            const isLast = i === numInstallments - 1;
            newInstallments.push({
                amount_due: isLast ? remaining - perInstallment * (numInstallments - 1) : perInstallment,
                due_date: date.toISOString().split("T")[0],
            });
        }
        setInstallments(newInstallments);
    }, [paymentMethod, numInstallments, downPayment, firstInstallmentDate, total]);

    const installmentsTotal = installments.reduce((s, i) => s + i.amount_due, 0) + (parseFloat(downPayment) || 0);
    const installmentsMatch = paymentMethod !== "fiado" || Math.abs(installmentsTotal - total) < 0.02;

    // Cart actions
    const addCartItem = (invItem?: InventoryWithProduct) => {
        setCartItems((prev) => [
            ...prev,
            {
                id: String(++itemIdCounter),
                product_id: invItem?.catalog_product_id ?? null,
                inventory_id: invItem?.id ?? null,
                name: invItem?.catalog_product?.name ?? "",
                quantity: 1,
                unit_price: invItem?.sale_price ?? 0,
                max_qty: invItem?.quantity ?? 999,
            },
        ]);
        setProductQuery("");
    };

    const updateCartItem = (id: string, field: keyof CartItem, value: any) => {
        setCartItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const removeCartItem = (id: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    // Submit
    const canSubmit = selectedClient && cartItems.length > 0 && total > 0 && installmentsMatch;

    const handleSubmit = async () => {
        if (!canSubmit || !selectedClient) return;
        setIsSubmitting(true);
        try {
            await onSave({
                client_id: selectedClient.id,
                sale_date: saleDate,
                payment_method: paymentMethod,
                discount: discountNum,
                total_amount: total,
                installments: paymentMethod === "fiado" ? numInstallments : 1,
                first_installment_date: firstInstallmentDate,
                items: cartItems.map((i) => ({
                    product_id: i.product_id,
                    inventory_id: i.inventory_id,
                    name: i.name,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    needs_ordering: false,
                })),
                receivables: paymentMethod === "fiado" ? installments : [],
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
                <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
                    <SheetHeader className="px-5 py-4 border-b bg-muted/30">
                        <SheetTitle className="flex items-center gap-2.5 text-lg font-black uppercase tracking-tight">
                            <ShoppingCart className="h-5 w-5 text-primary" /> Nova Venda
                        </SheetTitle>
                    </SheetHeader>

                    <ScrollArea className="flex-1">
                        <div className="p-4 sm:p-5 space-y-6 pb-48">
                            {/* ==================== CLIENTE ==================== */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold">Cliente</Label>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setQuickClientOpen(true)}>
                                        <UserPlus className="h-3.5 w-3.5" /> Criar Rápido
                                    </Button>
                                </div>
                                {selectedClient ? (
                                    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{selectedClient.name}</p>
                                            <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setClientQuery(""); }}>
                                            Trocar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar cliente por nome ou telefone..."
                                            className="pl-9 h-10 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-colors"
                                            value={clientQuery}
                                            onChange={(e) => setClientQuery(e.target.value)}
                                            onFocus={() => clientQuery.length >= 2 && setShowClientDropdown(true)}
                                        />
                                        {showClientDropdown && clients.length > 0 && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border/50 rounded-xl shadow-xl max-h-48 overflow-auto p-1">
                                                {clients.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        className="w-full text-left px-3 py-2.5 hover:bg-primary/5 rounded-lg text-sm transition-colors flex items-center gap-3"
                                                        onClick={() => { setSelectedClient(c); setShowClientDropdown(false); setClientQuery(""); }}
                                                    >
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <User className="w-3 h-3" />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium block">{c.name}</span>
                                                            <span className="text-muted-foreground text-xs">{c.phone}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <Separator />

                            {/* ==================== CARRINHO ==================== */}
                            <section className="space-y-3">
                                <Label className="text-sm font-bold">Produtos</Label>

                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-2 items-start bg-muted/30 p-3 rounded-lg">
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                placeholder="Nome do produto"
                                                value={item.name}
                                                onChange={(e) => updateCartItem(item.id, "name", e.target.value)}
                                                className="text-sm h-9"
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateCartItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Valor Un.</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.unit_price || ""}
                                                        onChange={(e) => updateCartItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Subtotal</Label>
                                                    <div className="h-8 flex items-center text-sm font-medium text-emerald-500">
                                                        {formatBRL(item.quantity * item.unit_price)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 mt-1" onClick={() => removeCartItem(item.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}

                                {/* Add from inventory */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar no seu estoque..."
                                        value={productQuery}
                                        onChange={(e) => setProductQuery(e.target.value)}
                                        className="text-sm pl-9 h-10 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-colors"
                                    />
                                    {productQuery.length >= 2 && filteredInventory.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-popover border border-border/50 rounded-xl shadow-xl max-h-52 overflow-auto p-1">
                                            {filteredInventory.map((inv) => (
                                                <button
                                                    key={inv.id}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-primary/5 rounded-lg text-sm transition-colors flex items-center justify-between gap-2"
                                                    onClick={() => addCartItem(inv)}
                                                >
                                                    <div className="min-w-0">
                                                        <span className="font-medium block truncate">{inv.catalog_product?.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {inv.catalog_product?.brand?.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-bold text-emerald-500 block">{formatBRL(inv.sale_price)}</span>
                                                        <span className="text-[10px] text-muted-foreground">{inv.quantity} disp.</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <Separator />

                            {/* ==================== TOTAIS ==================== */}
                            <section className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatBRL(subtotal)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm text-muted-foreground shrink-0">Desconto</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0,00"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        className="h-8 text-sm w-28 ml-auto"
                                    />
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-emerald-500">{formatBRL(total)}</span>
                                </div>
                            </section>

                            <Separator />

                            {/* ==================== PAGAMENTO ==================== */}
                            <section className="space-y-3">
                                <Label className="text-sm font-bold">Pagamento</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Data da Venda</Label>
                                        <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Método</Label>
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_OPTIONS.map((p) => (
                                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Fiado / Parcelamento */}
                                {paymentMethod === "fiado" && (
                                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg">
                                        <p className="text-xs font-semibold text-yellow-500">Parcelamento de Boca</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Parcelas</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="24"
                                                    value={numInstallments}
                                                    onChange={(e) => setNumInstallments(parseInt(e.target.value) || 1)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Entrada</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0,00"
                                                    value={downPayment}
                                                    onChange={(e) => setDownPayment(e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">1ª Parcela</Label>
                                                <Input
                                                    type="date"
                                                    value={firstInstallmentDate}
                                                    onChange={(e) => setFirstInstallmentDate(e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Installments list */}
                                        {installments.length > 0 && (
                                            <div className="space-y-2 mt-2">
                                                <p className="text-xs text-muted-foreground">Cronograma de Parcelas</p>
                                                {parseFloat(downPayment) > 0 && (
                                                    <div className="flex justify-between text-xs bg-emerald-500/10 px-2 py-1.5 rounded">
                                                        <span className="text-emerald-400">Entrada</span>
                                                        <span className="font-medium">{formatBRL(parseFloat(downPayment))}</span>
                                                    </div>
                                                )}
                                                {installments.map((inst, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-8 shrink-0">{i + 1}ª</span>
                                                        <Input
                                                            type="date"
                                                            value={inst.due_date}
                                                            onChange={(e) => {
                                                                const updated = [...installments];
                                                                updated[i] = { ...updated[i], due_date: e.target.value };
                                                                setInstallments(updated);
                                                            }}
                                                            className="h-7 text-xs flex-1"
                                                        />
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={inst.amount_due}
                                                            onChange={(e) => {
                                                                const updated = [...installments];
                                                                updated[i] = { ...updated[i], amount_due: parseFloat(e.target.value) || 0 };
                                                                setInstallments(updated);
                                                            }}
                                                            className="h-7 text-xs w-24"
                                                        />
                                                    </div>
                                                ))}
                                                <div className={`text-xs font-semibold flex justify-between pt-1 border-t ${installmentsMatch ? "text-emerald-500" : "text-red-500"}`}>
                                                    <span>Total Parcelas</span>
                                                    <span>{formatBRL(installmentsTotal)}</span>
                                                </div>
                                                {!installmentsMatch && (
                                                    <p className="text-xs text-red-500">⚠ Total das parcelas difere do valor da venda ({formatBRL(total)})</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="border-t p-4 space-y-2">
                        <Button
                            className="w-full h-11 font-bold"
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                            ) : (
                                <>Finalizar Venda — {formatBRL(total)}</>
                            )}
                        </Button>
                        {!installmentsMatch && paymentMethod === "fiado" && (
                            <p className="text-center text-xs text-red-500">Ajuste as parcelas para fechar com o total</p>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <QuickClientDialog
                open={quickClientOpen}
                onClose={() => setQuickClientOpen(false)}
                onCreated={(c) => setSelectedClient(c as any)}
            />
        </>
    );
}
