import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";
import { SalesTable } from "@/components/sales/SalesTable";
import { SaleFormSheet } from "@/components/sales/SaleFormSheet";
import { useSales } from "@/hooks/useSales";

const Sales = () => {
    const { sales, isLoading, createSale, deleteSale } = useSales();
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Vendas</h1>
                    <p className="text-sm text-muted-foreground">Registre e acompanhe suas vendas</p>
                </div>
                <Button onClick={() => setSheetOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Nova Venda
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Total de Vendas</p>
                    <p className="text-2xl font-bold">{sales.length}</p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Vendas Pagas</p>
                    <p className="text-2xl font-bold text-emerald-500">{sales.filter(s => s.paid).length}</p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Vendas no Fiado</p>
                    <p className="text-2xl font-bold text-yellow-500">{sales.filter(s => s.payment_method === "fiado").length}</p>
                </div>
                <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-red-500">{sales.filter(s => !s.paid).length}</p>
                </div>
            </div>

            <SalesTable sales={sales} isLoading={isLoading} onDelete={deleteSale} />

            <SaleFormSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                onSave={createSale}
            />
        </div>
    );
};

export default Sales;
