import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Crown, User, AlertTriangle, AlertCircle, CheckCircle2, Store, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import metaIcon from "@/assets/meta.svg";
import googleAdsIcon from "@/assets/google-ads.svg";
import shopifyIcon from "@/assets/shopify.svg";
import { useDashboard } from "@/contexts/DashboardContext";
import { IntegrationCard } from "@/components/ui/IntegrationCard";

// FB Profiles Section Component - Wrapped in IntegrationCard
const FBProfilesSection = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { refreshProfiles } = useDashboard();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback success/error from URL params
  useEffect(() => {
    const metaStatus = searchParams.get('meta');
    const metaName = searchParams.get('name');
    const errorParam = searchParams.get('error');

    if (metaStatus === 'success') {
      toast({
        title: t('connections.meta_connected', 'Meta conectado!'),
        description: metaName
          ? t('connections.meta_connected_desc', { name: metaName, defaultValue: `Perfil ${metaName} vinculado com sucesso.` })
          : t('connections.meta_connected_generic', 'Sua conta Meta foi conectada com sucesso.')
      });
      // Clear URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('meta');
      newParams.delete('name');
      setSearchParams(newParams, { replace: true });
      // Reload profiles to show the new connection
      loadProfiles();
      refreshProfiles();
    } else if (errorParam) {
      toast({
        title: t('common.error', 'Erro'),
        description: decodeURIComponent(errorParam),
        variant: "destructive"
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    loadProfiles().then(() => {
      if (searchParams.get('action') === 'connect') {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('action');
        setSearchParams(newParams, { replace: true });
        handleConnectProfile();
      }
    });
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const supabaseAny = supabase as any;
      const { data: workspace } = await supabaseAny
        .from('workspaces')
        .select('id, plan_type, max_fb_profiles')
        .eq('owner_id', user.id)
        .single();

      let workspaceId = workspace?.id;
      let workspaceData = workspace;

      if (!workspaceId) {
        const { data: membership } = await supabaseAny
          .from('team_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (membership?.workspace_id) {
          const { data: ws } = await supabaseAny
            .from('workspaces')
            .select('id, plan_type, max_fb_profiles')
            .eq('id', membership.workspace_id)
            .single();
          workspaceId = ws?.id;
          workspaceData = ws;
        }
      }

      if (!workspaceId) {
        console.log('No workspace found, auto-creating...');
        const { data: newWs, error: createError } = await supabaseAny
          .from('workspaces')
          .insert({
            name: `${user.email?.split('@')[0]}'s Workspace`,
            owner_id: user.id,
            plan_type: 'owner',
            max_fb_profiles: 2,
            max_members: 0
          })
          .select()
          .single();

        if (!createError && newWs) {
          workspaceId = newWs.id;
          workspaceData = newWs;
        }
      }

      if (workspaceId && workspaceData) {
        setWorkspace(workspaceData);
        // Fetch all fb_connections (they might not have workspace_id set yet)
        const { data: connections } = await supabaseAny
          .from('fb_connections')
          .select('id, name, access_token, status, created_at, expires_at')
          .eq('status', 'connected');
        setProfiles(connections || []);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t('common.error', 'Error'), description: t('common.logged_in_required', "You need to be logged in"), variant: "destructive" });
      return;
    }

    const supabaseAny = supabase as any;
    let currentWorkspace = workspace;

    if (!currentWorkspace) {
      const { data: newWsArray, error: createError } = await supabaseAny.rpc('create_workspace_for_user', {
        p_name: `${user.email?.split('@')[0]}'s Workspace`,
        p_owner_id: user.id,
        p_plan_type: 'owner',
        p_max_fb_profiles: 2,
        p_max_members: 0
      });

      if (createError || !newWsArray || newWsArray.length === 0) {
        console.error('Workspace creation failed:', createError);
        toast({ title: t('common.error', 'Error'), description: t('connections.error.create_workspace', "Could not create workspace"), variant: "destructive" });
        return;
      }
      currentWorkspace = newWsArray[0];
      setWorkspace(newWsArray[0]);
    }

    if (profiles.length >= currentWorkspace.max_fb_profiles) {
      toast({
        title: t('connections.limit_reached', "Limit reached"),
        description: t('connections.limit_description', { count: currentWorkspace.max_fb_profiles, defaultValue: `Your plan allows up to ${currentWorkspace.max_fb_profiles} profiles. Upgrade!` }),
        variant: "destructive"
      });
      return;
    }

    const FB_APP_ID = import.meta.env.VITE_FB_APP_ID || '';
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
    const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/fb-oauth-callback`;
    // Include return URL in state so callback redirects to correct environment (localhost/production)
    const returnUrl = window.location.origin;
    const STATE = `${returnUrl}`;
    const SCOPES = [
      'ads_management', 'ads_read', 'business_management',
      'pages_read_engagement', 'pages_manage_engagement', 'pages_show_list',
      'catalog_management', 'pages_read_user_content'
    ].join(',');

    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(STATE)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = oauthUrl;
  };

  const handleDisconnectProfile = async (profileId: string) => {
    try {
      const supabaseAny = supabase as any;
      await supabaseAny.from('fb_connections').delete().eq('id', profileId);
      toast({ title: t('connections.profile_disconnected', "Profile disconnected") });
      refreshProfiles();
      loadProfiles();
    } catch (error: any) {
      toast({ title: t('common.error', 'Error'), description: error.message, variant: "destructive" });
    }
  };

  // The return of FBProfilesSection should be the IntegrationCard
  return (
    <IntegrationCard
      icon={metaIcon}
      title={t('connections.fb_profiles.title', 'Meta Ads')}
      description={t('connections.fb_profiles.description')}
      status={profiles.length > 0 ? "connected" : "disconnected"}
      onConnect={handleConnectProfile}
      actionLabel={t('connections.fb_profiles.connect_button')}
      className="h-full"
      footer={
        workspace && (
          <span>
            {t('connections.fb_profiles.profile_count', { count: profiles.length, total: workspace.max_fb_profiles, defaultValue: `Profiles (${profiles.length}/${workspace.max_fb_profiles})` })}
          </span>
        )
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length > 0 ? (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-3 border rounded-lg flex items-center justify-between transition-all gap-2 ${profile.status === 'connected'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                    <AvatarFallback className="bg-blue-600 text-white font-bold">
                      {profile.name?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm truncate">
                        {profile.name || 'Meta Profile'}
                      </p>
                      {profile.status === 'connected' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {profile.expires_at
                        ? `Expira: ${new Date(profile.expires_at).toLocaleDateString('pt-BR')}`
                        : `Conectado: ${new Date(profile.created_at).toLocaleDateString('pt-BR')}`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDisconnectProfile(profile.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {profiles.length < (workspace?.max_fb_profiles || 0) && (
              <Button variant="outline" className="w-full border-dashed rounded-none" onClick={handleConnectProfile}>
                <Plus className="w-4 h-4 mr-2" />
                {t('connections.fb_profiles.add_another')}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {t('connections.fb_profiles.empty.prompt')}
          </div>
        )}
      </div>
    </IntegrationCard>
  );
};



const Connections = () => {
  const { t, i18n } = useTranslation();
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const { selectedAccountId } = useDashboard();

  // SHOPIFY STATES
  const [shopifyConfig, setShopifyConfig] = useState<any>(null);
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [isShopifyLoading, setIsShopifyLoading] = useState(false);

  // WIZARD STATES
  const [wizardStep, setWizardStep] = useState<'IDLE' | 'BUSINESS_SELECT' | 'ACCOUNT_SELECT'>('IDLE');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null); // Added state

  // ============= CHECK SESSION ON MOUNT =============
  useEffect(() => {
    const checkSession = async () => {
      console.log('🚀 [MOUNT] Componente montado - Verificando sessão');

      // Check for URL params (success/error from fb-oauth-callback)
      const urlParams = new URLSearchParams(window.location.search);
      const successMessage = urlParams.get('success');
      const errorMessage = urlParams.get('error');
      const shouldOpenWizard = urlParams.get('wizard') === 'true';
      const connectionId = urlParams.get('connection_id');

      // SHOPIFY CALLBACK HANDLING
      const shopifyStatus = urlParams.get('shopify');
      const shopifyShop = urlParams.get('shop');
      if (shopifyStatus === 'success' && shopifyShop) {
        toast({ title: t('connections.shopify.success_title', "✅ Shopify connected!"), description: t('connections.shopify.success_desc', { shop: shopifyShop, defaultValue: `Store ${shopifyShop} linked successfully.` }) });
        window.history.replaceState(null, '', window.location.pathname);
      } else if (shopifyStatus === 'error') {
        const shopifyMessage = urlParams.get('message') || t('common.unknown_error', 'Unknown error');
        toast({ title: t('connections.shopify.error_title', "❌ Shopify Error"), description: shopifyMessage, variant: "destructive" });
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (successMessage) {
        toast({ title: t('common.success', "✅ Success"), description: decodeURIComponent(successMessage) });
      }
      if (errorMessage) {
        toast({ title: t('common.error', "❌ Error"), description: decodeURIComponent(errorMessage), variant: "destructive" });
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsMetaConnected(true);
        setUserEmail(session.user.email || null);
        console.log('✅ [SESSION] Usuário logado:', session.user.email);

        // Load Shopify config for selected account
        if (selectedAccountId) {
          const supabaseAny = supabase as any;
          const { data: shopifyData } = await supabaseAny
            .from('shopify_configs')
            .select('*')
            .eq('ad_account_id', selectedAccountId)
            .eq('is_active', true)
            .maybeSingle();
          setShopifyConfig(shopifyData);
        }

        // If wizard flag is set and we have a connection ID, fetch token and start wizard
        if (shouldOpenWizard && connectionId) {
          console.log('🔄 [WIZARD] Starting wizard for connection:', connectionId);
          setCurrentConnectionId(connectionId);
          window.history.replaceState(null, '', window.location.pathname);

          try {
            setIsMetaLoading(true);
            const { data, error } = await supabase.functions.invoke('get-fb-token', {
              body: { connectionId }
            });
            if (error) throw error;
            if (data?.accessToken) {
              console.log('✅ [WIZARD] Token retrieved, starting business fetch...');
              await fetchBusinesses(data.accessToken);
            } else {
              throw new Error(t('connections.error.token_not_returned', 'Token not returned'));
            }
          } catch (err: any) {
            console.error('❌ [WIZARD] Error starting wizard:', err);
            toast({
              title: t('connections.error.wizard_start', "Error starting wizard"),
              description: err.message || t('connections.error.get_token', 'Could not get token'),
              variant: "destructive"
            });
            setIsMetaLoading(false);
          }
        } else {
          if (successMessage) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    };

    checkSession();
  }, [selectedAccountId]);

  // ============= SHOPIFY FUNCTIONS =============
  const handleShopifyConnect = () => {
    if (!shopifyDomain.trim()) {
      toast({ title: t('common.error', 'Error'), description: t('connections.shopify.enter_domain', "Enter your Shopify store domain"), variant: "destructive" });
      return;
    }

    setIsShopifyLoading(true);

    // Normalize domain
    let domain = shopifyDomain.trim().toLowerCase();
    if (!domain.includes('.myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }
    domain = domain.replace(/^https?:\/\//, '');

    // Redirect to Shopify OAuth start
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const authUrl = `${supabaseUrl}/functions/v1/shopify-auth-start?shop=${encodeURIComponent(domain)}&adAccountId=${encodeURIComponent(selectedAccountId || 'default')}`;

    window.location.href = authUrl;
  };

  const handleShopifyDisconnect = async () => {
    if (!shopifyConfig?.id) return;

    setIsShopifyLoading(true);
    try {
      const supabaseAny = supabase as any;
      await supabaseAny.from('shopify_configs').update({ is_active: false }).eq('id', shopifyConfig.id);
      setShopifyConfig(null);
      toast({ title: t('connections.shopify.disconnected', "Shopify disconnected") });
    } catch (err: any) {
      toast({ title: t('common.error', "Error"), description: err.message, variant: "destructive" });
    } finally {
      setIsShopifyLoading(false);
    }
  };

  const handleShopifySync = async () => {
    if (!shopifyConfig?.ad_account_id) return;

    setIsShopifyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-orders', {
        body: { adAccountId: shopifyConfig.ad_account_id }
      });
      if (error) throw error;
      toast({
        title: t('connections.shopify.sync_success', "✅ Sync completed"),
        description: t('connections.shopify.sync_desc', { count: data.totalOrders, defaultValue: `${data.totalOrders} orders synced` })
      });
    } catch (err: any) {
      toast({ title: t('connections.shopify.sync_error', "Error syncing"), description: err.message, variant: "destructive" });
    } finally {
      setIsShopifyLoading(false);
    }
  };

  // 2. FETCH BUSINESSES
  const fetchBusinesses = async (accessToken: string) => {
    setTempToken(accessToken);
    setWizardStep('BUSINESS_SELECT');
    setIsMetaLoading(false);

    try {
      console.log('🔄 [WIZARD] Fetching Businesses...');
      const { data, error } = await supabase.functions.invoke('get-meta-hierarchy', {
        body: { action: 'GET_BUSINESSES', accessToken }
      });

      if (error) throw error;
      setBusinesses(data.businesses || []);
    } catch (error: any) {
      console.error('❌ [WIZARD] Error fetching businesses:', error);
      toast({ title: t('connections.error.fetch_bms', "Error fetching BMs"), description: error.message, variant: "destructive" });
      setWizardStep('IDLE');
    }
  };

  // 3. FETCH ACCOUNTS
  const handleBusinessSelect = async (business: any) => {
    setSelectedBusiness(business);
    setWizardStep('ACCOUNT_SELECT');
    setAdAccounts([]);

    try {
      console.log('🔄 [WIZARD] Fetching Ad Accounts for BM:', business.id);
      const { data, error } = await supabase.functions.invoke('get-meta-hierarchy', {
        body: { action: 'GET_AD_ACCOUNTS', accessToken: tempToken, businessId: business.id }
      });

      if (error) throw error;
      setAdAccounts(data.accounts || []);
    } catch (error: any) {
      console.error('❌ [WIZARD] Error fetching accounts:', error);
      toast({ title: t('connections.error.fetch_accounts', "Error fetching Accounts"), description: error.message, variant: "destructive" });
      setWizardStep('BUSINESS_SELECT');
    }
  };

  // 4. SAVE SELECTION
  const handleSaveSelection = async () => {
    if (selectedAccountIds.length === 0 || !tempToken) return;

    setIsMetaLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('common.unauthenticated', "User not authenticated"));

      // A. Save Token (Manual Upsert to avoid constraint error)
      const { data: existingToken } = await supabase
        .from('meta_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const tokenData = {
        user_id: user.id,
        access_token: tempToken,
        account_name: `Facebook Logic - ${new Date().toLocaleDateString()}`,
        status: 'connected' as 'connected',
        updated_at: new Date().toISOString()
      };

      if (existingToken) {
        const { error: updateError } = await supabase
          .from('meta_tokens')
          .update(tokenData)
          .eq('id', existingToken.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('meta_tokens')
          .insert(tokenData);
        if (insertError) throw insertError;
      }

      // B. Save Ad Accounts
      // SOFT RESET: Mark ALL existing accounts as INACTIVE first.
      // We cannot delete them due to Foreign Key constraints (Campaigns, etc.), so we hide them.
      await supabase.from('ad_accounts')
        .update({ status: 'INACTIVE' })
        .eq('user_id', user.id);

      // PREPARE ACTIVE ACCOUNTS (Upsert will set them back to ACTIVE)
      const accountsToSave = adAccounts
        .filter(acc => selectedAccountIds.includes(acc.id))
        .map(acc => ({
          id: acc.id,                 // Supabase ID = Meta Account ID
          name: acc.name,
          user_id: user.id,
          access_token: tempToken!,
          currency: acc.currency,
          status: 'ACTIVE',          // Only selected ones become ACTIVE
          business_id: selectedBusiness?.id || null  // Store the selected BM ID
        }));

      // @ts-ignore
      const { error: accError } = await supabase.from('ad_accounts').upsert(accountsToSave);
      if (accError) throw accError;

      // C. Clear cached dashboard selections to force fresh selection
      localStorage.removeItem('dashboard_selectedClientId');
      localStorage.removeItem('dashboard_selectedAccountId');
      localStorage.removeItem('dashboard_viewMode');

      // D. Auto-select first new account
      if (accountsToSave.length > 0) {
        const firstAccountId = accountsToSave[0].id;
        localStorage.setItem('dashboard_selectedAccountId', firstAccountId);
        localStorage.setItem('dashboard_viewMode', 'account');
        console.log('✅ [WIZARD] Auto-selecionou conta:', firstAccountId);
      }

      // E. Trigger async campaign sync for the new accounts (background)
      console.log('🔄 [WIZARD] Iniciando sync de campanhas para novas contas...');
      accountsToSave.forEach(async (acc) => {
        try {
          await supabase.functions.invoke('sync-meta-campaigns', {
            body: { accountId: acc.id, accessToken: tempToken }
          });
          console.log(`✅ [WIZARD] Sync iniciado para conta ${acc.name}`);
        } catch (syncErr) {
          console.warn(`⚠️ [WIZARD] Erro ao sincronizar conta ${acc.name}:`, syncErr);
        }
      });

      // F. Finalize
      setIsMetaConnected(true);
      setWizardStep('IDLE');
      localStorage.setItem('fb_access_token', tempToken);

      toast({
        title: t('connections.wizard.success_title', "✅ Configuration Completed!"),
        description: t('connections.wizard.success_desc', { count: accountsToSave.length, bm: selectedBusiness.name, defaultValue: `${accountsToSave.length} accounts linked to BM ${selectedBusiness.name}. Syncing campaigns...` }),
      });

      // G. Force page reload to refresh DashboardContext with new accounts
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('❌ [WIZARD] Save error:', error);
      toast({ title: t('common.save_error', "Error saving"), description: error.message, variant: "destructive" });
    } finally {
      setIsMetaLoading(false);
    }
  };

  const handleMetaDisconnect = async () => {
    console.log('🔓 [DISCONNECT] Desconectando...');
    setIsMetaLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('[DISCONNECT] Cleaning up user data...');
        await supabase.from('meta_tokens').update({ status: 'disconnected' }).eq('user_id', user.id);
        // FORCE DELETE AD ACCOUNTS
        await supabase.from('ad_accounts').delete().eq('user_id', user.id);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setIsMetaConnected(false);
      setUserEmail(null);
      localStorage.removeItem('fb_access_token');

      // Clear cached dashboard selections
      localStorage.removeItem('dashboard_selectedClientId');
      localStorage.removeItem('dashboard_selectedAccountId');
      localStorage.removeItem('dashboard_viewMode');

      console.log('✅ [DISCONNECT] Desconectado e dados limpos.');

      toast({
        title: t('connections.disconnected_title', "✅ Disconnected"),
        description: t('connections.disconnected_desc', "Accounts removed. Ready for a new test."),
      });
    } catch (error: any) {
      console.error('❌ [DISCONNECT] Erro:', error);
      toast({
        title: t('connections.error.disconnect', "❌ Error disconnecting"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMetaLoading(false);
    }
  };

  // RENDER WIZARD: BUSINESS SELECT
  if (wizardStep === 'BUSINESS_SELECT') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setWizardStep('IDLE')}>&larr; {t('common.cancel', 'Cancel')}</Button>
          <h1 className="text-3xl font-bold mt-2">{t('connections.wizard.select_bm', 'Select Business Manager (BM)')}</h1>
          <p className="text-muted-foreground">{t('connections.wizard.select_bm_desc', 'Choose the organization that contains the ad accounts.')}</p>
        </div>

        {businesses.length === 0 && <p className="text-gray-500">{t('connections.wizard.no_bms', 'No BMs found.')}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((biz) => (
            <Card key={biz.id} className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all" onClick={() => handleBusinessSelect(biz)}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                {biz.profile_picture_uri ? (
                  <img src={biz.profile_picture_uri} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-lg">
                    {biz.name.charAt(0)}
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{biz.name}</CardTitle>
                  <CardDescription className="text-xs">ID: {biz.id}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // RENDER WIZARD: ACCOUNT SELECT
  if (wizardStep === 'ACCOUNT_SELECT' && selectedBusiness) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setWizardStep('BUSINESS_SELECT')}>&larr; {t('connections.wizard.back_to_bms', 'Back to BMs')}</Button>
          <h1 className="text-3xl font-bold mt-2">{t('connections.wizard.accounts_in', { name: selectedBusiness.name, defaultValue: `Accounts in ${selectedBusiness.name}` })}</h1>
          <p className="text-muted-foreground">{t('connections.wizard.select_accounts_desc', 'Select which accounts you want to manage.')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto mb-6">
          {adAccounts.map((acc) => {
            const isSelected = selectedAccountIds.includes(acc.id);
            return (
              <div key={acc.id}
                className={`p-4 border rounded-lg flex items-center justify-between cursor-pointer ${isSelected ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onClick={() => {
                  if (isSelected) setSelectedAccountIds(prev => prev.filter(id => id !== acc.id));
                  else setSelectedAccountIds(prev => [...prev, acc.id]);
                }}
              >
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {acc.name}
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">{acc.relation_type}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">ID: {acc.account_id} • {acc.currency}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        {adAccounts.length === 0 && <p className="text-gray-500 mb-4">{t('connections.wizard.no_accounts', 'No accounts found in this BM.')}</p>}

        <Button size="lg" className="w-full" onClick={handleSaveSelection} disabled={selectedAccountIds.length === 0 || isMetaLoading}>
          {isMetaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('connections.wizard.connect_accounts_button', { count: selectedAccountIds.length, defaultValue: `Connect ${selectedAccountIds.length} Accounts` })}
        </Button>
      </div>
    );
  }

  // DEFAULT RENDER (DASHBOARD)
  return (
    <div className="w-full h-full p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('connections.title', 'Integrations')}</h1>
        <p className="text-muted-foreground text-lg">
          {t('connections.subtitle', 'Connect your ad accounts and other platforms for a complete view.')}
          {userEmail && <span className="ml-1 text-foreground/80">({userEmail})</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
        {/* FB PROFILES SECTION (Meta Ads) */}
        <div className="h-full">
          <FBProfilesSection />
        </div>

        {/* Shopify Integration Card */}
        <IntegrationCard
          icon={shopifyIcon}
          title="Shopify"
          description={shopifyConfig
            ? t('connections.shopify.connected_desc', { domain: shopifyConfig.shop_domain })
            : t('connections.shopify.connect_prompt')
          }
          status={shopifyConfig ? "connected" : "disconnected"}
          isLoading={isShopifyLoading}
          onDisconnect={handleShopifyDisconnect}
          onConnect={handleShopifyConnect}
          className="h-full"
          actionLabel={t('connections.shopify.connect_button')}
        >
          <div className="space-y-4">
            {shopifyConfig ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t('connections.shopify.last_sync')}</p>
                    <p className="text-xs text-muted-foreground">
                      {shopifyConfig.last_sync_at
                        ? new Date(shopifyConfig.last_sync_at).toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US')
                        : t('common.never')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShopifySync}
                    disabled={isShopifyLoading}
                    className="h-8 rounded-none px-3"
                  >
                    {isShopifyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-2" />}
                    {t('common.sync', 'Sync')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('connections.shopify.domain_placeholder')}
                    value={shopifyDomain}
                    onChange={(e) => setShopifyDomain(e.target.value)}
                    className="h-10 text-sm rounded-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('connections.shopify.domain_prompt_help')}
                </p>
              </div>
            )}
          </div>
        </IntegrationCard>

        {/* Google Ads Integration Card - Coming Soon */}
        <IntegrationCard
          icon={<img src={googleAdsIcon} alt="Google Ads" className="h-7 w-7 opacity-80" />}
          title="Google Ads"
          description={t('connections.google_ads.desc', 'Connect your Google Ads account to unify your reports.')}
          status="disconnected"
          className="h-full border-dashed opacity-90 bg-muted/5"
          actionLabel={t('common.soon')}
        >
          <div className="space-y-4">
            <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center gap-2">
              <p className="text-xs">
                {t('connections.google_ads.working_on_it')}
              </p>
            </div>
          </div>
        </IntegrationCard>
      </div>
    </div>
  );
};

export default Connections;
