import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Edit2, Trash2, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import {
    formatBRL,
    formatDateBR,
    getStatusInfo,
    RECEIVABLE_STATUSES,
} from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type Receivable = Database["public"]["Tables"]["vora_receivables"]["Row"];

interface Props {
    receivables: Receivable[];
    isLoading: boolean;
    onEdit: (receivable: Receivable) => void;
    onDelete: (id: string) => void;
    onMarkPaid: (id: string, paymentDate?: string) => void;
}

const PAGE_SIZE = 10;

export function ReceivablesTable({ receivables, isLoading, onEdit, onDelete, onMarkPaid }: Props) {
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Payment date dialog
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [payRecvId, setPayRecvId] = useState<string | null>(null);
    const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);

    const handleOpenPayDialog = (id: string) => {
        setPayRecvId(id);
        setPayDate(new Date().toISOString().split("T")[0]);
        setPayDialogOpen(true);
    };

    const handleConfirmPay = () => {
        if (payRecvId) {
            onMarkPaid(payRecvId, payDate);
        }
        setPayDialogOpen(false);
        setPayRecvId(null);
    };

    const filtered = statusFilter === "all"
        ? receivables
        : receivables.filter((r) => r.status === statusFilter);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Filtro de status */}
            <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filtrar status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {RECEIVABLE_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                                {s.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                    {filtered.length} resultado(s)
                </span>
            </div>

            {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                    Nenhum recebível encontrado.
                </div>
            ) : (
                <div className="rounded-lg border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="hidden sm:table-cell">Produtos</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-28"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map((recv) => {
                                const statusInfo = getStatusInfo(recv.status);
                                const isOverdue = recv.status === "overdue";
                                return (
                                    <TableRow key={recv.id} className={isOverdue ? "bg-red-500/5" : ""}>
                                        <TableCell className="font-medium text-xs sm:text-sm">
                                            {recv.client_name}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                                            {recv.products || "—"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-xs sm:text-sm">
                                            {formatBRL(recv.amount_due)}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                            <span className="flex items-center gap-1">
                                                {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                                                {formatDateBR(recv.due_date)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-semibold ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 justify-end">
                                                {recv.status !== "paid" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-emerald-500"
                                                        title="Marcar como pago"
                                                        onClick={() => handleOpenPayDialog(recv.id)}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(recv)}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(recv.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{filtered.length} recebível(eis)</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                            Anterior
                        </Button>
                        <span className="flex items-center px-2">
                            {page + 1} / {totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                            Próxima
                        </Button>
                    </div>
                </div>
            )}

            {/* Payment Date Dialog */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Data do Pagamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            Informe a data em que o pagamento foi realizado:
                        </p>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase">Data</Label>
                            <Input
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                className="h-10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmPay}>Confirmar Pagamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
