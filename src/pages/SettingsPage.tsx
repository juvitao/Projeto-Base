import { useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAccountType } from "@/contexts/AccountTypeContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Bell, Shield, Settings, Check, Globe, Clock, Moon, Sun, Minus, LogOut, User, Building2, Users, Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import UsageProgressBar from "@/components/UsageProgressBar";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { NotificationSettingsForm } from "@/components/NotificationSettingsForm";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import Profile from "./Profile";
import TeamConnections from "./TeamConnections";

const SettingsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: planUsage, isLoading: isLoadingUsage } = usePlanUsage();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { accountType, setAccountType, isAgency, isOwner } = useAccountType();
  const queryClient = useQueryClient();
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  // Fetch archived clients
  const { data: archivedClients = [], isLoading: isLoadingArchived } = useQuery({
    queryKey: ['archived_clients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_clients')
        .select('id, name, fee_fixed, commission_rate, created_at, logo_url')
        .eq('is_archived', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // State for AI Language
  const [aiLanguage, setAiLanguage] = useState<string>(
    localStorage.getItem('lads_ai_language') || 'pt-BR'
  );
  const [agencyName, setAgencyName] = useState(localStorage.getItem('lads_agency_name') || '');
  const [agencyLogoUrl, setAgencyLogoUrl] = useState(localStorage.getItem('lads_agency_logo_url') || '');

  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    localStorage.setItem('i18nextLng', value);
  };

  const handleAiLanguageChange = (value: string) => {
    setAiLanguage(value);
    localStorage.setItem('lads_ai_language', value);
  };

  const handleSaveGeneral = () => {
    toast({
      title: t('settings.saved_success'),
      description: t('settings.saved_desc'),
    });
  };

  const handleSaveAgency = () => {
    localStorage.setItem('lads_agency_name', agencyName);
    localStorage.setItem('lads_agency_logo_url', agencyLogoUrl);
    toast({
      title: t('reports.config.whitelabel.save_success', "Configurações da Agência Salvas"),
      description: t('reports.config.whitelabel.save_desc', "As informações da sua marca foram atualizadas."),
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const PricingCard = ({
    title,
    price,
    description,
    features,
    excludedFeatures = [],
    isCurrent,
    limit
  }: {
    title: string,
    price: string,
    description: string,
    features: string[],
    excludedFeatures?: string[],
    isCurrent: boolean,
    limit: string
  }) => (
    <Card className={`relative flex flex-col transition-all duration-300 ${isCurrent ? 'ring-2 ring-primary bg-slate-50 dark:bg-slate-900 scale-[1.02]' : 'hover:-translate-y-1'}`}>
      {isCurrent && (
        <div className="absolute -top-3 right-4 bg-meta-gradient text-white text-xs font-bold px-3 py-1 rounded-full">
          {isCurrent ? t('plans.current_plan') : ''}
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold tracking-tight">{price}</span>
          <span className="text-muted-foreground">{t('plans.per_month')}</span>
        </div>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className={`mb-6 p-3 rounded-lg border ${isCurrent ? 'bg-primary/10 border-primary/20 dark:bg-primary/20 dark:border-primary/30' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'}`}>
          <p className={`text-sm font-medium flex items-center gap-2 ${isCurrent ? 'text-primary dark:text-primary-foreground' : 'text-slate-700 dark:text-slate-300'}`}>
            <Check className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-slate-500'}`} />
            {t('plans.limit_label', { limit })}
          </p>
        </div>
        <ul className="space-y-3 text-sm">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-primary/20 dark:bg-primary/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                <Check className={`h-3 w-3 ${isCurrent ? 'text-primary dark:text-primary-foreground' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <span className="text-foreground/80">{feature}</span>
            </li>
          ))}
          {excludedFeatures.map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-muted-foreground/50">
              <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Minus className="h-3 w-3 text-gray-400" />
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className={`w-full font-semibold ${isCurrent ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/30' : 'bg-meta-gradient text-white'}`}
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent}
        >
          {isCurrent ? t('plans.your_plan') : t('plans.upgrade')}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="pt-8 pb-10 px-2 md:px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </div>

      <Tabs defaultValue={currentTab} value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-[700px] rounded-lg">

          <TabsTrigger
            value="general"
            className="flex items-center gap-2 rounded-lg dark:data-[state=active]:bg-red-600 dark:data-[state=active]:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">{t('settings.tabs.general')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex items-center gap-2 rounded-lg dark:data-[state=active]:bg-red-600 dark:data-[state=active]:text-white transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">{t('settings.tabs.team')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 rounded-lg dark:data-[state=active]:bg-red-600 dark:data-[state=active]:text-white transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">{t('settings.tabs.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="flex items-center gap-2 rounded-lg dark:data-[state=active]:bg-red-600 dark:data-[state=active]:text-white transition-colors"
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Arquivados</span>
            {archivedClients.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{archivedClients.length}</Badge>
            )}
          </TabsTrigger>

        </TabsList>



        {/* ABA GERAL */}
        <TabsContent value="general" className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>{t('settings.system_pref')}</CardTitle>
              <CardDescription>{t('settings.system_pref_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* THEME */}
                <div className="space-y-2">
                  <Label>{t('settings.theme')}</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" /> {t('settings.light')}
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" /> {t('settings.dark')}
                        </div>
                      </SelectItem>
                      <SelectItem value="system">{t('settings.system')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* UI LANGUAGE */}
                <div className="space-y-2">
                  <Label>{t('settings.language')}</Label>
                  <Select value={i18n.language.split('-')[0]} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">
                        <div className="flex items-center gap-2">
                          {t('common.pt_br')}
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          {t('common.en_us')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI LANGUAGE */}
                <div className="space-y-2">
                  <Label>{t('settings.ai_language')}</Label>
                  <Select value={aiLanguage} onValueChange={handleAiLanguageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">
                        <div className="flex items-center gap-2">
                          {t('common.pt_br')}
                        </div>
                      </SelectItem>
                      <SelectItem value="en-US">
                        <div className="flex items-center gap-2">
                          {t('common.en_us')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.ai_language_desc')}
                  </p>
                </div>

                {/* TIMEZONE */}
                <div className="space-y-2">
                  <Label>{t('settings.timezone')}</Label>
                  <Select defaultValue="gmt-3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmt-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" /> {t('settings.timezone_br')}
                        </div>
                      </SelectItem>
                      <SelectItem value="utc">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" /> UTC
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.timezone_desc')}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSaveGeneral}
                variant="destructive"
                className="rounded-lg h-10 px-8"
              >
                {t('settings.save')}
              </Button>
            </CardFooter>
          </Card>



          {/* Account Type Toggle */}


          {/* Logout Section */}
          <Card className="border-destructive/20 rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <LogOut className="h-5 w-5" />
                {t('settings.account_section')}
              </CardTitle>
              <CardDescription>{t('settings.logout_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full sm:w-auto rounded-lg h-11 px-8"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('settings.logout_button')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA EQUIPE */}
        <TabsContent value="team" className="space-y-6">
          <TeamConnections embedded={true} />
        </TabsContent>

        {/* ABA NOTIFICAÇÕES */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettingsForm />
        </TabsContent>

        {/* ABA CLIENTES ARQUIVADOS */}
        <TabsContent value="archived" className="space-y-6">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-orange-500" />
                Clientes Arquivados
              </CardTitle>
              <CardDescription>
                Clientes que foram arquivados não aparecem na listagem principal. Você pode desarquivá-los a qualquer momento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingArchived ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : archivedClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum cliente arquivado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {archivedClients.map((client: any) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img src={client.logo_url} alt={client.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Arquivado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unarchivingId === client.id}
                          onClick={async () => {
                            setUnarchivingId(client.id);
                            try {
                              const { error } = await (supabase as any)
                                .from('agency_clients')
                                .update({ is_archived: false })
                                .eq('id', client.id);
                              if (error) throw error;
                              toast({
                                title: "Cliente desarquivado!",
                                description: `${client.name} voltou para a lista de clientes ativos.`,
                              });
                              queryClient.invalidateQueries({ queryKey: ['archived_clients'] });
                              queryClient.invalidateQueries({ queryKey: ['clients'] });
                            } catch (err: any) {
                              toast({
                                variant: "destructive",
                                title: "Erro",
                                description: err.message || "Não foi possível desarquivar.",
                              });
                            } finally {
                              setUnarchivingId(null);
                            }
                          }}
                        >
                          {unarchivingId === client.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ArchiveRestore className="w-4 h-4 mr-2" />
                              Desarquivar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (!confirm(`Tem certeza que deseja excluir permanentemente o cliente ${client.name}?`)) return;

                            try {
                              const { error } = await (supabase as any)
                                .from('clients')
                                .delete()
                                .eq('id', client.id);

                              if (error) throw error;

                              toast({
                                title: "Cliente excluído!",
                                description: `${client.name} foi removido permanentemente.`,
                              });
                              queryClient.invalidateQueries({ queryKey: ['archived_clients'] });
                            } catch (err: any) {
                              toast({
                                variant: "destructive",
                                title: "Erro",
                                description: err.message || "Não foi possível excluir o cliente.",
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>




      </Tabs>
    </div>
  );
};

export default SettingsPage;
