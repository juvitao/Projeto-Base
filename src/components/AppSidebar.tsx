import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import leverLogo from "@/assets/lever-logo.png";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { useAccountType } from "@/contexts/AccountTypeContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";

// Theme Toggle Button Component
function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-primary/10"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

import {
  LayoutDashboard,
  Users,
  Folder,
  Image,
  PieChart,
  BarChart3,
  FileText,
  Link,
  Settings,
  Bell,
  ShieldCheck,
  Briefcase,
  Sliders,
  UserCheck,
  UserCog,
  ChevronRight,
  LucideIcon,
  ClipboardList,
  Package,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

type IconComponent = LucideIcon;

interface MenuItem {
  title: string;
  transKey: string;
  url?: string;
  icon: IconComponent;
  submenu?: Array<{
    title: string;
    transKey: string;
    url: string;
    icon: IconComponent;
  }>;
}

// Menu items para o sistema Lever Digital
const mainMenuItems: MenuItem[] = [
  { title: "Visão Geral", transKey: "sidebar.dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", transKey: "sidebar.clients", url: "/clients", icon: Users },
  { title: "Demandas", transKey: "sidebar.tasks", url: "/tasks", icon: ClipboardList },
  { title: "Produtos", transKey: "Produtos", url: "/products", icon: Package },

  { title: "Ativos", transKey: "sidebar.account_groups", url: "/account-groups", icon: Briefcase },
  { title: "Conexões", transKey: "sidebar.connections", url: "/connections", icon: Link },
  {
    title: "Análises",
    transKey: "sidebar.reports",
    icon: PieChart,
    submenu: [
      { title: "Analytics", transKey: "sidebar.analytics", url: "/graficos", icon: BarChart3 },
      { title: "Relatórios", transKey: "sidebar.relatorios", url: "/relatorios", icon: FileText },
    ]
  },
  {
    title: "Ajustes",
    transKey: "sidebar.settings",
    icon: Settings,
    submenu: [
      { title: "Geral", transKey: "settings.tabs.general", url: "/settings?tab=general", icon: Sliders },
      { title: "Equipe", transKey: "settings.tabs.team", url: "/settings?tab=team", icon: Users },
      { title: "Notificações", transKey: "settings.tabs.notifications", url: "/settings?tab=notifications", icon: Bell },
      { title: "Governança", transKey: "settings.tabs.governance", url: "/settings?tab=governance", icon: ShieldCheck },
    ]
  },
];

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile, open, setOpen } = useSidebar();
  const location = useLocation();
  const { t } = useTranslation();
  const { isOwner, isAgency, setIsAgency } = useAccountType();
  const isCollapsed = state === "collapsed";
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const [initializedMenus, setInitializedMenus] = useState<{ [key: string]: boolean }>({});
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modo Admin (isAgency=true) ou Colaborador (isAgency=false)
  const isAdminMode = isAgency;

  // Hover to expand with debounce to prevent flickering
  const handleMouseEnter = () => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      if (!open) {
        setOpen(true);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && open) {
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const { canView } = usePermissions();

  // Map menu transKey to permission feature
  const getPermissionFeature = (transKey: string): string | null => {
    const map: Record<string, string> = {
      'sidebar.dashboard': 'dashboard',
      'sidebar.clients': 'clients',
      'sidebar.tasks': 'demands',
      'Produtos': 'products',
      'sidebar.connections': 'connections',
      'sidebar.account_groups': 'dashboard', // Ativos
      'sidebar.analytics': 'analytics',
      'sidebar.relatorios': 'reports',
      'settings.tabs.general': 'settings_general',
      'settings.tabs.team': 'team',
      'settings.tabs.notifications': 'notifications',
      'settings.tabs.governance': 'governance',
    };
    return map[transKey] || null;
  };

  // Filter menu items based on permissions
  const filteredMainMenu = useMemo(() => {
    const filterFn = (item: MenuItem) => {
      // Check permission for the item
      const feature = getPermissionFeature(item.transKey);
      if (feature && !canView(feature)) {
        return false;
      }

      // "Ativos" is only for COLABORADOR mode
      if (item.transKey === "sidebar.account_groups") {
        return !isAdminMode;
      }
      return true;
    };
    return mainMenuItems.filter(filterFn);
  }, [isAdminMode, canView]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleMode = () => {
    setIsAgency(!isAgency);
  };

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const renderIcon = (Icon: IconComponent, className?: string) => {
    // Fixed size icon container for consistency - strokeWidth 1.5 for uniform appearance
    return <Icon className={cn("h-[18px] w-[18px] shrink-0", className)} strokeWidth={1.5} />;
  };

  const renderMenuItem = (item: MenuItem) => {
    const itemTitle = t(item.transKey);

    if (item.submenu) {
      const isAnySubmenuActive = item.submenu?.some(sub => {
        if (sub.url.includes('?')) {
          const [path, query] = sub.url.split('?');
          return location.pathname === path && location.search === `?${query}`;
        }
        return location.pathname === sub.url;
      });

      const isOpen = initializedMenus[item.title]
        ? !!openMenus[item.title]
        : (openMenus[item.title] ?? isAnySubmenuActive);

      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={(open) => {
            setInitializedMenus(prev => ({ ...prev, [item.title]: true }));
            setOpenMenus(prev => ({ ...prev, [item.title]: open }));
          }}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={itemTitle}
                className={cn(
                  "w-full h-auto rounded-none border-none group",
                  !isCollapsed && "p-0"
                )}
                style={isCollapsed ? {
                  padding: '20px 0',
                  justifyContent: 'center',
                  width: '100%'
                } : undefined}
              >
                {isCollapsed ? (
                  <div className="flex items-center justify-center w-full">
                    {renderIcon(item.icon, isAnySubmenuActive ? "text-primary" : "")}
                  </div>
                ) : (
                  <div className={cn(
                    "relative flex items-center gap-3 px-5 py-2.5 transition-all duration-300 ease-out w-full",
                    isAnySubmenuActive
                      ? "text-foreground font-medium bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}>
                    {isAnySubmenuActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary group-hover:bg-primary" />
                    )}
                    {renderIcon(item.icon, isAnySubmenuActive ? "text-primary" : "")}
                    <span className="flex-1 text-left text-sm font-medium tracking-tight">{itemTitle}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!isCollapsed && (
              <CollapsibleContent>
                <SidebarMenuSub className="border-none ml-0 pl-0 pr-0 mr-0 w-full min-w-full block p-0">
                  {item.submenu?.map((subItem) => {
                    // Filter submenu items
                    if (subItem.transKey === "settings.tabs.team" && !isAgency) {
                      return null;
                    }

                    let isActive = false;
                    if (subItem.url.includes('?')) {
                      const [path, query] = subItem.url.split('?');
                      isActive = location.pathname === path && location.search === `?${query}`;
                    } else {
                      isActive = location.pathname === subItem.url;
                    }

                    const isSubActive = isActive;

                    return (
                      <SidebarMenuSubItem key={subItem.title} className="w-full p-0 m-0 block">
                        <SidebarMenuSubButton asChild className="w-full h-auto p-0 m-0 rounded-none border-none block hover:bg-transparent hover:text-inherit">
                          <NavLink
                            to={subItem.url}
                            onClick={handleNavClick}
                            className={cn(
                              "relative flex items-center gap-3 pl-10 pr-5 py-2 text-sm transition-all duration-200 w-full",
                              isSubActive
                                ? "text-white font-medium bg-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            {/* Background indicator region side line */}
                            {isSubActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white" />
                            )}
                            {/* Force text-white on icon when active with !important if needed, or just specific class order */}
                            {renderIcon(subItem.icon, cn("h-5 w-5 shrink-0 transition-colors", isSubActive ? "text-white !text-white stroke-white" : ""))}
                            {/* Removed leading-none to avoid cutting off descenders like 'g' */}
                            <span className="tracking-tight">{subItem.transKey ? t(subItem.transKey) : subItem.title}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </SidebarMenuItem>
        </Collapsible>
      );
    } else {
      const isActive = location.pathname === item.url;
      return (
        <SidebarMenuItem key={item.title}>

          <SidebarMenuButton
            asChild
            tooltip={itemTitle}
            className={cn(
              "w-full h-auto rounded-none border-none",
              !isCollapsed && "p-0"
            )}
            style={isCollapsed ? {
              padding: '20px 0',
              justifyContent: 'center',
              width: '100%'
            } : undefined}
          >
            {isCollapsed ? (
              <NavLink
                to={item.url!}
                onClick={handleNavClick}
                className="flex items-center justify-center w-full"
              >
                {renderIcon(item.icon, isActive ? "text-primary" : "")}
              </NavLink>
            ) : (
              <NavLink
                to={item.url!}
                onClick={handleNavClick}
                className={cn(
                  "relative flex items-center gap-3 px-5 py-2.5 transition-all duration-300 ease-out font-medium w-full",
                  isActive
                    ? "text-foreground bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary" />
                )}
                {renderIcon(item.icon, isActive ? "text-primary" : "")}
                <span className="flex-1 text-left text-sm tracking-tight">{itemTitle}</span>
              </NavLink>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
  };

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Sidebar collapsible="icon" className="border-r border-border bg-background">
        {/* Header - adapts to collapsed state */}
        <div className={cn(
          "flex h-16 items-center border-b border-border/50 transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-5"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <img src={leverLogo} alt="Lever" className="h-7 w-auto" />
              <span className="font-semibold text-lg text-foreground tracking-tight">Digital</span>
            </div>
          ) : (
            <img src={leverLogo} alt="Lever" className="h-6 w-6 object-contain" />
          )}
        </div>

        <SidebarContent className="p-0">
          {/* Main Menu */}
          <SidebarGroup className="p-0 pt-2">
            <SidebarGroupContent className="p-0">
              <SidebarMenu className="gap-0 text-sidebar-foreground">
                {filteredMainMenu.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className={cn(
          "p-4 border-t border-border/50 transition-all duration-200 space-y-3",
          isCollapsed && "items-center px-0"
        )}>
          {/* Logout Button */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-xs text-muted-foreground">Conta</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}

          {/* Theme Toggle Button */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeToggleButton />
            </div>
          ) : (
            <ThemeToggleButton />
          )}
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}

