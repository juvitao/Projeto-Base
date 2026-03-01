import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Crown, User, AlertTriangle, AlertCircle, CheckCircle2, Store, ExternalLink, MessageCircle, QrCode, RefreshCw, Zap, Unlink, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import metaIcon from "@/assets/meta.svg";
import googleAdsIcon from "@/assets/google-ads.svg";
import shopifyIcon from "@/assets/shopify.svg";
import { useDashboard } from "@/contexts/DashboardContext";
import { IntegrationCard } from "@/components/ui/IntegrationCard";
import { cn } from "@/lib/utils";

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
      if (workspaceId) {
        loadProfiles(workspaceId);
      }
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

  const { workspaceId, workspaces } = useDashboard();

  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      const activeWorkspace = workspaces.find(w => w.id === workspaceId);
      setWorkspace(activeWorkspace || null);
      loadProfiles(workspaceId);
    }
  }, [workspaceId, workspaces]);

  useEffect(() => {
    if (searchParams.get('action') === 'connect' && workspace) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
      handleConnectProfile();
    }
  }, [searchParams, workspace]);

  const loadProfiles = async (currentWorkspaceId: string) => {
    setIsLoading(true);
    try {
      const supabaseAny = supabase as any;
      const { data: connections } = await supabaseAny
        .from('fb_connections')
        .select('id, name, access_token, status, created_at, expires_at')
        .eq('status', 'connected')
        .eq('workspace_id', currentWorkspaceId);

      setProfiles(connections || []);
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

    if (!workspace) {
      toast({ title: t('common.error', 'Error'), description: "Nenhum workspace selecionado. Verifique seu painel.", variant: "destructive" });
      return;
    }

    if (profiles.length >= workspace.max_fb_profiles) {
      toast({
        title: t('connections.limit_reached', "Limit reached"),
        description: t('connections.limit_description', { count: workspace.max_fb_profiles, defaultValue: `Your plan allows up to ${workspace.max_fb_profiles} profiles. Upgrade!` }),
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
      if (workspaceId) {
        loadProfiles(workspaceId);
      }
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



const Connections = ({ embedded = false }: { embedded?: boolean }) => {
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

  // WHATSAPP STATES
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [whatsappConnection, setWhatsappConnection] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionMethod, setConnectionMethod] = useState<'qrcode' | 'pairing'>('qrcode');

  const EVOLUTION_API_URL = 'https://evo.jotabot.site';
  const EVOLUTION_API_KEY = 'JotaBotEVO2025_API_Key_Definitiva';
  const EVOLUTION_MANAGER_URL = 'https://evo.jotabot.site/manager/';

  const refreshWhatsAppStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setWhatsappConnection(data);
        setWhatsappStatus(data.status as any);
      }
    } catch (err) {
      console.error('Error refreshing WhatsApp status:', err);
    }
  };

  const handleWhatsAppConnect = async () => {
    const LOG_TAG = '[WHATSAPP v2.2.3-FIX]';
    console.log(`%c${LOG_TAG} Direct API Connect`, 'background: #222; color: #bada55; font-size: 20px');
    setIsWhatsAppLoading(true);
    setQrCodeData(null);
    setShowQRCode(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const instanceName = `user${user.id.substring(0, 8)}`.replace(/[^a-zA-Z0-9]/g, '');
      console.log('[WHATSAPP] Target Instance:', instanceName);

      // 1. Tentar criar/verificar instância
      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
      });

      const createData = await createRes.json();
      console.log(`${LOG_TAG} Create Result (${createRes.status}):`, JSON.stringify(createData, null, 2));

      let qrBase64 = null;

      if (createRes.ok) {
        // Evolution v2.x returns QR in instance.qrcode.base64 or top-level qrcode.base64
        qrBase64 = createData.instance?.qrcode?.base64 || createData.qrcode?.base64 || createData.base64 || createData.code;
      } else if (createRes.status === 403 || createRes.status === 409 || createData.error?.includes('exists')) {
        console.log('[WHATSAPP] Instance exists, checking status first...');

        // 2. Antes de pedir QR, ver se já não está aberto
        const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          headers: { 'apikey': EVOLUTION_API_KEY }
        });
        const statusData = await statusRes.json();
        console.log('[WHATSAPP] Current Status:', statusData);

        if (statusData.instance?.state === 'open' || statusData.state === 'open') {
          setWhatsappStatus('connected');
          toast({ title: "WhatsApp Conectado!", description: "Sua instância já está ativa." });
          refreshWhatsAppStatus();
          setIsWhatsAppLoading(false);
          return;
        }

        // 3. Se não está aberto, pedir novo QR via connect
        console.log('[WHATSAPP] Fetching fresh QR via connect...');
        const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          headers: { 'apikey': EVOLUTION_API_KEY }
        });
        const connectData = await connectRes.json();
        console.log(`${LOG_TAG} Connect Result:`, JSON.stringify(connectData, null, 2));

        qrBase64 = connectData.instance?.qrcode?.base64 || connectData.base64 || connectData.qrcode?.base64 || connectData.code;

        // RETRY Logic: Se vier count: 0, significa que a sessão QR ainda não subiu no servidor
        if (!qrBase64 && connectData.count === 0) {
          console.log('[WHATSAPP] QR session pending (count: 0), retrying in 3s...');
          await new Promise(r => setTimeout(r, 3000));
          const retryRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
          });
          const retryData = await retryRes.json();
          console.log(`${LOG_TAG} Retry Result:`, JSON.stringify(retryData, null, 2));
          qrBase64 = retryData.instance?.qrcode?.base64 || retryData.base64 || retryData.qrcode?.base64 || retryData.code;
        }
      }

      if (qrBase64) {
        const finalQR = qrBase64.startsWith('data:image') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
        setQrCodeData(finalQR);
        setShowQRCode(true);
        setWhatsappStatus('connecting');
        toast({ title: "QR Code Gerado!", description: "Escaneie agora no seu celular." });
      } else {
        console.error('[WHATSAPP] Failed to capture QR code in any field');
        toast({
          title: "Erro ao gerar QR",
          description: "A API não liberou o código. Se persistir, clique em 'Reiniciar'.",
          variant: "destructive"
        });
      }

      // Sincronizar com o banco
      await (supabase as any).from('whatsapp_connections').upsert({
        user_id: user.id,
        instance_name: instanceName,
        status: (qrBase64 ? 'connecting' : 'disconnected'),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, instance_name' });

    } catch (error: any) {
      console.error('[WHATSAPP] Fatal connection error:', error);
      toast({ title: "Erro na conexão", description: error.message, variant: "destructive" });
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleWhatsAppCheckStatus = async () => {
    setIsWhatsAppLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('whatsapp-evolution', {
        body: { action: 'GET_STATUS' }
      });

      if (error) throw error;

      const status = data.instance?.state || data.state;
      console.log('[WHATSAPP] Current state:', status);

      if (status === 'open') {
        setWhatsappStatus('connected');
        toast({ title: "WhatsApp Conectado!", description: "Sua instância está ativa e pronta." });
      } else {
        toast({ title: "Ainda não conectado", description: "Certifique-se de ter escaneado o QR Code no Gerenciador." });
      }

      refreshWhatsAppStatus();
    } catch (err: any) {
      console.error('[WHATSAPP] Error checking status:', err);
      toast({ title: "Erro ao verificar status", description: err.message, variant: "destructive" });
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleWhatsAppPairingCode = async () => {
    if (!phoneNumber) return;
    setIsWhatsAppLoading(true);
    setPairingCode(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const instanceName = `user${user.id.substring(0, 8)}`.replace(/[^a-zA-Z0-9]/g, '');

      // 1. Garantir que a instância existe
      await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
      });

      // 2. Solicitar código de pareamento
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      console.log('[WHATSAPP] Requesting Pairing Code for:', cleanNumber);

      const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/pairing-code/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
        body: JSON.stringify({ number: cleanNumber, integration: 'WHATSAPP-BAILEYS' })
      });

      const data = await response.json();
      console.log('[WHATSAPP v2.2-FIX] Pairing Code Result:', response.status, JSON.stringify(data, null, 2));

      if (data.code || data.pairingCode) {
        setPairingCode(data.code || data.pairingCode);
        setWhatsappStatus('connecting');
        toast({ title: "Código Gerado!", description: "Insira-o no seu WhatsApp." });
      } else {
        throw new Error(data.message || data.error || "Não foi possível gerar o código.");
      }

    } catch (error: any) {
      console.error('[WHATSAPP] Pairing error:', error);
      toast({ title: "Erro no Pareamento", description: error.message, variant: "destructive" });
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleWhatsAppReset = async () => {
    setIsWhatsAppLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const instanceName = `user${user.id.substring(0, 8)}`.replace(/[^a-zA-Z0-9]/g, '');

      await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_API_KEY }
      });

      setWhatsappStatus('disconnected');
      setWhatsappConnection(null);
      setQrCodeData(null);
      setPairingCode(null);
      setShowQRCode(false);

      toast({ title: "Instância Reiniciada" });
      await (supabase as any).from('whatsapp_connections').delete().eq('user_id', user.id);
    } catch (err: any) {
      toast({ title: "Erro ao reiniciar", description: err.message, variant: "destructive" });
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleWhatsAppDisconnect = async () => {
    setIsWhatsAppLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const instanceName = `user${user.id.substring(0, 8)}`.replace(/[^a-zA-Z0-9]/g, '');

      await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_API_KEY }
      });

      await (supabase as any).from('whatsapp_connections').delete().eq('user_id', user.id);

      setWhatsappStatus('disconnected');
      setWhatsappConnection(null);
      setQrCodeData(null);
      setShowQRCode(false);
      toast({ title: "WhatsApp Desconectado" });
    } catch (err: any) {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  // ============= CHECK SESSION ON MOUNT =============
  useEffect(() => {
    const checkSession = async () => {
      console.log('🚀 [MOUNT] Componente montado - Verificando sessão');
      refreshWhatsAppStatus();

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
      const { data, error } = await (supabase as any).functions.invoke('get-meta-hierarchy', {
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
      const { data, error } = await (supabase as any).functions.invoke('get-meta-hierarchy', {
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
      const { data: existingToken } = await (supabase as any)
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
        const { error: updateError } = await (supabase as any)
          .from('meta_tokens')
          .update(tokenData)
          .eq('id', existingToken.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any)
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
        await (supabase as any).from('meta_tokens').update({ status: 'disconnected' }).eq('user_id', user.id);
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
    <div className={cn("w-full h-full space-y-8 animate-in fade-in duration-500", !embedded && "p-4 md:p-8")}>
      {!embedded && (
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('connections.title', 'Integrations')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('connections.subtitle', 'Connect your ad accounts and other platforms for a complete view.')}
            {userEmail && <span className="ml-1 text-foreground/80">({userEmail})</span>}
          </p>
        </div>
      )}

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

        {/* WhatsApp Integration Card - Replacement for Google Ads */}
        <div>
          <IntegrationCard
            icon={<MessageCircle className="h-7 w-7 text-emerald-600" />}
            title="WhatsApp"
            description={t('connections.whatsapp.connect_prompt', 'Conecte seu WhatsApp para centralizar suas conversas.')}
            status={whatsappStatus === 'connected' ? "connected" : "disconnected"}
            isLoading={isWhatsAppLoading}
            onConnect={handleWhatsAppConnect}
            onDisconnect={handleWhatsAppDisconnect}
            className="h-full border-border/50"
            actionLabel={t('common.connect', 'Conectar')}
          >
            <div className="space-y-4">
              {whatsappStatus !== 'connected' ? (
                <div className="space-y-4">
                  {/* Method Selector */}
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    <Button
                      variant={connectionMethod === 'qrcode' ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => {
                        setConnectionMethod('qrcode');
                        setShowQRCode(false);
                        setPairingCode(null);
                      }}
                    >
                      <QrCode className="w-3 h-3 mr-1.5" />
                      QR Code
                    </Button>
                    <Button
                      variant={connectionMethod === 'pairing' ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => {
                        setConnectionMethod('pairing');
                        setShowQRCode(false);
                        setPairingCode(null);
                      }}
                    >
                      <Phone className="w-3 h-3 mr-1.5" />
                      Código
                    </Button>
                  </div>

                  {connectionMethod === 'qrcode' ? (
                    <>
                      {!showQRCode && whatsappStatus === 'disconnected' ? (
                        <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center gap-2">
                          <p className="text-xs">
                            {t('connections.whatsapp.ready_to_connect', 'Pronto para configurar sua integração via QR Code.')}
                          </p>
                          <Button
                            size="sm"
                            className="mt-2 w-full"
                            onClick={handleWhatsAppConnect}
                            disabled={isWhatsAppLoading}
                          >
                            {isWhatsAppLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar QR Code
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-xl bg-background/50">
                          {/* QR Code Image */}
                          <div className="relative p-2 bg-white rounded-lg">
                            {qrCodeData ? (
                              <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48" />
                            ) : (
                              <div className="w-48 h-48 flex items-center justify-center">
                                <QrCode className="w-32 h-32 text-slate-300" />
                              </div>
                            )}
                            {isWhatsAppLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                              </div>
                            )}
                          </div>

                          {/* Status text */}
                          <div className="text-center space-y-1">
                            {qrCodeData ? (
                              <>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Escaneie o QR Code</p>
                                <p className="text-[10px] text-muted-foreground">Abra o WhatsApp no celular → Menu → Aparelhos Conectados → Conectar</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Gerando QR Code...</p>
                                <p className="text-[10px] text-muted-foreground">Aguarde, o código está sendo gerado pelo servidor</p>
                              </>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-col w-full gap-2">
                            <Button
                              size="sm"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={handleWhatsAppCheckStatus}
                              disabled={isWhatsAppLoading}
                            >
                              {isWhatsAppLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                              Verificar Conexão
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-xs"
                              onClick={handleWhatsAppConnect}
                              disabled={isWhatsAppLoading}
                            >
                              <QrCode className="mr-2 h-3 w-3" />
                              Gerar Novo QR Code
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-xs text-red-500 hover:text-red-600"
                              onClick={handleWhatsAppReset}
                              disabled={isWhatsAppLoading}
                            >
                              Cancelar e Reiniciar
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-medium uppercase text-muted-foreground">Método: Código de Pareamento</p>
                        <button
                          onClick={handleWhatsAppReset}
                          disabled={isWhatsAppLoading}
                          className="text-[10px] text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${isWhatsAppLoading ? 'animate-spin' : ''}`} />
                          Reiniciar Instância
                        </button>
                      </div>
                      {!pairingCode ? (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium uppercase text-muted-foreground ml-1">Número do WhatsApp (com 55 + DDD)</label>
                            <Input
                              placeholder="Ex: 5511999999999"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="h-10 text-sm"
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleWhatsAppPairingCode}
                            disabled={isWhatsAppLoading || !phoneNumber}
                          >
                            {isWhatsAppLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar Código de Pareamento
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-xl bg-background/50">
                          <div className="text-center space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider">Seu Código de Pareamento</p>
                            <div className="bg-primary/10 text-primary text-3xl font-mono font-bold tracking-[0.5em] py-4 px-6 rounded-lg border border-primary/20">
                              {pairingCode}
                            </div>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-[10px] text-muted-foreground leading-relaxed px-4">
                              No WhatsApp do celular: <b>Aparelhos Conectados</b> &gt; <b>Conectar com número de telefone</b>
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => setPairingCode(null)}
                          >
                            Tentar outro número
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 truncate">
                        {whatsappConnection?.phone_number || "Conectado"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Status: Logado e ativo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      onClick={() => window.location.href = '/whatsapp'}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Ver Conversas
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </IntegrationCard>
        </div>

      </div>
    </div>
  );
};

export default Connections;
