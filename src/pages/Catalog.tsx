import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CatalogService } from "@/services/catalog-service";
import { Loader2, Search, Package2, ShieldCheck, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/financial-utils";
import { Button } from "@/components/ui/button";
import { AddToInventoryDialog } from "@/components/stock/AddToInventoryDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type MasterBrand = Database["public"]["Tables"]["master_brands"]["Row"];
type MasterProduct = Database["public"]["Tables"]["master_products"]["Row"] & { brand?: MasterBrand };

export default function Catalog() {
    const [brands, setBrands] = useState<MasterBrand[]>([]);
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // Quick Add Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [b, p] = await Promise.all([
                CatalogService.getBrands(),
                CatalogService.getTrendingProducts()
            ]);
            setBrands(b);
            setProducts(p);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.length < 2) {
            loadInitialData();
            return;
        }
        setIsSearching(true);
        try {
            const res = await CatalogService.searchMasterProducts(searchQuery);
            setProducts(res);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* HEAD */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card border rounded-xl p-6 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <GlobeIcon className="w-6 h-6 text-primary" />
                            Catálogo Master VORA
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Explore as 20 maiores marcas de beleza e seus produtos mais vendidos.
                        </p>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" /> Importar para o Estoque
                    </Button>
                </div>

                {/* SEARCH */}
                <form onSubmit={handleSearch} className="relative max-w-2xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Busque por 'Malbec', 'Kaiak', 'Renew'..."
                        className="pl-10 h-12 text-lg rounded-xl border-primary/20 focus-visible:ring-primary shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                </form>

                {/* BRANDS OVERVIEW */}
                {!searchQuery && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Marcas Registradas
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {brands.map((b) => (
                                <Badge
                                    key={b.id}
                                    variant={b.is_custom ? "secondary" : "default"}
                                    className="px-3 py-1 text-xs"
                                >
                                    {b.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* PRODUCTS LIST */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Package2 className="w-4 h-4" />
                        {searchQuery ? "Resultados da Busca" : "Top 50 Produtos Mais Importados"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.length === 0 ? (
                            <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                                Nenhuma referência encontrada. Você pode criar este produto manualmente no estoque!
                            </div>
                        ) : (
                            products.map((p) => (
                                <Card key={p.id} className="group overflow-hidden hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="aspect-square bg-muted/30 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package2 className="w-12 h-12 text-muted-foreground/30" />
                                            )}
                                            {p.is_custom && (
                                                <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                                    CUSTOM
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                                    {p.brand?.name || "Sem marca"}
                                                </span>
                                                {p.category && (
                                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                        {p.category}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-medium text-sm leading-tight line-clamp-2" title={p.name}>
                                                {p.name}
                                            </h4>
                                            <div className="pt-2 flex items-end justify-between">
                                                <div className="space-y-0.5">
                                                    <span className="block text-[10px] text-muted-foreground uppercase">Sugerido</span>
                                                    <span className="block font-bold text-emerald-500">
                                                        {formatBRL(p.suggested_price || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <AddToInventoryDialog
                    open={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    onSave={async (id, qty, cost, sale) => {
                        if (!user) return;
                        try {
                            const { data: existing } = await supabase
                                .from("vora_inventory")
                                .select("id, quantity")
                                .eq("master_product_id", id)
                                .eq("user_id", user.id)
                                .single();

                            if (existing) {
                                await supabase.from("vora_inventory").update({
                                    quantity: existing.quantity + qty,
                                    cost_price: cost,
                                    sale_price: sale,
                                    updated_at: new Date().toISOString()
                                }).eq("id", existing.id);
                            } else {
                                await supabase.from("vora_inventory").insert({
                                    user_id: user.id,
                                    master_product_id: id,
                                    quantity: qty,
                                    cost_price: cost,
                                    sale_price: sale
                                });
                            }
                            toast({ title: "Produto importado para o estoque com sucesso!" });
                            setIsAddOpen(false);
                        } catch (err: any) {
                            toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
                        }
                    }}
                />
            </div>
        </DashboardLayout>
    );
}

// Inline Icon to keep it completely self-contained
function GlobeIcon(props: React.ComponentProps<"svg">) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
        </svg>
    )
}
