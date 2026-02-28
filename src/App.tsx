import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "./components/DashboardLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Deep Link Handler (Simplified)
const DeepLinkHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    CapacitorApp.addListener('appUrlOpen', async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        if (url.hash && url.hash.includes('access_token')) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            window.location.href = '/';
          }
        }
      } catch (error) {
        console.error('❌ [DeepLink] Error processing URL:', error);
      }
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);

  return <>{children}</>;
};

import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Stock from "./pages/Stock";
import Financial from "./pages/Financial";
import Sales from "./pages/Sales";
import Whatsapp from "./pages/Whatsapp";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <DeepLinkHandler>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/clients"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Clients />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/clients/:id"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ClientDetails />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/stock"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Stock />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/financial"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Financial />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Sales />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/whatsapp"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Whatsapp />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <SettingsPage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </DeepLinkHandler>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
