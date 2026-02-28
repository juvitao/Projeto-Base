import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
    PAYMENT_METHODS,
    INCOME_CATEGORIES,
    EXPENSE_CATEGORIES,
    DEFAULT_CARD_FEES,
    calculateNetAmount,
    formatBRL,
} from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type FinancialEntry = Database["public"]["Tables"]["vora_financial_entries"]["Row"];

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    type: "income" | "expense";
    editData?: FinancialEntry | null;
}

export function EntryFormDialog({ open, onClose, onSave, type, editData }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

    const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const feePercent = type === "income" ? (DEFAULT_CARD_FEES[paymentMethod] ?? 0) : 0;
    const numericAmount = parseFloat(amount) || 0;
    const netAmount = calculateNetAmount(numericAmount, feePercent);

    useEffect(() => {
        if (editData) {
            setAmount(String(editData.amount));
            setCategory(editData.category);
            setDescription(editData.description ?? "");
            setPaymentMethod(editData.payment_method ?? "dinheiro");
            setEntryDate(editData.entry_date);
        } else {
            setAmount("");
            setCategory("");
            setDescription("");
            setPaymentMethod("dinheiro");
            setEntryDate(new Date().toISOString().split("T")[0]);
        }
    }, [editData, open]);

    const handleSubmit = async () => {
        if (!amount || !category) return;
        setIsSubmitting(true);
        try {
            await onSave({
                type,
                amount: numericAmount,
                category,
                description: description || null,
                payment_method: type === "income" ? paymentMethod : null,
                card_fee_percent: feePercent,
                entry_date: entryDate,
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {editData ? "Editar" : "Nova"} {type === "income" ? "Receita" : "Despesa"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Valor */}
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0,00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    {/* Categoria */}
                    <div className="space-y-2">
                        <Label>Categoria *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Forma de Pagamento (só para receitas) */}
                    {type === "income" && (
                        <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                            {DEFAULT_CARD_FEES[p.value] > 0 && (
                                                <span className="text-muted-foreground ml-1">
                                                    ({DEFAULT_CARD_FEES[p.value]}%)
                                                </span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {feePercent > 0 && numericAmount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Taxa: {feePercent}% → Líquido: <span className="font-semibold text-emerald-500">{formatBRL(netAmount)}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Data */}
                    <div className="space-y-2">
                        <Label>Data</Label>
                        <Input
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                            placeholder="Descrição opcional..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !amount || !category}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editData ? "Salvar" : "Registrar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
