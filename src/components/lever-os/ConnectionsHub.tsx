import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ExternalLink, Unlink, Loader2, Store, ShoppingCart, Zap, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

interface AdAccount {
    account_id: string;
    name: string;
    currency: string;
    status: string;
    business_name?: string;
}

interface ShopifyConnection {
    shopify_domain: string | null;
    shopify_status: 'disconnected' | 'pending' | 'connected' | 'error';
    shopify_shop_name: string | null;
    shopify_connected_at: string | null;
}

interface ConnectionsHubProps {
    onConnectionChange?: (type: 'meta' | 'shopify' | 'kartpanda', connected: boolean, data?: any) => void;
}

export function ConnectionsHub({ onConnectionChange }: ConnectionsHubProps) {
    const { toast } = useToast();
    const { selectedClientId, refreshClientData } = useSelectedClient();
    const [searchParams, setSearchParams] = useSearchParams();

    // Meta State
    const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [savedAccounts, setSavedAccounts] = useState<string[]>([]); // Track what's actually saved in DB
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountsError, setAccountsError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasMetaConnection, setHasMetaConnection] = useState(false);

    // Shopify State - Real Integration
    const [shopifyDomain, setShopifyDomain] = useState("");
    const [isShopifyLoading, setIsShopifyLoading] = useState(false);
    const [shopifyConnection, setShopifyConnection] = useState<ShopifyConnection | null>(null);

    // Load ad accounts and client's selected accounts on mount
    useEffect(() => {
        loadAdAccounts();
    }, []);

    // Load client's selected accounts when client changes
    useEffect(() => {
        if (selectedClientId) {
            loadClientSelectedAccounts();
            loadShopifyConnection();
        }
    }, [selectedClientId]);

    // Handle Shopify OAuth callback from URL params
    useEffect(() => {
        const shopifyStatus = searchParams.get('shopify');
        const shopifyShop = searchParams.get('shop');

        if (shopifyStatus === 'success' && shopifyShop) {
            toast({
                title: "Shopify conectado!",
                description: `Loja ${shopifyShop} vinculada com sucesso.`
            });
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('shopify');
            newParams.delete('shop');
            setSearchParams(newParams, { replace: true });
            loadShopifyConnection();
            refreshClientData();
        } else if (shopifyStatus === 'error') {
            const message = searchParams.get('message') || 'Erro desconhecido';
            toast({
                title: "Erro na conexao Shopify",
                description: message,
                variant: "destructive"
            });
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('shopify');
            newParams.delete('message');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const loadAdAccounts = async () => {
        setIsLoadingAccounts(true);
        setAccountsError(null);

        try {
            // First, get the Meta connection with access token
            const { data: connections, error: connError } = await (supabase as any)
                .from('fb_connections')
                .select('id, name, access_token, status')
                .eq('status', 'connected')
                .limit(1);

            if (connError) throw connError;

            if (!connections || connections.length === 0) {
                setHasMetaConnection(false);
                setAdAccounts([]);
                return;
            }

            setHasMetaConnection(true);
            const accessToken = connections[0].access_token;

            if (!accessToken) {
                setAccountsError('Token de acesso nao encontrado');
                return;
            }

            // Call the edge function to list ad accounts
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/list-ad-accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accessToken })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setAdAccounts(data.accounts || []);
        } catch (error: any) {
            console.error('Error loading ad accounts:', error);
            setAccountsError(error.message || 'Erro ao carregar contas');
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    const loadClientSelectedAccounts = async () => {
        if (!selectedClientId) return;

        try {
            const { data, error } = await (supabase as any)
                .from('agency_clients')
                .select('selected_ad_accounts, shopify_domain, shopify_status, shopify_shop_name, shopify_connected_at')
                .eq('id', selectedClientId)
                .single();

            if (error) throw error;

            // Set selected ad accounts (both for UI state and saved state)
            const accounts = data?.selected_ad_accounts || [];
            setSelectedAccounts(accounts);
            setSavedAccounts(accounts);

            // Set Shopify connection data
            setShopifyConnection({
                shopify_domain: data?.shopify_domain || null,
                shopify_status: data?.shopify_status || 'disconnected',
                shopify_shop_name: data?.shopify_shop_name || null,
                shopify_connected_at: data?.shopify_connected_at || null
            });

            if (data?.shopify_domain) {
                setShopifyDomain(data.shopify_domain);
            }
        } catch (error) {
            console.error('Error loading client data:', error);
        }
    };

    const loadShopifyConnection = async () => {
        if (!selectedClientId) return;

        try {
            const { data, error } = await (supabase as any)
                .from('agency_clients')
                .select('shopify_domain, shopify_status, shopify_shop_name, shopify_connected_at')
                .eq('id', selectedClientId)
                .single();

            if (error) throw error;

            setShopifyConnection(data || {
                shopify_domain: null,
                shopify_status: 'disconnected',
                shopify_shop_name: null,
                shopify_connected_at: null
            });

            if (data?.shopify_domain) {
                setShopifyDomain(data.shopify_domain);
            }
        } catch (error) {
            console.error('Error loading Shopify connection:', error);
        }
    };

    const handleToggleAccount = (accountId: string) => {
        setSelectedAccounts(prev => {
            if (prev.includes(accountId)) {
                return prev.filter(id => id !== accountId);
            } else {
                return [...prev, accountId];
            }
        });
    };

    const handleSaveSelectedAccounts = async () => {
        if (!selectedClientId) {
            toast({
                title: "Cliente nao selecionado",
                description: "Selecione um cliente antes de salvar",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await (supabase as any)
                .from('agency_clients')
                .update({ selected_ad_accounts: selectedAccounts })
                .eq('id', selectedClientId);

            if (error) throw error;

            // Update saved accounts state
            setSavedAccounts([...selectedAccounts]);

            toast({
                title: "Contas vinculadas!",
                description: `${selectedAccounts.length} conta(s) de anuncio vinculada(s) ao cliente.`
            });
            onConnectionChange?.('meta', selectedAccounts.length > 0, { accounts: selectedAccounts });
            refreshClientData();
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearSelection = async () => {
        if (!selectedClientId) return;

        setIsSaving(true);
        try {
            const { error } = await (supabase as any)
                .from('agency_clients')
                .update({ selected_ad_accounts: [] })
                .eq('id', selectedClientId);

            if (error) throw error;

            setSelectedAccounts([]);
            setSavedAccounts([]);
            toast({ title: "Contas desvinculadas" });
            onConnectionChange?.('meta', false);
            refreshClientData();
        } catch (error: any) {
            toast({
                title: "Erro ao desvincular",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Real Shopify OAuth - Initiate connection
    const handleShopifyConnect = async () => {
        if (!shopifyDomain.trim()) {
            toast({
                title: "Dominio obrigatorio",
                description: "Digite o dominio da loja Shopify",
                variant: "destructive"
            });
            return;
        }

        if (!selectedClientId) {
            toast({
                title: "Cliente nao selecionado",
                description: "Selecione um cliente antes de conectar",
                variant: "destructive"
            });
            return;
        }

        setIsShopifyLoading(true);

        try {
            let domain = shopifyDomain.trim().toLowerCase();
            if (!domain.includes('.myshopify.com')) {
                domain = `${domain}.myshopify.com`;
            }
            domain = domain.replace(/^https?:\/\//, '');

            const { error: updateError } = await (supabase as any)
                .from('agency_clients')
                .update({
                    shopify_domain: domain,
                    shopify_status: 'pending'
                })
                .eq('id', selectedClientId);

            if (updateError) throw updateError;

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
            const currentUrl = window.location.href.split('?')[0];
            const authUrl = `${supabaseUrl}/functions/v1/shopify-auth-start?shop=${encodeURIComponent(domain)}&clientId=${encodeURIComponent(selectedClientId)}&returnUrl=${encodeURIComponent(currentUrl)}`;

            window.location.href = authUrl;
        } catch (error: any) {
            console.error('Error starting Shopify OAuth:', error);
            toast({
                title: "Erro ao conectar",
                description: error.message || "Nao foi possivel iniciar a conexao",
                variant: "destructive"
            });
            setIsShopifyLoading(false);
        }
    };

    const handleShopifyDisconnect = async () => {
        if (!selectedClientId) return;

        setIsShopifyLoading(true);
        try {
            const { error } = await (supabase as any)
                .from('agency_clients')
                .update({
                    shopify_status: 'disconnected',
                    shopify_access_token: null,
                    shopify_connected_at: null
                })
                .eq('id', selectedClientId);

            if (error) throw error;

            setShopifyConnection({
                shopify_domain: shopifyConnection?.shopify_domain || null,
                shopify_status: 'disconnected',
                shopify_shop_name: null,
                shopify_connected_at: null
            });

            toast({ title: "Shopify desconectado" });
            onConnectionChange?.('shopify', false);
            refreshClientData();
        } catch (error: any) {
            toast({
                title: "Erro ao desconectar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsShopifyLoading(false);
        }
    };

    const isShopifyConnected = shopifyConnection?.shopify_status === 'connected';
    const isShopifyPending = shopifyConnection?.shopify_status === 'pending';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Conexoes & Integracoes</h2>
                    <p className="text-sm text-muted-foreground">Configure as pontes com suas plataformas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Meta Ads Connection */}
                <Card className="relative overflow-hidden border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                    <CardHeader className="relative pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#1877F2">
                                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                                    </svg>
                                </div>
                                <div>
                                    <CardTitle className="text-base">Meta Ads</CardTitle>
                                    <CardDescription className="text-xs">Facebook & Instagram</CardDescription>
                                </div>
                            </div>
                            {hasMetaConnection ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                    Agencia Conectada
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Nao Conectado
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                        {isLoadingAccounts ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : !hasMetaConnection ? (
                            <div className="text-center py-6 space-y-3">
                                <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                                <p className="text-sm text-muted-foreground">
                                    Conecte sua conta Meta na pagina de Conexoes para ver as contas de anuncio disponiveis.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.location.href = '/connections?action=connect'}
                                >
                                    Ir para Conexoes
                                </Button>
                            </div>
                        ) : accountsError ? (
                            <div className="text-center py-6 space-y-3">
                                <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
                                <p className="text-sm text-red-500">{accountsError}</p>
                                <Button variant="outline" size="sm" onClick={loadAdAccounts}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Tentar novamente
                                </Button>
                            </div>
                        ) : adAccounts.length === 0 ? (
                            <div className="text-center py-6 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    Nenhuma conta de anuncio encontrada.
                                </p>
                                <Button variant="outline" size="sm" onClick={loadAdAccounts}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Recarregar
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Show saved accounts summary if any */}
                                {savedAccounts.length > 0 && (
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                                {savedAccounts.length} conta(s) vinculada(s)
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            {savedAccounts.map(accountId => {
                                                const account = adAccounts.find(a => a.account_id === accountId);
                                                return (
                                                    <div key={accountId} className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="truncate">{account?.name || `act_${accountId}`}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium">
                                        {savedAccounts.length > 0 ? 'Editar Contas Vinculadas' : 'Selecione as Contas de Anuncio'}
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={loadAdAccounts}
                                        className="h-8 px-2"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                    {adAccounts.map(account => {
                                        const isSelected = selectedAccounts.includes(account.account_id);
                                        const isSaved = savedAccounts.includes(account.account_id);
                                        return (
                                            <div
                                                key={account.account_id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                                    isSelected && isSaved
                                                        ? "border-emerald-500/50 bg-emerald-500/5"
                                                        : isSelected
                                                            ? "border-blue-500/50 bg-blue-500/5"
                                                            : "border-border/50 hover:border-border",
                                                    account.status !== 'ACTIVE' && "opacity-50"
                                                )}
                                                onClick={() => account.status === 'ACTIVE' && handleToggleAccount(account.account_id)}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    disabled={account.status !== 'ACTIVE'}
                                                    onCheckedChange={() => handleToggleAccount(account.account_id)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium truncate">{account.name}</p>
                                                        {isSaved && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                                                Vinculada
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>act_{account.account_id}</span>
                                                        <span>•</span>
                                                        <span>{account.currency}</span>
                                                        {account.business_name && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="truncate">{account.business_name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full flex-shrink-0",
                                                    account.status === 'ACTIVE' ? "bg-emerald-500" : "bg-muted-foreground"
                                                )} />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Show save button when there are changes */}
                                {(selectedAccounts.length > 0 || savedAccounts.length > 0) && (
                                    <div className="flex items-center gap-2 pt-3 border-t">
                                        {JSON.stringify(selectedAccounts.sort()) !== JSON.stringify(savedAccounts.sort()) ? (
                                            <Button
                                                onClick={handleSaveSelectedAccounts}
                                                disabled={isSaving}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <Check className="w-4 h-4 mr-2" />
                                                )}
                                                Salvar alteracoes ({selectedAccounts.length})
                                            </Button>
                                        ) : (
                                            <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                                                <Check className="w-4 h-4 inline mr-1 text-emerald-500" />
                                                Todas as alteracoes salvas
                                            </div>
                                        )}
                                        {savedAccounts.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearSelection}
                                                disabled={isSaving}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            >
                                                <Unlink className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Shopify Connection - Real OAuth */}
                <Card className="relative overflow-hidden border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
                    <CardHeader className="relative pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <Store className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Shopify</CardTitle>
                                    <CardDescription className="text-xs">Conecte a loja do cliente</CardDescription>
                                </div>
                            </div>
                            {isShopifyConnected && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                    Conectado
                                </Badge>
                            )}
                            {isShopifyPending && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">
                                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                    Pendente
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                        {!isShopifyConnected ? (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Dominio da Loja</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="loja.myshopify.com"
                                                value={shopifyDomain}
                                                onChange={(e) => setShopifyDomain(e.target.value)}
                                                className="bg-background/50"
                                                disabled={isShopifyLoading}
                                            />
                                        </div>
                                        <Button
                                            onClick={handleShopifyConnect}
                                            disabled={!shopifyDomain || isShopifyLoading}
                                        >
                                            {isShopifyLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Zap className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Digite o dominio e clique para conectar via OAuth
                                    </p>
                                </div>

                                {isShopifyLoading && (
                                    <div className="space-y-3 animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-muted" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-3 bg-muted rounded w-3/4" />
                                                <div className="h-2 bg-muted rounded w-1/2" />
                                            </div>
                                        </div>
                                        <div className="h-8 bg-muted rounded" />
                                    </div>
                                )}

                                {isShopifyPending && !isShopifyLoading && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                                        Aguardando autorizacao da loja. Complete o processo no Shopify.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                            <Check className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                                                {shopifyConnection?.shopify_shop_name || 'Loja Conectada'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {shopifyConnection?.shopify_domain}
                                            </p>
                                            {shopifyConnection?.shopify_connected_at && (
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    Conectado em {new Date(shopifyConnection.shopify_connected_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-green-500/20">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                                        onClick={() => window.open(`https://${shopifyConnection?.shopify_domain}/admin`, '_blank')}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                        Abrir Admin
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                        onClick={handleShopifyDisconnect}
                                        disabled={isShopifyLoading}
                                    >
                                        <Unlink className="w-3.5 h-3.5 mr-1.5" />
                                        Desvincular
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* KartPanda Quick Connect */}
                <Card className="relative overflow-hidden border-border/50 lg:col-span-2">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                    <CardHeader className="relative pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base">KartPanda</CardTitle>
                                <CardDescription className="text-xs">Checkout e conversoes</CardDescription>
                            </div>
                            <Badge variant="outline" className="ml-auto text-[10px]">Em breve</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                            <div className="space-y-2">
                                <Label className="text-sm">Slug da Loja</Label>
                                <Input placeholder="minhaloja" disabled className="bg-background/50" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">Dominio Checkout</Label>
                                <Input placeholder="pay.minhaloja.com.br" disabled className="bg-background/50" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
