import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Loader2, DollarSign, Percent, Package, Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PRODUCTS, getPricingColor, getPricingLabel } from "@/config/products.config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    fixed_value: z.string().refine((val) => !isNaN(parseFloat(val.replace(/\./g, '').replace(',', '.'))), "Valor inválido"),
    commission_rate: z.string().refine((val) => !isNaN(parseFloat(val)), "Porcentagem inválida"),
    commission_base: z.enum(["revenue", "spend"], {
        required_error: "Selecione uma base de cálculo",
    }),
});

export function NewClientModal({ trigger }: { trigger?: React.ReactNode }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            fixed_value: "0,00",
            commission_rate: "10",
            commission_base: "revenue",
        },
    });

    const toggleProduct = (productId: string) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const fixedValueFloat = parseFloat(values.fixed_value.replace(/\./g, '').replace(',', '.'));
            const commissionRateFloat = parseFloat(values.commission_rate);

            if (!user) {
                toast({
                    variant: "destructive",
                    title: "Erro de autenticação",
                    description: "Você precisa estar logado para criar um cliente.",
                });
                return;
            }

            // 1. Create client
            const { data: newClient, error } = await (supabase as any)
                .from('agency_clients')
                .insert({
                    name: values.name,
                    fee_fixed: fixedValueFloat,
                    commission_rate: commissionRateFloat,
                    user_id: user.id,
                    assigned_products: selectedProducts // Assign products immediately
                })
                .select()
                .single();

            if (error) throw error;

            console.log("Cliente criado:", newClient);

            // 2. Create tasks for assigned products
            if (selectedProducts.length > 0 && newClient) {
                const selectedProductItems = PRODUCTS.filter(p => selectedProducts.includes(p.id));
                const tasksToCreate = selectedProductItems.flatMap(product =>
                    product.features.map((feature, index) => ({
                        client_id: newClient.id,
                        title: `[${values.name}] ${feature}`,
                        description: `Executável do produto "${product.name}" para o cliente ${values.name}`,
                        status: 'pending',
                        priority: index === 0 ? 'high' : 'medium',
                        product_id: product.id,
                        product_name: product.name,
                        created_at: new Date().toISOString(),
                    }))
                );

                if (tasksToCreate.length > 0) {
                    const { error: tasksError } = await (supabase as any)
                        .from('client_tasks')
                        .insert(tasksToCreate);

                    if (tasksError) {
                        console.warn("Erro ao criar tarefas automáticas:", tasksError);
                        // We don't throw here to avoid failing the whole client creation if just tasks fail
                        toast({
                            title: "Atenção",
                            description: "Cliente criado, mas houve um erro ao gerar algumas tarefas automáticas.",
                        });
                    }
                }
            }

            toast({
                title: "✅ Cliente criado com sucesso!",
                description: `${values.name} foi adicionado com ${selectedProducts.length} produtos.`,
            });

            // Invalidate queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['agency_clients'] });

            setOpen(false);
            form.reset();
            setSelectedProducts([]);

            // Navigate to the new client's page
            if (newClient?.id) {
                navigate(`/clients/${newClient.id}`);
            }
        } catch (error: any) {
            console.error("Erro ao criar cliente:", error);
            toast({
                variant: "destructive",
                title: "Erro ao criar cliente",
                description: error.message || "Ocorreu um erro inesperado.",
            });
        }
    }

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
        let value = e.target.value.replace(/\D/g, "");
        const result = (Number(value) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
        onChange(result);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="w-full h-full" variant="ghost">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Cliente</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">

                        {/* Dados Básicos */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <span className="bg-primary/10 p-1 rounded">1</span>
                                Dados do Contrato
                            </h3>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Cliente</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Minha Empresa Ltda" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="fixed_value"
                                    render={({ field: { onChange, ...field } }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                Valor Fixo Mensal
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                                                    <Input
                                                        className="pl-10 font-semibold"
                                                        {...field}
                                                        onChange={(e) => handleCurrencyChange(e, onChange)}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="commission_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Percent className="w-4 h-4 text-primary" />
                                                Comissão Variável
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        className="pr-8 font-semibold"
                                                        {...field}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="commission_base"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Base de Cálculo</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="grid grid-cols-2 gap-4"
                                            >
                                                <FormItem>
                                                    <FormLabel className="[&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:bg-primary/5 cursor-pointer">
                                                        <FormControl>
                                                            <RadioGroupItem value="revenue" className="sr-only" />
                                                        </FormControl>
                                                        <div className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-muted transition-all hover:border-primary/50 text-center">
                                                            <span className="text-xl">📈</span>
                                                            <span className="font-semibold text-sm">Faturamento</span>
                                                        </div>
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem>
                                                    <FormLabel className="[&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:bg-primary/5 cursor-pointer">
                                                        <FormControl>
                                                            <RadioGroupItem value="spend" className="sr-only" />
                                                        </FormControl>
                                                        <div className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-muted transition-all hover:border-primary/50 text-center">
                                                            <span className="text-xl">💰</span>
                                                            <span className="font-semibold text-sm">Investimento</span>
                                                        </div>
                                                    </FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </form>
                </Form>

                {/* Produtos - FORA do form para evitar conflito de submit */}
                <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="bg-primary/10 p-1 rounded">2</span>
                        Atribuir Produtos Iniciais (opcional)
                    </h3>

                    <ScrollArea className="h-[200px] pr-4 border rounded-md p-2 bg-muted/10">
                        <div className="space-y-2">
                            {PRODUCTS.map((product) => {
                                const isSelected = selectedProducts.includes(product.id);
                                const Icon = product.icon;

                                return (
                                    <div
                                        key={product.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleProduct(product.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && toggleProduct(product.id)}
                                        className={cn(
                                            "relative p-3 rounded-lg border-2 transition-all cursor-pointer select-none",
                                            isSelected
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50 bg-card"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>

                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: `${product.color}20` }}
                                            >
                                                <div style={{ color: product.color }}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-sm">{product.name}</span>
                                                <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground text-center">
                        {selectedProducts.length} produtos selecionados
                    </p>
                </div>

                {/* Botões no final */}
                <DialogFooter className="pt-4 border-t border-border">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        type="button"
                        disabled={form.formState.isSubmitting}
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        {form.formState.isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                                Criar Cliente
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
