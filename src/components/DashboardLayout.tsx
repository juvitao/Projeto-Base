import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <SidebarInset className="w-full max-w-[100vw] overflow-x-hidden m-0 box-border bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <div className="hidden md:flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h1 className="text-sm font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              VORA <span className="text-muted-foreground/30 font-light">—</span>
              <span className="text-muted-foreground font-semibold normal-case tracking-tight text-xs">Assistente pessoal de vendas</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                {user?.email}
              </div>
              <DropdownMenuItem onClick={() => signOut()}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </SidebarInset>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
