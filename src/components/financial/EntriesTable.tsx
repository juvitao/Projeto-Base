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
import { Edit2, Trash2, Loader2 } from "lucide-react";
import {
    formatBRL,
    formatDateBR,
    getCategoryLabel,
    getPaymentLabel,
} from "@/lib/financial-utils";
import type { Database } from "@/integrations/supabase/types";

type FinancialEntry = Database["public"]["Tables"]["vora_financial_entries"]["Row"];

interface Props {
    entries: FinancialEntry[];
    isLoading: boolean;
    type: "income" | "expense";
    onEdit: (entry: FinancialEntry) => void;
    onDelete: (id: string) => void;
}

const PAGE_SIZE = 10;

export function EntriesTable({ entries, isLoading, type, onEdit, onDelete }: Props) {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(entries.length / PAGE_SIZE);
    const paginated = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhum lançamento registrado.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-lg border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                            {type === "income" && <TableHead className="hidden sm:table-cell">Pagamento</TableHead>}
                            <TableHead className="text-right">Valor</TableHead>
                            {type === "income" && <TableHead className="text-right hidden sm:table-cell">Líquido</TableHead>}
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    {formatDateBR(entry.entry_date)}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                    {getCategoryLabel(entry.category)}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                                    {entry.description || "—"}
                                </TableCell>
                                {type === "income" && (
                                    <TableCell className="hidden sm:table-cell text-xs">
                                        {getPaymentLabel(entry.payment_method ?? "")}
                                        {entry.card_fee_percent > 0 && (
                                            <span className="text-muted-foreground ml-1">({entry.card_fee_percent}%)</span>
                                        )}
                                    </TableCell>
                                )}
                                <TableCell className="text-right font-medium text-xs sm:text-sm">
                                    {formatBRL(entry.amount)}
                                </TableCell>
                                {type === "income" && (
                                    <TableCell className="text-right hidden sm:table-cell text-xs text-emerald-500 font-medium">
                                        {formatBRL(entry.net_amount ?? entry.amount)}
                                    </TableCell>
                                )}
                                <TableCell>
                                    <div className="flex gap-1 justify-end">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(entry.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{entries.length} lançamento(s)</span>
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
        </div>
    );
}
