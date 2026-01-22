import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, MousePointer, Zap, RefreshCw, SlidersHorizontal, Check, ArrowUpDown, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { DateRange } from "react-day-picker";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { useAnalyticsData, AnalyticsTab, FilterType } from "@/hooks/useAnalyticsData";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { FunnelChart } from "@/components/charts/FunnelChart";

// Premium Tooltip (Mantido)
const CustomTooltip = ({ active, payload, label, t, i18n }: any) => {
  if (active && payload && payload.length) {
    // Enhanced label logic for detailed charts
    let displayLabel = label;
    if (payload[0]?.payload) {
      const data = payload[0].payload;
      if (data.placement) displayLabel = `${data.platform} - ${data.placement}`;
      else if (data.region) displayLabel = data.region;
    }

    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    const currency = i18n.language.startsWith('pt') ? 'BRL' : 'USD';
    const currencySymbol = i18n.language.startsWith('pt') ? 'R$' : 'US$';

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-bold text-foreground mb-2">{t(`analytics.funnel.${displayLabel}`, displayLabel)}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-muted-foreground">
                {entry.name === 'reach' ? t('analytics.metrics.reach', 'Reach') :
                  entry.name === 'results' ? t('analytics.metrics.results', 'Results') :
                    entry.name === 'value' ? t('analytics.metrics.conversions', 'Conversions') :
                      entry.name === 'spend' ? t('analytics.metrics.spend', 'Spend') :
                        entry.name === 'revenue' ? t('analytics.metrics.revenue', 'Revenue') :
                          entry.name}
              </span>
            </div>
            <span className="font-medium text-foreground">
              {typeof entry.value === 'number'
                ? entry.name.includes('ROAS') ? `${entry.value.toFixed(2)}x`
                  : (entry.name.includes('R$') || entry.name.includes('US$') || entry.name === 'Investimento' || entry.name === 'Receita' || entry.name === 'Spend' || entry.name === 'Revenue' || entry.name === 'Gasto' || entry.name === 'CPL' || entry.name === 'Custo' || entry.name === 'Cost')
                    ? `${currencySymbol} ${entry.value.toLocaleString(locale, { minimumFractionDigits: 2 })}`
                    : (entry.name.includes('%') || entry.name === 'CTR' || entry.name === 'Taxa' || entry.name === 'Rate' || entry.name === 'ROI')
                      ? `${entry.value.toFixed(1)}%`
                      : Math.round(entry.value).toLocaleString(locale)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};



// KPI Card Component
const KpiCard = ({ title, value, change, changeType, icon: Icon, colorClass = "text-primary", loading }: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  colorClass?: string;
  loading?: boolean;
}) => (
  <Card className="border-border/50">
    <CardContent className="p-4">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] sm:text-xs font-semibold",
                changeType === 'positive' && "text-green-500",
                changeType === 'negative' && "text-red-500",
                changeType === 'neutral' && "text-muted-foreground"
              )}>
                {changeType === 'positive' ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> :
                  changeType === 'negative' ? <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : null}
                <span>{change}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2 sm:p-2.5 rounded-lg shrink-0", colorClass.replace("text-", "bg-") + "/10")}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", colorClass)} />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// Chart Colors
const COLORS = {
  primary: "#dc2626",
  secondary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  muted: "#6b7280",
  accent: "#8b5cf6",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
};

