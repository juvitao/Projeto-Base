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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/financial-utils";
import type { SaleWithDetails } from "@/hooks/useSales";

interface Props {
    sales: SaleWithDetails[];
    isLoading: boolean;
    onDelete: (id: string) => void;
}

const PAGE_SIZE = 10;

function PaymentBadge({ method }: { method: string }) {
    const colors: Record<string, string> = {
        dinheiro: "bg-emerald-500/20 text-emerald-400",
        pix: "bg-cyan-500/20 text-cyan-400",
        debito: "bg-blue-500/20 text-blue-400",
        credito: "bg-purple-500/20 text-purple-400",
        fiado: "bg-red-500/20 text-red-400",
    };
    const labels: Record<string, string> = {
        dinheiro: "Dinheiro",
        pix: "Pix",
        debito: "Débito",
        credito: "Crédito",
        fiado: "Fiado",
    };
    const key = method?.startsWith("credito") ? "credito" : method;
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[key] ?? "bg-muted text-muted-foreground"}`}>
            {labels[key] ?? method}
        </span>
    );
}

function SaleRow({ sale, onDelete }: { sale: SaleWithDetails; onDelete: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const total = sale.total_amount ?? sale.items?.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) ?? 0;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setOpen(!open)}>
                <TableCell className="w-8">
                    <CollapsibleTrigger asChild>
                        <button className="p-0.5">
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </CollapsibleTrigger>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">#{sale.display_id}</TableCell>
                <TableCell className="text-xs sm:text-sm font-medium">{sale.client?.name ?? "Avulso"}</TableCell>
                <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatDateBR(sale.sale_date)}</TableCell>
                <TableCell><PaymentBadge method={sale.payment_method} /></TableCell>
                <TableCell className="text-right font-bold text-xs sm:text-sm">{formatBRL(total)}</TableCell>
                <TableCell>
                    <span className={`text-xs font-semibold ${sale.paid ? "text-emerald-500" : "text-yellow-500"}`}>
                        {sale.paid ? "Pago" : "Pendente"}
                    </span>
                </TableCell>
                <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(sale.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </TableCell>
            </TableRow>
            <CollapsibleContent asChild>
                <tr>
                    <td colSpan={8} className="p-0">
                        <div className="px-6 py-3 bg-muted/30 border-b">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Itens da Venda</p>
                            <div className="space-y-1">
                                {sale.items?.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span className="font-medium">{formatBRL(item.quantity * item.unit_price)}</span>
                                    </div>
                                ))}
                                {sale.discount > 0 && (
                                    <div className="flex items-center justify-between text-xs text-red-400 border-t mt-2 pt-1">
                                        <span>Desconto</span>
                                        <span>-{formatBRL(sale.discount)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function SalesTable({ sales, isLoading, onDelete }: Props) {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(sales.length / PAGE_SIZE);
    const paginated = sales.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (sales.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhuma venda registrada.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-lg border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((sale) => (
                            <SaleRow key={sale.id} sale={sale} onDelete={onDelete} />
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{sales.length} venda(s)</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                        <span className="flex items-center px-2">{page + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
