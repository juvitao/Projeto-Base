import { useState, useMemo, useEffect } from "react";
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
import { Loader2, History, CheckCircle2, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financial-utils";

interface Props {
    open: boolean;
    onClose: () => void;
    onImported: () => void;
}

interface GeneratedInstallment {
    amount: number;
    dueDate: string;
    status: "pending" | "overdue";
}

export function LegacyDebtImportDialog({ open, onClose, onImported }: Props) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<number | null>(null);

    // Form
    const [clientName, setClientName] = useState("");
    const [products, setProducts] = useState("");
    const [totalDebt, setTotalDebt] = useState("");
    const [alreadyPaid, setAlreadyPaid] = useState("");
    const [numInstallments, setNumInstallments] = useState("2");
    const [nextDueDate, setNextDueDate] = useState("");
    const [notes, setNotes] = useState("");

    // Reset on open
    useEffect(() => {
        if (open) {
            setClientName("");
            setProducts("");
            setTotalDebt("");
            setAlreadyPaid("");
            setNumInstallments("2");
            setNextDueDate("");
            setNotes("");
            setResult(null);
        }
    }, [open]);

    // Generate preview
    const preview = useMemo((): GeneratedInstallment[] => {
        const total = parseFloat(totalDebt) || 0;
        const paid = parseFloat(alreadyPaid) || 0;
        const n = parseInt(numInstallments) || 1;
        const remaining = Math.max(0, total - paid);

        if (remaining <= 0 || !nextDueDate || n < 1) return [];

        const perInstallment = Math.round((remaining / n) * 100) / 100;
        const today = new Date().toISOString().split("T")[0];
        const installments: GeneratedInstallment[] = [];

        for (let i = 0; i < n; i++) {
            const date = new Date(nextDueDate + "T12:00:00");
            date.setDate(date.getDate() + i * 30);
            const dateStr = date.toISOString().split("T")[0];
            const isLast = i === n - 1;
            const amount = isLast ? remaining - perInstallment * (n - 1) : perInstallment;

            installments.push({
                amount: Math.round(amount * 100) / 100,
                dueDate: dateStr,
                status: dateStr < today ? "overdue" : "pending",
            });
        }

        return installments;
    }, [totalDebt, alreadyPaid, numInstallments, nextDueDate]);

    const remaining = Math.max(0, (parseFloat(totalDebt) || 0) - (parseFloat(alreadyPaid) || 0));
    const canSubmit = clientName.trim().length >= 2 && remaining > 0 && preview.length > 0 && user;

    const handleImport = async () => {
        if (!canSubmit || !user) return;
        setIsImporting(true);
        try {
            const rows = preview.map(inst => ({
                user_id: user.id,
                client_name: clientName.trim(),
                products: products || null,
                amount_due: inst.amount,
                amount_paid: 0,
                due_date: inst.dueDate,
                status: inst.status,
                notes: notes ? `[Migração] ${notes}` : "[Migração] Dívida antiga importada",
            }));

            const { error } = await supabase.from("vora_receivables").insert(rows);
            if (error) throw error;

            setResult(rows.length);
            toast({ title: `${rows.length} parcelas importadas para ${clientName}!` });
            onImported();
        } catch (err: any) {
            toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" /> Importar Dívida Antiga
                    </DialogTitle>
                </DialogHeader>

                {result !== null ? (
                    <div className="py-8 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                        <p className="text-lg font-bold">{result} parcelas importadas!</p>
                        <p className="text-sm text-muted-foreground">
                            Cliente: {clientName} • Saldo: {formatBRL(remaining)}
                        </p>
                        <Button onClick={handleClose} className="mt-4">Fechar</Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                            <p className="text-xs text-muted-foreground">
                                Registre uma venda antiga que ainda está sendo paga parcelado. O sistema gera as parcelas automaticamente.
                            </p>

                            {/* Client + Products */}
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase">Cliente *</Label>
                                    <Input
                                        placeholder="Nome do cliente"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase">Produtos</Label>
                                    <Input
                                        placeholder="Ex: Kit Natura, Hidratante..."
                                        value={products}
                                        onChange={e => setProducts(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Values */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase">Valor Total da Dívida (R$) *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="300.00"
                                        value={totalDebt}
                                        onChange={e => setTotalDebt(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase">Já Pago (R$)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="100.00"
                                        value={alreadyPaid}
                                        onChange={e => setAlreadyPaid(e.target.value)}
                                    />
                                </div>
                            </div>

                            {remaining > 0 && (
                                <div className="text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Saldo restante: {formatBRL(remaining)}
                                </div>
                            )}

                            {/* Installments */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase">Parcelas Restantes *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="24"
                                        value={numInstallments}
                                        onChange={e => setNumInstallments(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase">Próximo Vencimento *</Label>
                                    <Input
                                        type="date"
                                        value={nextDueDate}
                                        onChange={e => setNextDueDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase">Observações</Label>
                                <Textarea
                                    placeholder="Ex: Venda feita em janeiro, faltam 4 parcelas..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            {/* Preview */}
                            {preview.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-muted/50 px-3 py-2 border-b">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Parcelas que serão criadas
                                        </p>
                                    </div>
                                    <div className="divide-y">
                                        {preview.map((inst, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-muted-foreground w-5">{i + 1}.</span>
                                                    <span>{inst.dueDate}</span>
                                                    {inst.status === "overdue" && (
                                                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                            VENCIDA
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-bold">{formatBRL(inst.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                                Cancelar
                            </Button>
                            <Button onClick={handleImport} disabled={isImporting || !canSubmit} className="gap-1.5">
                                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                                Importar {preview.length} parcela{preview.length !== 1 ? "s" : ""}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