export default function Graficos() {
  const navigate = useNavigate();
  // Use 'all' primarily, or let user filter (if we add objective filter to personalizer later)
  // For now, removing tab UI means showing aggregated data "all".
  const activeTab: AnalyticsTab = 'all';

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [filterType, setFilterType] = useState<FilterType>("month");

  // Hook Real
  const { metrics, charts, topCreatives, isLoading, refetch } = useAnalyticsData(activeTab, filterType, dateRange);
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language.startsWith('pt') ? ptBR : enUS;

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) setFilterType("custom");
  };

  const getFilterLabel = () => {
    if (filterType === 'today') return t('analytics.today', 'Today');
    if (filterType === '7d') return t('analytics.last_7_days', 'Last 7 days');
    if (filterType === 'month') return t('analytics.last_30_days', 'Last 30 days');
    if (dateRange?.from && dateRange?.to) return `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`;
    return t('analytics.period', 'Period');
  }

  // Widget Personalization State
  const [visibleWidgets, setVisibleWidgets] = useState({
    kpis: true,
    dailyEvolution: true,
    radar: true,
    funnel: true,
    topCreatives: true
  });

  const toggleWidget = (key: keyof typeof visibleWidgets) => {
    setVisibleWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 space-y-4 pt-4 px-4 md:pt-6 md:px-8 pb-8 bg-background min-h-screen">

      {/* Unified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t('sidebar.analytics', 'Analytics')}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">{t('analytics.unified_performance_analysis', 'Unified performance analysis')}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            {/* "Personalizer" */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 border-border/60 flex-1 sm:flex-none justify-center bg-background rounded-none">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('analytics.customize', 'Customize')}</span>
                  <span className="sm:hidden text-xs font-semibold">{t('analytics.blocks', 'Blocks')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{t('analytics.display_blocks', 'Display Blocks')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={visibleWidgets.kpis} onCheckedChange={() => toggleWidget('kpis')}>
                  {t('analytics.indicators', 'Indicators (KPIs)')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleWidgets.dailyEvolution} onCheckedChange={() => toggleWidget('dailyEvolution')}>
                  {t('analytics.daily_evolution', 'Daily Evolution')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleWidgets.radar} onCheckedChange={() => toggleWidget('radar')}>
                  {t('analytics.metrics_radar', 'Metrics Radar')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleWidgets.funnel} onCheckedChange={() => toggleWidget('funnel')}>
                  {t('analytics.conversion_funnel', 'Conversion Funnel')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleWidgets.topCreatives} onCheckedChange={() => toggleWidget('topCreatives')}>
                  {t('analytics.creatives_battle', 'Creatives Battle')}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" className="h-10 w-10 border-border/60 shrink-0 sm:hidden bg-background rounded-none">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Unified Date Picker Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 pl-3 pr-2 gap-3 flex-1 sm:min-w-[200px] justify-start font-normal border-border/60 shadow-sm rounded-none">
                  <span className="truncate flex-1 text-left text-sm">{getFilterLabel()}</span>
                  <div className="flex items-center pl-2 border-l border-border/50 h-3/5 my-auto">
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col sm:flex-row">
                  {/* Side Presets */}
                  <div className="flex flex-row sm:flex-col p-2 gap-1 border-b sm:border-b-0 sm:border-r border-border/50 overflow-x-auto no-scrollbar sm:w-[140px]">
                    <Button variant="ghost" size="sm" className="justify-center sm:justify-start text-xs font-normal whitespace-nowrap" onClick={() => { setFilterType('today'); setDateRange({ from: new Date(), to: new Date() }) }}>
                      {t('analytics.today', 'Today') as string}
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-center sm:justify-start text-xs font-normal whitespace-nowrap" onClick={() => { setFilterType('7d'); setDateRange({ from: new Date(Date.now() - 7 * 864e5), to: new Date() }) }}>
                      {t('analytics.last_7_days', 'Last 7 days') as string}
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-center sm:justify-start text-xs font-normal whitespace-nowrap" onClick={() => { setFilterType('month'); setDateRange({ from: new Date(Date.now() - 30 * 864e5), to: new Date() }) }}>
                      {t('analytics.last_30_days', 'Last 30 days') as string}
                    </Button>
                  </div>
                  {/* Calendar */}
                  <div className="p-0 flex justify-center">
                    <Calendar mode="range" selected={dateRange} onSelect={handleRangeSelect} numberOfMonths={window.innerWidth > 640 ? 2 : 1} locale={currentLocale} initialFocus />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" className="h-10 w-10 border-border/60 shrink-0 hidden sm:flex bg-background rounded-none">
              <Download className="h-4 w-4" />
            </Button>

            {/* Refresh Button - Moved to far right */}
            <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading} className="h-10 w-10 border-border/60 shrink-0 bg-background rounded-none" title={t('common.sync', 'Sync') as string}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* KPI Cards Row */}
        {visibleWidgets.kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title={t('analytics.metrics.spend', 'Investment')}
              value={metrics.spend.toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', { style: "currency", currency: i18n.language.startsWith('pt') ? "BRL" : "USD" })}
              icon={DollarSign}
              loading={isLoading}
              colorClass="text-primary"
            />
            <KpiCard
              title="ROAS"
              value={`${metrics.roas.toFixed(2)}x`}
              icon={TrendingUp}
              loading={isLoading}
              colorClass="text-green-500"
            />
            <KpiCard
              title={t('analytics.metrics.conversions', 'Conversions (General)')}
              value={metrics.conversions.toString()}
              icon={ShoppingCart}
              loading={isLoading}
              colorClass="text-purple-500"
            />
            <KpiCard
              title={t('analytics.metrics.revenue', 'Revenue / Value')}
              value={metrics.revenue.toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', { style: "currency", currency: i18n.language.startsWith('pt') ? "BRL" : "USD" })}
              icon={DollarSign}
              loading={isLoading}
              colorClass="text-blue-500"
            />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-12 gap-4">

          {/* Evolução Financeira / Diária */}
          {visibleWidgets.dailyEvolution && (
            <Card className="col-span-12 lg:col-span-8 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.daily_evolution', 'Daily Evolution')}</CardTitle>
                <CardDescription className="text-xs">{t('analytics.spend_vs_return', 'Investment vs Return')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[450px]">
                  {isLoading ? <div className="h-full flex items-center justify-center"><Skeleton className="h-[240px] w-full" /></div> : (
                    <div className="h-full w-full p-1 border border-dashed border-border/40 rounded-lg bg-muted/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={charts.dailyEvolution} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" stroke="currentColor" opacity={0.15} vertical={true} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
                            axisLine={false}
                            tickLine={false}
                            padding={{ left: 10, right: 10 }}
                            scale="point"
                            dy={10}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                            tickFormatter={(v) => i18n.language.startsWith('pt') ? `R$${(v / 1000).toFixed(0)}k` : `$${(v / 1000).toFixed(0)}k`}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
                            axisLine={false}
                            tickLine={false}
                            width={30}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            hide={true}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(20, 20, 25, 0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '4px',
                              backdropFilter: 'blur(10px)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '8px', fontSize: '12px' }}
                            formatter={(value: any, name: any) => [
                              typeof value === 'number' ?
                                (name === 'spend' || name === 'revenue' ?
                                  value.toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', { style: 'currency', currency: i18n.language.startsWith('pt') ? 'BRL' : 'USD' })
                                  : value)
                                : value,
                              name === 'spend' ? t('analytics.metrics.spend', 'Investment') : name === 'revenue' ? t('analytics.metrics.revenue', 'Revenue') : name
                            ]}
                          />
                          <Legend
                            verticalAlign="top"
                            height={40}
                            iconSize={12}
                            wrapperStyle={{ top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', display: 'flex', justifyContent: 'center' }}
                            formatter={(value) => (
                              <span className="text-sm font-medium text-foreground ml-1.5 mr-4">
                                {value === 'spend' ? t('analytics.metrics.spend', 'Investment') : value === 'revenue' ? t('analytics.metrics.revenue', 'Revenue') : value}
                              </span>
                            )}
                          />

                          <Line
                            yAxisId="left"
                            type="linear"
                            dataKey="spend"
                            name="spend"
                            stroke={COLORS.primary}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Line
                            yAxisId="left"
                            type="linear"
                            dataKey="revenue"
                            name="revenue"
                            stroke={COLORS.success}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Radar Score */}
          {visibleWidgets.radar && (
            <Card className="col-span-12 lg:col-span-4 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.metrics_radar', 'Secondary Metrics')}</CardTitle>
                <CardDescription className="text-xs">{t('analytics.performance_analysis', 'Relative performance analysis')}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-[450px]">
                  {isLoading ? <div className="h-full flex items-center justify-center"><Skeleton className="h-[240px] w-[240px] rounded-full" /></div> : (
                    <div className="h-full w-full p-1 border border-dashed border-border/40 rounded-lg bg-muted/5 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="90%" data={charts.radar} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                          <PolarGrid gridType="polygon" stroke="currentColor" opacity={0.1} />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name={t('analytics.metrics.score', 'Score')} dataKey="value" stroke={COLORS.primary} strokeWidth={2} fill={COLORS.primary} fillOpacity={0.4} />
                          <Tooltip content={<CustomTooltip t={t} i18n={i18n} />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Funil */}
          {visibleWidgets.funnel && (
            <Card className="col-span-12 md:col-span-4 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('analytics.conversion_funnel', 'Conversion Funnel')}</CardTitle>
                <CardDescription className="text-xs">{t('analytics.conversion_rate_by_stage', 'Conversion rate by stage')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-2 h-[450px] relative">
                <div className="h-full w-full">
                  {isLoading ? <Skeleton className="h-full w-full" /> : (
                    <div className="h-full w-full flex items-center justify-center">
                      <FunnelChart data={charts.funnel} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Melhores Criativos (Ad Level) */}
          {visibleWidgets.topCreatives && (
            <Card className="col-span-12 md:col-span-8 border-border/50">
              <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0 pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">{t('analytics.top_creatives', 'Best Creatives')}</CardTitle>
                  <CardDescription>{t('analytics.top_creatives_desc', 'Performance of the best ads')}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0 h-[450px]">
                <div className="h-full overflow-y-auto pr-2">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : topCreatives.length > 0 ? (
                    <div className="rounded-md border border-border overflow-hidden overflow-x-auto no-scrollbar">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-muted-foreground pl-4 border-r border-border w-[50px] text-center align-middle">#</TableHead>
                            <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-muted-foreground border-r border-border min-w-[200px] align-middle">{t('analytics.table.creative', 'Creative')}</TableHead>
                            <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-muted-foreground border-r border-border align-middle">{t('analytics.metrics.cost', 'Cost')}</TableHead>
                            <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-muted-foreground border-r border-border align-middle">{t('analytics.metrics.conv_value', 'Conv. Value')}</TableHead>
                            <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-muted-foreground border-r border-border align-middle">ROAS</TableHead>
                            <TableHead className="h-10 text-xs font-bold uppercase tracking-wider text-muted-foreground align-middle">CPA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topCreatives.slice(0, 8).map((ad, index) => (
                            <TableRow key={ad.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                              <TableCell className="py-4 pl-4 border-r border-border text-center">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted border border-border text-[10px] font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors mx-auto">
                                  {index + 1}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 border-r border-border">
                                <span className="font-medium text-sm text-foreground max-w-[250px] truncate block" title={ad.name}>
                                  {ad.name}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 border-r border-border text-xs font-semibold text-muted-foreground">
                                {ad.spend.toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', { style: 'currency', currency: i18n.language.startsWith('pt') ? "BRL" : "USD", maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="py-4 border-r border-border text-xs font-semibold text-muted-foreground">
                                {ad.revenue?.toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', { style: 'currency', currency: i18n.language.startsWith('pt') ? "BRL" : "USD", maximumFractionDigits: 2 }) || (i18n.language.startsWith('pt') ? 'R$ 0,00' : '$0.00')}
                              </TableCell>
                              <TableCell className="py-4 border-r border-border">
                                <span className={cn(
                                  "text-xs font-bold",
                                  ad.roas >= 2.0 ? "text-emerald-500" :
                                    ad.roas >= 1.0 ? "text-primary" : "text-red-500"
                                )}>
                                  {ad.roas.toFixed(2)}x
                                </span>
                              </TableCell>
                              <TableCell className="py-4 text-xs font-semibold text-muted-foreground">
                                {ad.cpa.toLocaleString(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', { style: 'currency', currency: i18n.language.startsWith('pt') ? "BRL" : "USD", maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-8 text-center">
                      <p>{t('analytics.no_ads_found', 'No ads found.')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Segmentation & Demographics Section */}
          <Card className="col-span-12 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('analytics.segmentation_analysis', 'Segmentation Analysis')}</CardTitle>
              <CardDescription className="text-xs">{t('analytics.segmentation_analysis_desc', 'Detailed view of the audience')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="demographics" className="w-full">
                <div className="border-b overflow-x-auto no-scrollbar">
                  <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent space-x-6 min-w-max pb-px">
                    <TabsTrigger value="demographics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground shadow-none">
                      {t('analytics.tabs.demographics', 'Demographics')}
                    </TabsTrigger>
                    <TabsTrigger value="placements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground shadow-none">
                      {t('analytics.tabs.platform', 'Platform')}
                    </TabsTrigger>
                    <TabsTrigger value="locations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-sm text-muted-foreground data-[state=active]:text-foreground shadow-none">
                      {t('analytics.tabs.location', 'Location')}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="mt-6 h-[300px] w-full">
                  <TabsContent value="demographics" className="h-full mt-0 p-1 border border-dashed border-border/40 rounded-lg bg-muted/5 relative overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                      style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                      }}
                    />
                    {/* Age & Gender Chart */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.demographics} margin={{ top: 25, right: 10, left: 0, bottom: 10 }} barGap={2} barCategoryGap="25%">
                        {/* No internal grid lines to avoid clash with background */}
                        <CartesianGrid strokeDasharray="4 4" vertical={false} horizontal={false} stroke="currentColor" opacity={0} />

                        {/* Solid Base Line & Ticks for Anchoring */}
                        <XAxis
                          dataKey="ageRange"
                          axisLine={{ stroke: 'currentColor', opacity: 0.2, strokeWidth: 1 }}
                          tickLine={{ stroke: 'currentColor', opacity: 0.2, height: 5 }}
                          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7, dy: 5 }}
                          dy={5}
                        />

                        {/* Vertical Axis Line for Data Anchoring */}
                        <YAxis
                          axisLine={{ stroke: 'currentColor', opacity: 0.2, strokeWidth: 1 }}
                          tickLine={{ stroke: 'currentColor', opacity: 0.2, width: 5 }}
                          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7, dx: -5 }}
                        />

                        <Tooltip
                          cursor={{ fill: 'currentColor', opacity: 0.05 }}
                          contentStyle={{
                            backgroundColor: 'rgba(20, 20, 25, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            backdropFilter: 'blur(10px)',
                            color: '#fff'
                          }}
                          formatter={(value: number, name: string) => [value, name === 'male' ? t('analytics.metrics.men', 'Men') : t('analytics.metrics.women', 'Women')]}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          height={30}
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: '10px', opacity: 0.8 }}
                          formatter={(value) => <span className="text-xs font-medium ml-1">{value === 'male' ? t('analytics.metrics.men', 'Men') : t('analytics.metrics.women', 'Women')}</span>}
                        />
                        <Bar dataKey="male" name="male" fill={COLORS.secondary} radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="female" name="female" fill={COLORS.pink} radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="placements" className="h-full mt-0 p-1 border border-dashed border-border/40 rounded-lg bg-muted/5 relative overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                      style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                      }}
                    />
                    {/* Placements Chart */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.placements} margin={{ top: 25, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} horizontal={false} stroke="currentColor" opacity={0} />
                        <XAxis
                          dataKey="platform"
                          axisLine={{ stroke: 'currentColor', opacity: 0.2, strokeWidth: 1 }}
                          tickLine={{ stroke: 'currentColor', opacity: 0.2, height: 5 }}
                          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7, dy: 5 }}
                          interval={0}
                          dy={5}
                        />
                        <YAxis
                          axisLine={{ stroke: 'currentColor', opacity: 0.2, strokeWidth: 1 }}
                          tickLine={{ stroke: 'currentColor', opacity: 0.2, width: 5 }}
                          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7, dx: -5 }}
                        />
                        <Tooltip content={<CustomTooltip t={t} i18n={i18n} />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          height={30}
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: '10px', opacity: 0.8 }}
                          formatter={(value) => <span className="text-xs font-medium ml-1">{value === 'reach' ? t('analytics.metrics.reach', 'Reach') : t('analytics.metrics.results', 'Results')}</span>}
                        />
                        <Bar dataKey="results" name="results" radius={[4, 4, 0, 0]} maxBarSize={80}>
                          {charts.placements.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={[COLORS.secondary, COLORS.pink, COLORS.teal, COLORS.warning, COLORS.accent][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="locations" className="h-full mt-0 p-1 border border-dashed border-border/40 rounded-lg bg-muted/5 relative overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                      style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                      }}
                    />
                    {/* Locations Chart */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.locations} margin={{ top: 25, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} horizontal={false} stroke="currentColor" opacity={0} />
                        <XAxis
                          dataKey="region"
                          axisLine={{ stroke: 'currentColor', opacity: 0.2, strokeWidth: 1 }}
                          tickLine={{ stroke: 'currentColor', opacity: 0.2, height: 5 }}
                          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7, dy: 5 }}
                          interval={0}
                          dy={5}
                        />
                        <YAxis
                          axisLine={{ stroke: 'currentColor', opacity: 0.2, strokeWidth: 1 }}
                          tickLine={{ stroke: 'currentColor', opacity: 0.2, width: 5 }}
                          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.7, dx: -5 }}
                        />
                        <Tooltip content={<CustomTooltip t={t} i18n={i18n} />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                        <Bar dataKey="value" name="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
                          {charts.locations.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={[COLORS.indigo, COLORS.success, COLORS.warning, COLORS.primary, COLORS.teal, COLORS.secondary][index % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

        </div>
      </div>
    </div >
  );
};


