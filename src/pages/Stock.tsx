import { useState } from "react";
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";

import { useInventory, useBrands, type InventoryWithProduct } from "@/hooks/useInventory";
import { AddToInventoryDialog } from "@/components/stock/AddToInventoryDialog";
import { formatBRL } from "@/lib/financial-utils";

const Stock = () => {
    const { inventory, isLoading, addToInventory, updateInventory, deleteInventoryItem } = useInventory();
    const { brands } = useBrands();

    const [searchQuery, setSearchQuery] = useState("");
    const [brandFilter, setBrandFilter] = useState("all");
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    // Edit modal
    const [editItem, setEditItem] = useState<InventoryWithProduct | null>(null);
    const [editQty, setEditQty] = useState("");
    const [editCost, setEditCost] = useState("");
    const [editSale, setEditSale] = useState("");

    const openEdit = (item: InventoryWithProduct) => {
        setEditItem(item);
        setEditQty(String(item.quantity));
        setEditCost(String(item.cost_price));
        setEditSale(String(item.sale_price));
    };

    const handleEditSave = async () => {
        if (!editItem) return;
        await updateInventory(editItem.id, {
            quantity: parseInt(editQty) || 0,
            cost_price: parseFloat(editCost) || 0,
            sale_price: parseFloat(editSale) || 0,
        });
        setEditItem(null);
    };

    const filtered = inventory.filter((item) => {
        const matchesSearch = !searchQuery ||
            item.catalog_product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.catalog_product?.brand?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBrand = brandFilter === "all" || item.catalog_product?.brand?.id === brandFilter;
        return matchesSearch && matchesBrand;
    });

    const totalStockValue = inventory.reduce((sum, i) => sum + i.quantity * i.sale_price, 0);
    const totalCostValue = inventory.reduce((sum, i) => sum + i.quantity * i.cost_price, 0);
    const projectedProfit = totalStockValue - totalCostValue;

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-3">
                        <Package className="w-7 h-7 text-primary" /> Meu Estoque
                    </h1>
                    <p className="text-muted-foreground text-sm">Catálogo de marcas • Estoque pessoal</p>
                </div>
                <Button onClick={() => setAddDialogOpen(true)} className="font-bold uppercase text-xs h-11 px-6 gap-2">
                    <Plus className="w-4 h-4" /> Entrada de Mercadoria
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Itens no Estoque</p>
                        <p className="text-2xl font-black">{inventory.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Valor de Estoque</p>
                        <p className="text-2xl font-black">{formatBRL(totalStockValue)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Custo de Estoque</p>
                        <p className="text-2xl font-black">{formatBRL(totalCostValue)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-bold uppercase text-emerald-500">Lucro Previsto</p>
                        <p className={`text-2xl font-black ${projectedProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {formatBRL(projectedProfit)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por produto ou marca..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Todas as marcas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Marcas</SelectItem>
                        {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                                    {b.name}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="font-bold uppercase text-xs">Carregando estoque...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground">
                        <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-bold">Nenhum item encontrado.</p>
                        <p className="text-xs mt-1">Use &quot;Entrada de Mercadoria&quot; para adicionar.</p>
                    </div>
                ) : (
                    filtered.map((item) => {
                        const brand = item.catalog_product?.brand;
                        const product = item.catalog_product;
                        return (
                            <Card key={item.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                                <div className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            {brand && (
                                                <span
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                                                    style={{
                                                        backgroundColor: brand.color + "20",
                                                        color: brand.color,
                                                        border: `1px solid ${brand.color}40`,
                                                    }}
                                                >
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.color }} />
                                                    {brand.name}
                                                </span>
                                            )}
                                            <p className="text-base font-bold tracking-tight leading-tight truncate">
                                                {product?.name ?? "Produto"}
                                            </p>
                                            {product?.category && (
                                                <p className="text-xs text-muted-foreground">{product.category}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteInventoryItem(item.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-4 pt-1">
                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                                        <div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Qtd</p>
                                            <p className={`text-lg font-black ${item.quantity <= 3 ? (item.quantity === 0 ? "text-red-500" : "text-yellow-500") : ""}`}>
                                                {item.quantity}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Custo</p>
                                            <p className="text-sm font-bold text-muted-foreground">{formatBRL(item.cost_price)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-primary uppercase">Venda</p>
                                            <p className="text-sm font-black">{formatBRL(item.sale_price)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* ADD DIALOG */}
            <AddToInventoryDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onSave={addToInventory}
            />

            {/* EDIT DIALOG */}
            <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Editar Estoque</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm font-medium">{editItem?.catalog_product?.name}</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Quantidade</Label>
                                <Input type="number" min="0" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Custo (R$)</Label>
                                <Input type="number" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} className="h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Venda (R$)</Label>
                                <Input type="number" step="0.01" value={editSale} onChange={(e) => setEditSale(e.target.value)} className="h-9" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
                        <Button onClick={handleEditSave}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Stock;
