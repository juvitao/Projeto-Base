import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
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
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VoraLogo } from "./VoraLogo";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  LayoutDashboard,
  Users,
  Package,
  CircleDollarSign,
  ShoppingCart,
  MessageCircle,
  Settings,
  ShieldCheck,
  Bell,
  Sliders,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  LucideIcon,
  User,
  Mail,
  Phone,
  Edit,
  MoreVertical,
  Check
} from "lucide-react";

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
        <Sun className="h-4 w-4 text-primary" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

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

const mainMenuItems: MenuItem[] = [
  { title: "DASHBOARD", transKey: "DASHBOARD", url: "/", icon: LayoutDashboard },
  { title: "CLIENTES", transKey: "CLIENTES", url: "/clients", icon: Users },
  { title: "ESTOQUE", transKey: "ESTOQUE", url: "/stock", icon: Package },
  { title: "FINANCEIRO", transKey: "FINANCEIRO", url: "/financial", icon: CircleDollarSign },
  { title: "VENDAS", transKey: "VENDAS", url: "/sales", icon: ShoppingCart },
  { title: "WHATSAPP", transKey: "WHATSAPP", url: "/whatsapp", icon: MessageCircle },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile, open, setOpen } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const [initializedMenus, setInitializedMenus] = useState<{ [key: string]: boolean }>({});

  // Filter menu items (simple for now)
  const filteredMainMenu = mainMenuItems;

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const renderIcon = (Icon: IconComponent, className?: string) => {
    return <Icon className={cn("h-[18px] w-[18px] shrink-0", className)} strokeWidth={2} />;
  };

  const renderMenuItem = (item: MenuItem) => {
    const itemTitle = item.title;

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
                      ? "text-foreground font-bold bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}>
                    {isAnySubmenuActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary group-hover:bg-primary" />
                    )}
                    {renderIcon(item.icon, isAnySubmenuActive ? "text-primary" : "")}
                    <span className="flex-1 text-left text-[10px] font-black tracking-[0.1em] uppercase">{itemTitle}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!isCollapsed && (
              <CollapsibleContent>
                <SidebarMenuSub className="border-none ml-0 pl-0 pr-0 mr-0 w-full min-w-full block p-0">
                  {item.submenu?.map((subItem) => {
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
                            className={cn(
                              "relative flex items-center gap-3 pl-10 pr-5 py-2 text-xs transition-all duration-200 w-full uppercase font-black tracking-tighter",
                              isSubActive
                                ? "text-white bg-primary"
                                : "text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent"
                            )}
                          >
                            {isSubActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white text-white drop-shadow-[0_0_8px_white]" />
                            )}
                            {renderIcon(subItem.icon, cn("h-4 w-4 shrink-0 transition-colors", isSubActive ? "text-white !text-white stroke-white" : ""))}
                            <span>{subItem.title}</span>
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
                className="flex items-center justify-center w-full"
              >
                {renderIcon(item.icon, isActive ? "text-primary shadow-[0_0_15px_rgba(0,94,84,0.3)]" : "")}
              </NavLink>
            ) : (
              <NavLink
                to={item.url!}
                className={cn(
                  "relative flex items-center gap-3 px-5 py-2.5 transition-all duration-300 ease-out font-black w-full",
                  isActive
                    ? "text-foreground bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary shadow-[0_0_10px_rgba(0,94,84,0.5)]" />
                )}
                {renderIcon(item.icon, isActive ? "text-primary" : "")}
                <span className="flex-1 text-left text-[10px] tracking-[0.15em] uppercase">{itemTitle}</span>
              </NavLink>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-background transition-all duration-300 ease-in-out z-[100]"
      onMouseEnter={() => !isMobile && setOpen(true)}
      onMouseLeave={() => !isMobile && setOpen(false)}
    >
      <div className={cn(
        "flex h-20 items-center border-b border-border/50 transition-all duration-300",
        state === "collapsed" ? "justify-center px-0" : "px-6"
      )}>
        <NavLink to="/" className="hover:opacity-80 transition-opacity">
          <VoraLogo size={state === "collapsed" ? "sm" : "md"} withText={state === "expanded"} />
        </NavLink>
      </div>

      <SidebarContent className="p-0 custom-scrollbar overflow-x-hidden">
        <SidebarGroup className="p-0 pt-4">
          <SidebarGroupContent className="p-0">
            <SidebarMenu className="gap-1 text-sidebar-foreground">
              {filteredMainMenu.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn(
        "p-4 border-t border-border/50 transition-all duration-500",
        isCollapsed ? "items-center px-0" : "px-4"
      )}>
        <AccountSection isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <div className="flex items-center justify-between w-full px-2 mt-4 bg-muted/30 p-2 rounded-xl border border-white/5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Personalizar</span>
            <ThemeToggleButton />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

// --- Account Section Component ---

function AccountSection({ isCollapsed }: { isCollapsed: boolean }) {
  const { user, signOut } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "Usuário Vora",
    phone: "(11) 99999-0000",
    email: user?.email || ""
  });

  return (
    <div className="w-full space-y-2">
      {isCollapsed ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 transition-all active:scale-90">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20 shadow-lg">
                <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                  {userData.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-72 p-5 rounded-[2rem] border-white/10 shadow-2xl bg-card backdrop-blur-xl">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-4 ring-primary/10 shadow-xl">
                  <AvatarFallback className="bg-primary text-white font-black text-lg">
                    {userData.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-black text-sm uppercase tracking-tight truncate">{userData.name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                <Button variant="outline" size="sm" className="text-[9px] font-black uppercase h-10 rounded-xl" onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="w-3 h-3 mr-2" /> Perfil
                </Button>
                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase h-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => signOut()}>
                  <LogOut className="w-3 h-3 mr-2" /> Sair
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="bg-gradient-to-br from-primary/[0.08] to-transparent rounded-3xl p-5 border border-primary/10 space-y-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />

          <div className="flex items-center gap-4 relative">
            <Avatar className="h-12 w-12 ring-2 ring-primary shadow-2xl">
              <AvatarFallback className="bg-primary text-white font-black">
                {userData.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="font-black text-xs uppercase tracking-tight truncate text-foreground">{userData.name}</p>
              <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest truncate">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-primary/10 pt-4 relative">
            <button
              onClick={() => setIsEditDialogOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-all group/btn"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70 group-hover/btn:text-primary">Meus Dados</span>
              <Edit className="w-3.5 h-3.5 text-primary/40 group-hover/btn:text-primary transition-colors" />
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-destructive/10 transition-all group/logout"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-destructive/70 group-hover/logout:text-destructive">Encerrar</span>
              <LogOut className="w-3.5 h-3.5 text-destructive/40 group-hover/logout:text-destructive transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-white/20 shadow-2xl rounded-[3rem] p-0 overflow-hidden">
          <div className="bg-primary/5 p-8 border-b border-white/5">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <User className="w-8 h-8 text-primary" />
                </div>
                Gestão do Perfil
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Nome de Exibição</Label>
              <Input
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="h-14 bg-white/5 border-white/10 font-black uppercase tracking-tight rounded-2xl focus:ring-primary/20"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Telefone Profissional</Label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-1.5 bg-primary/10 rounded-lg">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <Input
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  className="h-14 pl-16 bg-white/5 border-white/10 font-bold rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Identidade Digital (E-mail)</Label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 p-1.5 bg-muted rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="h-14 pl-16 bg-black/20 border-white/5 font-medium rounded-2xl opacity-50 cursor-not-allowed italic"
                />
              </div>
              <div className="flex items-center gap-2 px-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Acesso Autenticado e Protegido</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-muted/30 border-t border-white/5">
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              className="w-full font-black uppercase text-xs h-16 tracking-[0.3em] shadow-2xl shadow-primary/30 rounded-2xl hover:translate-y-[-2px] transition-all"
            >
              Confirmar Atualizações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
