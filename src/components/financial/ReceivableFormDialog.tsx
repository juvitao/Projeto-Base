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
import { RECEIVABLE_STATUSES } from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type Receivable = Database["public"]["Tables"]["vora_receivables"]["Row"];

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    editData?: Receivable | null;
}

export function ReceivableFormDialog({ open, onClose, onSave, editData }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientName, setClientName] = useState("");
    const [products, setProducts] = useState("");
    const [amountDue, setAmountDue] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [status, setStatus] = useState("pending");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (editData) {
            setClientName(editData.client_name);
            setProducts(editData.products ?? "");
            setAmountDue(String(editData.amount_due));
            setDueDate(editData.due_date);
            setStatus(editData.status);
            setNotes(editData.notes ?? "");
        } else {
            setClientName("");
            setProducts("");
            setAmountDue("");
            setDueDate("");
            setStatus("pending");
            setNotes("");
        }
    }, [editData, open]);

    const handleSubmit = async () => {
        if (!clientName || !amountDue || !dueDate) return;
        setIsSubmitting(true);
        try {
            await onSave({
                client_name: clientName,
                products: products || null,
                amount_due: parseFloat(amountDue),
                due_date: dueDate,
                status,
                notes: notes || null,
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
                        {editData ? "Editar" : "Novo"} Recebível
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nome do Cliente *</Label>
                        <Input
                            placeholder="Nome do cliente"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Produtos</Label>
                        <Input
                            placeholder="Ex: Batom, Hidratante..."
                            value={products}
                            onChange={(e) => setProducts(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Valor Devido (R$) *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0,00"
                                value={amountDue}
                                onChange={(e) => setAmountDue(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Vencimento *</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {editData && (
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RECEIVABLE_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                            placeholder="Notas opcionais..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
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
                        disabled={isSubmitting || !clientName || !amountDue || !dueDate}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editData ? "Salvar" : "Registrar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
