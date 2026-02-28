import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    User,
    Phone,
    Mail,
    MapPin,
    ShoppingCart,
    Calendar,
    CircleDollarSign,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Loader2,
    StickyNote,
    Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financial-utils";

interface ClientDetailModalProps {
    clientId: string | null;
    onClose: () => void;
}

interface ClientFull {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    created_at?: string;
}

interface SaleDetail {
    id: string;
    sale_date: string;
    total_amount: number;
    payment_method: string;
    paid: boolean;
    items: { name: string; quantity: number; unit_price: number }[];
}

interface ReceivableDetail {
    id: string;
    sale_id: string;
    installment_number: number;
    amount_due: number;
    amount_paid: number;
    due_date: string;
    status: string;
}

const PAYMENT_LABELS: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "Pix",
    debito: "Débito",
    credito: "Crédito",
    fiado: "Fiado",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    paid: { label: "Pago", color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
    pending: { label: "Pendente", color: "text-yellow-500 bg-yellow-500/10", icon: Clock },
    overdue: { label: "Vencida", color: "text-red-500 bg-red-500/10", icon: AlertTriangle },
};

export function ClientDetailModal({ clientId, onClose }: ClientDetailModalProps) {
    const { toast } = useToast();
    const [client, setClient] = useState<ClientFull | null>(null);
    const [sales, setSales] = useState<SaleDetail[]>([]);
    const [receivables, setReceivables] = useState<ReceivableDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notes, setNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    useEffect(() => {
        if (!clientId) return;
        setIsLoading(true);

        const load = async () => {
            try {
                const { data: clientData } = await supabase
                    .from("vora_clients")
                    .select("*")
                    .eq("id", clientId)
                    .single();
                setClient(clientData);
                setNotes((clientData as any)?.notes || "");

                const { data: salesData } = await supabase
                    .from("vora_sales")
                    .select("*")
                    .eq("client_id", clientId)
                    .order("sale_date", { ascending: false });

                const salesWithItems: SaleDetail[] = [];
                for (const sale of salesData ?? []) {
                    const { data: items } = await supabase
                        .from("vora_sale_items")
                        .select("name, quantity, unit_price")
                        .eq("sale_id", sale.id);
                    salesWithItems.push({
                        id: sale.id,
                        sale_date: sale.sale_date,
                        total_amount: Number(sale.total_amount || 0),
                        payment_method: sale.payment_method || "—",
                        paid: !!sale.paid,
                        items: items ?? [],
                    });
                }
                setSales(salesWithItems);

                const saleIds = (salesData ?? []).map(s => s.id);
                if (saleIds.length > 0) {
                    const { data: recvData } = await supabase
                        .from("vora_receivables")
                        .select("*")
                        .in("sale_id", saleIds)
                        .order("due_date", { ascending: true });
                    setReceivables((recvData ?? []).map((r, idx) => ({
                        id: r.id,
                        sale_id: r.sale_id!,
                        installment_number: idx + 1,
                        amount_due: Number(r.amount_due),
                        amount_paid: Number(r.amount_paid),
                        due_date: r.due_date,
                        status: r.status || "pending",
                    })));
                } else {
                    setReceivables([]);
                }
            } catch {
                // silent
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [clientId]);

    const handleSaveNotes = async () => {
        if (!clientId) return;
        setIsSavingNotes(true);
        try {
            const { error } = await supabase
                .from("vora_clients")
                .update({ notes } as any)
                .eq("id", clientId);
            if (error) throw error;
            toast({ title: "Notas salvas!" });
        } catch (err: any) {
            toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingNotes(false);
        }
    };

    const stats = useMemo(() => {
        const totalPurchased = sales.reduce((s, sale) => s + sale.total_amount, 0);
        const totalPaid = receivables.reduce((s, r) => s + r.amount_paid, 0);
        const totalPending = receivables.filter(r => r.status === "pending" || r.status === "overdue")
            .reduce((s, r) => s + (r.amount_due - r.amount_paid), 0);
        const totalOverdue = receivables.filter(r => r.status === "overdue")
            .reduce((s, r) => s + (r.amount_due - r.amount_paid), 0);
        const paidReceivables = receivables.filter(r => r.status === "paid").length;
        const pendingReceivables = receivables.filter(r => r.status === "pending").length;
        const overdueReceivables = receivables.filter(r => r.status === "overdue").length;

        return { totalPurchased, totalPaid, totalPending, totalOverdue, paidReceivables, pendingReceivables, overdueReceivables };
    }, [sales, receivables]);

    const formatDate = (d: string) => {
        if (!d) return "—";
        const parts = d.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
    };

    return (
        <Dialog open={!!clientId} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : client ? (
                    <>
                        {/* HEADER */}
                        <DialogHeader className="p-6 pb-0">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-lg font-black uppercase tracking-tight">{client.name}</DialogTitle>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                                        {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                                        {client.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.address}</span>}
                                        {client.created_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Desde {formatDate(client.created_at.split("T")[0])}</span>}
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* KPIs */}
                        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <MiniKPI label="Total Comprado" value={formatBRL(stats.totalPurchased)} />
                            <MiniKPI label="Total Pago" value={formatBRL(stats.totalPaid)} color="text-emerald-500" />
                            <MiniKPI label="Pendente" value={formatBRL(stats.totalPending)} color="text-yellow-500" />
                            <MiniKPI label="Vencido" value={formatBRL(stats.totalOverdue)} color="text-red-500" />
                        </div>

                        <Separator />

                        {/* SCROLLABLE CONTENT */}
                        <ScrollArea className="flex-1 max-h-[55vh]">
                            <div className="p-6 space-y-6">

                                {/* NOTES */}
                                <section>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <StickyNote className="w-3.5 h-3.5" /> Notas do Cliente
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1.5"
                                            onClick={handleSaveNotes}
                                            disabled={isSavingNotes}
                                        >
                                            {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Salvar
                                        </Button>
                                    </div>
                                    <Textarea
                                        placeholder="Adicione observações, preferências, informações úteis sobre o cliente..."
                                        className="min-h-[80px] text-sm resize-none bg-muted/30 border-border/50 rounded-xl"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </section>

                                <Separator />

                                {/* SALES */}
                                <section>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                        <ShoppingCart className="w-3.5 h-3.5" /> Vendas ({sales.length})
                                    </h3>
                                    {sales.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4">Nenhuma venda registrada.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {sales.map((sale) => (
                                                <div key={sale.id} className="border rounded-xl p-3 space-y-2 hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-xs font-medium">{formatDate(sale.sale_date)}</span>
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                                                {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                                                            </Badge>
                                                            {sale.paid && (
                                                                <Badge className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                                                    Pago
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-black text-emerald-500">{formatBRL(sale.total_amount)}</span>
                                                    </div>
                                                    {sale.items.length > 0 && (
                                                        <div className="space-y-0.5 pl-5">
                                                            {sale.items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                                                                    <span>{item.quantity}× {item.name}</span>
                                                                    <span>{formatBRL(item.quantity * item.unit_price)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* RECEIVABLES */}
                                {receivables.length > 0 && (
                                    <>
                                        <Separator />
                                        <section>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                <CircleDollarSign className="w-3.5 h-3.5" /> Parcelas ({receivables.length})
                                            </h3>
                                            <div className="space-y-1.5">
                                                {receivables.map((recv) => {
                                                    const cfg = STATUS_CONFIG[recv.status] ?? STATUS_CONFIG.pending;
                                                    const Icon = cfg.icon;
                                                    const remaining = recv.amount_due - recv.amount_paid;
                                                    return (
                                                        <div key={recv.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color.split(" ")[0]}`} />
                                                                <div>
                                                                    <p className="text-xs font-medium">Parcela {recv.installment_number}</p>
                                                                    <p className="text-[10px] text-muted-foreground">Vence: {formatDate(recv.due_date)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-xs font-bold">{formatBRL(recv.amount_due)}</p>
                                                                {recv.status === "paid" ? (
                                                                    <span className="text-[9px] text-emerald-500 font-bold">Pago ✓</span>
                                                                ) : (
                                                                    <p className="text-[10px] text-muted-foreground">Resta: {formatBRL(remaining)}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Summary */}
                                            <div className="mt-3 border rounded-xl p-3 bg-muted/30 space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Pagas</span>
                                                    <span className="font-bold text-emerald-500">{stats.paidReceivables}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Pendentes</span>
                                                    <span className="font-bold text-yellow-500">{stats.pendingReceivables}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Vencidas</span>
                                                    <span className="font-bold text-red-500">{stats.overdueReceivables}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-bold">Total a receber</span>
                                                    <span className="font-black text-primary">{formatBRL(stats.totalPending)}</span>
                                                </div>
                                            </div>
                                        </section>
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </>
                ) : (
                    <div className="p-6 text-center text-muted-foreground">Cliente não encontrado.</div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function MiniKPI({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="border rounded-lg p-2.5 text-center">
            <p className="text-[9px] font-bold uppercase text-muted-foreground leading-tight">{label}</p>
            <p className={`text-base font-black mt-0.5 ${color ?? "text-foreground"}`}>{value}</p>
        </div>
    );
}
