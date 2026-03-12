import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/users", icon: Users, label: "Vendedoras" },
    { to: "/admin/plans", icon: CreditCard, label: "Planos" },
];

export function AdminLayout() {
    const { signOut, user } = useAuth();

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight">VORA Admin</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Painel Administrativo</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`
                            }
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t space-y-2">
                    <p className="text-[10px] text-muted-foreground truncate px-3">
                        {user?.email}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-muted-foreground"
                        onClick={signOut}
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </Button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
