import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Trash2,
    Archive,
    Save,
    Phone,
    Mail,
    MapPin,
    Calendar as CalendarIcon,
    Package,
    Check,
    X,
    CreditCard,
    Plus,
    Edit2,
    ChevronDown,
    ChevronUp,
    ShoppingCart,
    Layers,
    Banknote,
    Percent,
    CircleDollarSign,
    Loader2,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// --- Types ---

interface Product {
    id: string;
    name: string;
    unit_price: number;
    stock_quantity: number;
}

interface SaleItem {
    id: string;
    product_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    needs_ordering: boolean;
}

interface Sale {
    id: string;
    display_id: number;
    sale_date: string;
    installments: number;
    first_installment_date: string | null;
    discount: number;
    paid: boolean;
    items: SaleItem[];
    isCollapsed?: boolean;
}

interface Payment {
    id: string;
    payment_date: string;
    amount: number;
    method: string;
}

// --- Main Component ---

const ClientDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();

    const [client, setClient] = useState<any>(null);
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [historyCollapsed, setHistoryCollapsed] = useState(false);

    // Modals state
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    // Forms
    const [paymentForm, setPaymentForm] = useState({ date: new Date().toISOString().split('T')[0], amount: "", method: "PIX" });
    const [saleForm, setSaleForm] = useState({
        id: "",
        date: new Date().toISOString().split('T')[0],
        firstDate: new Date().toISOString().split('T')[0],
        installments: "1",
        discount: "0",
        items: [{ id: Math.random().toString(), product_id: null as string | null, name: "", quantity: "1", unit_price: "", needs_ordering: false }]
    });

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: clientData, error: clientErr } = await supabase.from("vora_clients").select("*").eq("id", id).single();
            if (clientErr) throw clientErr;
            setClient(clientData);

            const { data: salesData } = await supabase.from("vora_sales").select("*, items:vora_sale_items(*)").eq("client_id", id).order("sale_date", { ascending: false });
            setSales(salesData?.map(s => ({ ...s, isCollapsed: true })) || []);

            const { data: paymentsData } = await supabase.from("vora_payments").select("*").eq("client_id", id).order("payment_date", { ascending: false });
            setPayments(paymentsData || []);

            const { data: productsData } = await supabase.from("vora_products").select("*").order("name");
            setProducts(productsData || []);
        } catch (err: any) {
            toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Calculations ---
    const totalSalesAmount = sales.reduce((sum, s) => sum + (s.items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0) - s.discount), 0);
    const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDebt = sales.reduce((sum, s) => s.paid ? sum : sum + (s.items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0) - s.discount), 0) - totalPaidAmount;

    // --- Actions ---
    const toggleSaleCollapse = (saleId: string) => setSales(prev => prev.map(s => s.id === saleId ? { ...s, isCollapsed: !s.isCollapsed } : s));

    const handleUpdateClient = async () => {
        const { error } = await supabase.from("vora_clients").update({
            name: client.name,
            phone: client.phone,
            email: client.email,
            address: client.address
        }).eq("id", id);

        if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        else {
            toast({ title: "Cadastro atualizado!" });
            setIsEditingHeader(false);
        }
    };

    const addPayment = async () => {
        const val = parseFloat(paymentForm.amount.replace(',', '.'));
        if (isNaN(val)) return;
        const { error } = await supabase.from("vora_payments").insert([{ client_id: id, amount: val, method: paymentForm.method, payment_date: new Date(paymentForm.date + "T12:00:00Z").toISOString() }]);
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        else {
            toast({ title: "Pagamento registrado!" });
            setIsPaymentDialogOpen(false);
            setPaymentForm({ date: new Date().toISOString().split('T')[0], amount: "", method: "PIX" });
            fetchData();
        }
    };

    const saveSale = async () => {
        const base = {
            client_id: id,
            sale_date: new Date(saleForm.date + "T12:00:00Z").toISOString(),
            installments: parseInt(saleForm.installments) || 1,
            first_installment_date: new Date(saleForm.firstDate + "T12:00:00Z").toISOString(),
            discount: parseFloat(saleForm.discount.replace(',', '.')) || 0,
            paid: editingSale?.paid || false
        };

        let sId = editingSale?.id;
        if (editingSale) {
            await supabase.from("vora_sales").update(base).eq("id", sId);
            await supabase.from("vora_sale_items").delete().eq("sale_id", sId);
        } else {
            const { data } = await supabase.from("vora_sales").insert([base]).select().single();
            sId = data.id;
        }

        for (const item of saleForm.items) {
            const qty = parseInt(item.quantity) || 1;
            const price = parseFloat(item.unit_price.toString().replace(',', '.')) || 0;
            await supabase.from("vora_sale_items").insert([{ sale_id: sId, product_id: item.product_id, name: item.name, quantity: qty, unit_price: price, needs_ordering: item.needs_ordering }]);

            if (item.product_id && !item.needs_ordering && !editingSale) {
                const p = products.find(prod => prod.id === item.product_id);
                if (p) await supabase.from("vora_products").update({ stock_quantity: p.stock_quantity - qty }).eq("id", p.id);
            }
        }
        setIsSaleDialogOpen(false);
        fetchData();
        toast({ title: "Venda salva!" });
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

    if (!client) return (
        <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background">
            <AlertCircle className="w-16 h-16 text-destructive opacity-50" />
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Cliente não encontrado</h2>
                <p className="text-muted-foreground font-medium">Os dados deste cliente podem ter sido removidos ou o link é inválido.</p>
            </div>
            <Button onClick={() => navigate("/clients")} variant="outline" className="font-black uppercase text-xs h-12 px-8">Voltar para a Lista</Button>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-20 mt-8">
            <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1" />
                <span className="text-sm font-black uppercase tracking-tight">Voltar</span>
            </button>

            {/* Header */}
            <div className="bg-card border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center text-5xl border-4 border-white/5 shadow-inner">
                            {client.gender === "male" ? "👨" : "👩"}
                        </div>
                        <div className="space-y-2">
                            {isEditingHeader ? (
                                <Input value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} className="text-4xl font-black h-14 bg-background/50" />
                            ) : (
                                <h1 className="text-4xl font-black tracking-tighter uppercase">{client.name}</h1>
                            )}
                            <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Desde {new Date(client.created_at || client.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isEditingHeader ? (
                            <Button size="sm" onClick={handleUpdateClient} className="font-black uppercase text-xs h-10 px-6"><Save className="w-4 h-4 mr-2" /> Salvar</Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setIsEditingHeader(true)} className="font-black uppercase text-xs h-10 px-5 border-white/10"><Edit2 className="w-4 h-4 mr-2" /> Editar</Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Phone className="w-3 h-3" /> Telefone</Label>
                        {isEditingHeader ? <Input value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} className="h-10 bg-background/50 border-white/5" /> : <p className="font-black text-base">{client.phone}</p>}
                    </div>
                    <div className="space-y-1 border-l border-white/5 pl-10">
                        <Label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Mail className="w-3 h-3" /> Email</Label>
                        {isEditingHeader ? <Input value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} className="h-10 bg-background/50 border-white/5" /> : <p className="font-black text-base truncate">{client.email || '—'}</p>}
                    </div>
                    <div className="space-y-1 border-l border-white/5 pl-10">
                        <Label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3" /> Endereço</Label>
                        {isEditingHeader ? <Input value={client.address} onChange={e => setClient({ ...client, address: e.target.value })} className="h-10 bg-background/50 border-white/5" /> : <p className="font-black text-base truncate">{client.address || '—'}</p>}
                    </div>
                </div>

                <div className="pt-10 mt-10 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-12 bg-white/[0.02] -mx-8 -mb-8 px-8 py-8">
                    <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Total Vendas</p>
                        <p className="text-2xl font-black tracking-tighter">R$ {totalSalesAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-emerald-500 uppercase opacity-60">Total Pago</p>
                        <p className="text-2xl font-black tracking-tighter text-emerald-500">R$ {totalPaidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-destructive uppercase opacity-60">Em Aberto</p>
                        <div className="flex items-center gap-3">
                            <span className={cn("text-3xl font-black tracking-tighter", remainingDebt > 0 ? "text-destructive italic" : "text-emerald-400")}>
                                R$ {remainingDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                            {remainingDebt > 0 && <Badge className="bg-destructive text-[8px] font-black animate-pulse">PENDENTE</Badge>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Section */}
            <div className="flex items-center justify-between sticky top-0 z-40 py-6 bg-background/95 backdrop-blur-xl border-b border-white/5 px-2">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><ShoppingCart className="w-7 h-7 text-primary" /> Vendas</h2>
                <div className="flex gap-3">
                    <Button onClick={() => setIsSaleDialogOpen(true)} className="font-black uppercase text-xs h-12 px-8 gap-2 shadow-xl shadow-primary/20"><Plus className="w-5 h-5" /> Nova Venda</Button>
                    <Button variant="outline" onClick={() => setIsPaymentDialogOpen(true)} className="font-black uppercase text-xs h-12 px-8 gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 shadow-xl shadow-emerald-500/5"><Banknote className="w-5 h-5" /> Pagar</Button>
                </div>
            </div>

            <div className="space-y-6">
                {sales.map(s => (
                    <div key={s.id} className="bg-card border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl hover:border-primary/30 transition-all">
                        <div className={cn("flex items-center justify-between p-6 cursor-pointer", !s.isCollapsed && "bg-white/[0.05] border-b border-white/10")} onClick={() => toggleSaleCollapse(s.id)}>
                            <div className="flex items-center gap-6">
                                <div className={cn("w-2.5 h-2.5 rounded-full", s.paid ? "bg-emerald-500" : "bg-destructive animate-pulse")} />
                                <div className="grid grid-cols-4 gap-12 items-center">
                                    <div><p className="text-[8px] font-black opacity-40 uppercase">Cód</p><p className="text-xs font-black text-primary">#{s.display_id || s.id.substr(0, 5).toUpperCase()}</p></div>
                                    <div><p className="text-[8px] font-black opacity-40 uppercase">Data</p><p className="text-xs font-bold">{new Date(s.sale_date).toLocaleDateString("pt-BR")}</p></div>
                                    <div><p className="text-[8px] font-black opacity-40 uppercase">A Pagar</p><p className="text-base font-black italic">R$ {(s.items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0) - s.discount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                                    <div><p className="text-[8px] font-black opacity-40 uppercase">Liquidado</p><Switch checked={s.paid} onCheckedChange={async (v) => {
                                        await supabase.from("vora_sales").update({ paid: v }).eq("id", s.id);
                                        fetchData();
                                    }} onClick={e => e.stopPropagation()} className="scale-75 data-[state=checked]:bg-emerald-500" /></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={e => {
                                    e.stopPropagation(); setEditingSale(s); setSaleForm({
                                        id: s.id,
                                        date: s.sale_date.split('T')[0],
                                        firstDate: s.first_installment_date ? s.first_installment_date.split('T')[0] : s.sale_date.split('T')[0],
                                        installments: s.installments.toString(),
                                        discount: s.discount.toString(),
                                        items: s.items.map(i => ({ id: i.id, product_id: i.product_id, name: i.name, quantity: i.quantity.toString(), unit_price: i.unit_price.toString(), needs_ordering: i.needs_ordering }))
                                    }); setIsSaleDialogOpen(true);
                                }} className="h-8 w-8 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></Button>
                                {s.isCollapsed ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-primary" />}
                            </div>
                        </div>
                        {!s.isCollapsed && (
                            <div className="p-8 bg-black/20 space-y-4">
                                {s.items.map(i => (
                                    <div key={i.id} className="flex justify-between items-center py-2 px-6 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                        <div><p className="text-[10px] font-black opacity-40">ITEM</p><p className="text-xs font-black uppercase">{i.name}</p></div>
                                        <div className="flex gap-12 text-right">
                                            <div><p className="text-[10px] font-black opacity-40">QTD</p><p className="text-xs font-black italic">{i.quantity}x</p></div>
                                            <div><p className="text-[10px] font-black opacity-40">SUBTOTAL</p><p className="text-sm font-black text-primary">R$ {(i.unit_price * i.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                                        </div>
                                    </div>
                                ))}
                                {s.discount > 0 && <div className="text-right pr-6"><p className="text-[10px] font-black text-destructive uppercase">Desconto: - R$ {s.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Payments List */}
            <div className="mt-20 space-y-6">
                <div onClick={() => setHistoryCollapsed(!historyCollapsed)} className="flex items-center justify-between group cursor-pointer border-l-4 border-emerald-500 pl-6 py-2">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><CreditCard className="w-8 h-8 text-emerald-500" /> Recebimentos</h2>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Aportes financeiros realizados</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black px-4">{payments.length} Registros</Badge>
                        {historyCollapsed ? <ChevronDown /> : <ChevronUp />}
                    </div>
                </div>
                {!historyCollapsed && (
                    <div className="bg-card border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <table className="w-full text-sm">
                            <thead className="bg-emerald-500/[0.02] border-b border-white/5">
                                <tr>
                                    <th className="text-left py-6 px-12 text-[10px] font-black uppercase opacity-40 tracking-widest">Data</th>
                                    <th className="text-left py-6 px-12 text-[10px] font-black uppercase opacity-40 tracking-widest">Método</th>
                                    <th className="text-right py-6 px-12 text-[10px] font-black uppercase opacity-40 tracking-widest">Valor</th>
                                    <th className="w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {payments.map(p => (
                                    <tr key={p.id} className="hover:bg-white/[0.01]">
                                        <td className="py-6 px-12 font-black">{new Date(p.payment_date || (p as any).date).toLocaleDateString("pt-BR")}</td>
                                        <td className="py-6 px-12"><Badge variant="outline" className="text-emerald-400 border-emerald-400/30 uppercase">{p.method}</Badge></td>
                                        <td className="py-6 px-12 text-right font-black italic text-xl text-emerald-500">R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                        <td className="py-6 px-12 text-right"><Button variant="ghost" size="icon" onClick={async () => {
                                            await supabase.from("vora_payments").delete().eq("id", p.id);
                                            fetchData();
                                        }} className="text-muted-foreground hover:text-destructive"><X className="w-5 h-5" /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sale Modal */}
            <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto bg-card border-white/20 rounded-[2rem] shadow-2xl">
                    <DialogHeader className="border-b border-white/10 pb-6 mb-6">
                        <DialogTitle className="text-2xl font-black uppercase flex items-center gap-3"><ShoppingCart className="w-7 h-7 text-primary" /> {editingSale ? "Editar Venda" : "Nova Venda"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-8 py-2">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Data Compra</Label>
                                <Input type="date" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} className="h-12 bg-white/5 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Parcelas</Label>
                                <Input type="number" value={saleForm.installments} onChange={e => setSaleForm({ ...saleForm, installments: e.target.value })} className="h-12 bg-white/5 font-bold" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Data 1ª Parcela</Label>
                                <Input type="date" value={saleForm.firstDate} onChange={e => setSaleForm({ ...saleForm, firstDate: e.target.value })} className="h-12 bg-white/5 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-destructive">Desconto (R$)</Label>
                                <Input value={saleForm.discount} onChange={e => setSaleForm({ ...saleForm, discount: e.target.value })} className="h-12 bg-white/5 font-black text-destructive" />
                            </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Package className="w-4 h-4" /> Itens</Label>
                                <Button variant="outline" size="sm" onClick={() => setSaleForm({ ...saleForm, items: [...saleForm.items, { id: Math.random().toString(), product_id: null, name: "", quantity: "1", unit_price: "", needs_ordering: false }] })} className="h-8 border-primary/30 text-primary uppercase text-[10px] font-black"><Plus className="w-3 h-3 mr-2" /> Adicionar</Button>
                            </div>
                            <div className="space-y-4">
                                {saleForm.items.map((item, idx) => {
                                    const selectedProduct = products.find(p => p.id === item.product_id);
                                    const outOfStock = selectedProduct && selectedProduct.stock_quantity < (parseInt(item.quantity) || 0);

                                    return (
                                        <div key={item.id} className="grid grid-cols-[1fr_80px_110px_auto] gap-3 items-end p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="space-y-2">
                                                <Label className="text-[8px] font-bold opacity-40 uppercase">Produto / Nome</Label>
                                                <div className="flex flex-col gap-2">
                                                    <Select value={item.product_id || "manual"} onValueChange={v => {
                                                        const newItems = [...saleForm.items];
                                                        if (v === "manual") {
                                                            newItems[idx] = { ...newItems[idx], product_id: null, name: "" };
                                                        } else {
                                                            const p = products.find(prod => prod.id === v);
                                                            if (p) newItems[idx] = { ...newItems[idx], product_id: v, name: p.name, unit_price: p.unit_price.toString() };
                                                        }
                                                        setSaleForm({ ...saleForm, items: newItems });
                                                    }}>
                                                        <SelectTrigger className="h-11 bg-background/50 text-[11px] font-black uppercase transition-all">
                                                            <SelectValue placeholder="Selecione ou clique + para manual" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-60">
                                                            <SelectItem value="manual" className="font-bold text-primary">--- DIGITAR MANUALMENTE ---</SelectItem>
                                                            {products.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    <div className="flex justify-between w-full gap-4">
                                                                        <span>{p.name.toUpperCase()}</span>
                                                                        <span className={cn("text-[9px] px-1.5 rounded", p.stock_quantity > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive")}>ESTOQUE: {p.stock_quantity}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {item.product_id === null && (
                                                        <Input placeholder="Descreva o produto..." className="h-10 text-[11px] font-black tracking-tight" value={item.name} onChange={e => {
                                                            const newItems = [...saleForm.items];
                                                            newItems[idx].name = e.target.value;
                                                            setSaleForm({ ...saleForm, items: newItems });
                                                        }} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-center">
                                                <Label className="text-[8px] font-bold opacity-40 uppercase">Qtd</Label>
                                                <Input value={item.quantity} onChange={e => {
                                                    const newItems = [...saleForm.items];
                                                    newItems[idx].quantity = e.target.value;
                                                    setSaleForm({ ...saleForm, items: newItems });
                                                }} className="h-11 text-center font-black" />
                                            </div>
                                            <div className="space-y-2 text-right">
                                                <Label className="text-[8px] font-bold opacity-40 uppercase">Unitário</Label>
                                                <Input value={item.unit_price} onChange={e => {
                                                    const newItems = [...saleForm.items];
                                                    newItems[idx].unit_price = e.target.value;
                                                    setSaleForm({ ...saleForm, items: newItems });
                                                }} className="h-11 text-right font-black" />
                                            </div>
                                            <div className="flex gap-1 h-11 items-center">
                                                <Button variant="ghost" size="icon" onClick={() => setSaleForm({ ...saleForm, items: saleForm.items.filter(i => i.id !== item.id) })} className="text-destructive h-11 w-11 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                                            </div>

                                            {outOfStock && (
                                                <div className="col-span-4 mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-tighter">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span>Estoque insuficiente ({selectedProduct.stock_quantity} disp.)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch checked={item.needs_ordering} onCheckedChange={v => {
                                                            const newItems = [...saleForm.items];
                                                            newItems[idx].needs_ordering = v;
                                                            setSaleForm({ ...saleForm, items: newItems });
                                                        }} className="scale-75 data-[state=checked]:bg-amber-500" />
                                                        <span className="text-[9px] font-black text-amber-500 uppercase">Encomendar?</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-8 border-t border-white/10 -mx-6 px-6 -mb-6 bg-white/[0.02]">
                        <Button onClick={saveSale} className="w-full font-black uppercase text-sm h-14 shadow-2xl shadow-primary/30 tracking-widest">Salvar Venda</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-white/20 rounded-[2rem] shadow-2xl">
                    <DialogHeader className="border-b border-white/10 pb-6"><DialogTitle className="text-2xl font-black uppercase flex items-center gap-3"><CircleDollarSign className="w-7 h-7 text-emerald-500" /> Abater Débito</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Valor Recebido (R$)</Label>
                            <Input className="h-16 text-4xl font-black italic tracking-tighter bg-emerald-500/[0.03] border-emerald-500/10 focus:border-emerald-500/30 text-emerald-500" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Método</Label><Select value={paymentForm.method} onValueChange={v => setPaymentForm({ ...paymentForm, method: v })}><SelectTrigger className="h-12 font-black uppercase text-xs bg-white/5 border-white/10 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent className="rounded-2xl border-white/10 font-bold uppercase text-xs"><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Crédito">Crédito</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Data</Label><Input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} className="h-12 bg-white/5 border-white/10 font-bold rounded-2xl" /></div>
                        </div>
                    </div>
                    <DialogFooter className="bg-emerald-500/[0.02] border-t border-white/10 pt-6 -mx-6 px-6 -mb-6"><Button onClick={addPayment} className="w-full font-black uppercase text-xs h-14 bg-emerald-600 hover:bg-emerald-700 tracking-widest">Confirmar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClientDetails;
