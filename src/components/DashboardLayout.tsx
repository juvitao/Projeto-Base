import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, Bell, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdAccountSelector } from "@/components/AdAccountSelector";
import { GamificationProgressBar } from "@/components/GamificationProgressBar";
import { useLocation } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Inner component to access sidebar context (useSidebar must be inside SidebarProvider)
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [reauthRequired, setReauthRequired] = useState(false);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for any connection requiring reauth in any workspace user belongs to
        // For simplicity, checking all connections for the user's workspaces would be ideal
        // But here we might just check the current workspace context if available, or just all connections linked to workspaces user owns
        // Let's assume we check ALL connections accessible to the user

        // 1. Get workspaces user is part of
        const { data: members } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id);
        if (!members?.length) return;

        const workspaceIds = members.map(m => m.workspace_id);

        const { count } = await supabase
          .from('fb_connections')
          .select('id', { count: 'exact', head: true })
          .in('workspace_id', workspaceIds)
          .eq('status', 'reauth_required');

        if (count && count > 0) {
          setReauthRequired(true);
        }
      } catch (err) {
        console.error("Failed to check connection health", err);
      }
    };

    checkConnections();
  }, [location.pathname]); // Re-check on navigation

  // Pages where the full header should be hidden (only mobile sidebar trigger shown)
  const hideFullHeader = ['/clients', '/connections', '/team', '/settings'].includes(location.pathname);
  // Pages where just the account selector is hidden but header stays
  const hideAccountSelector = ['/connections'].includes(location.pathname);

  return (
    <SidebarInset className="w-full max-w-[100vw] overflow-x-hidden m-0 box-border bg-gradient-to-br from-background via-background to-primary/5">
      {/* Re-Auth Alert Banner - Global */}
      {reauthRequired && (
        <div className="bg-destructive/10 border-b border-destructive/20 w-full px-4 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            {t("layout.reauth_banner", "Attention: One or more Facebook connections have expired.")}
          </p>
          <Link to="/connections" className="text-sm font-bold text-destructive hover:underline flex items-center gap-0.5 ml-2">
            {t("layout.reconnect_now", "Reconnect now")} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Header - Hidden on certain pages except mobile trigger */}
      {hideFullHeader ? (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4 w-full max-w-full overflow-x-hidden box-border bg-background sticky top-0 z-50 md:hidden" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <SidebarTrigger className="shrink-0">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </header>
      ) : (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4 w-full max-w-full overflow-x-hidden box-border justify-between bg-background sticky top-0 z-50" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Mobile sidebar trigger */}
            <SidebarTrigger className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>

            {/* Desktop sidebar toggle button */}


            {!hideAccountSelector && (
              <div className="flex-1 max-w-md">
                <AdAccountSelector />
              </div>
            )}
          </div>
        </header>
      )}
      <main className="w-full max-w-full overflow-x-hidden pt-2 px-3 pb-3 sm:pt-2 sm:px-4 sm:pb-4 md:pt-2 md:px-6 md:pb-6 lg:pt-2 lg:px-8 lg:pb-8 box-border">
        {children}
      </main>
    </SidebarInset>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
