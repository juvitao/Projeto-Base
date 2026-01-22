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
import Overview from "./pages/Overview";
import Connections from "./pages/Connections";
import Graficos from "./pages/Graficos";
import Relatorios from "./pages/Relatorios";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import TasksPage from "./pages/TasksPage";
import Assets from "./pages/Assets";
import Products from "./pages/Products";
import AccountGroups from "./pages/AccountGroups";
import TeamConnections from "./pages/TeamConnections";
import OnboardingWizard from "./pages/OnboardingWizard";
import ClientPortal from "./pages/ClientPortal";
import MetaCallback from "./pages/MetaCallback";
import AcceptInvite from "./pages/AcceptInvite";
import { DashboardProvider } from "./contexts/DashboardContext";
import { ChatProvider } from "./contexts/ChatContext";
import { AccountTypeProvider } from "./contexts/AccountTypeContext";
import { AccountWizardContainer } from "./components/AccountWizardContainer";
import { SelectedClientProvider } from "./contexts/SelectedClientContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TasksProvider } from "./contexts/TasksContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";

import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Deep Link Handler for iOS OAuth AND Web Invite Tokens
const DeepLinkHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Handle Web Invite Tokens (runs on initial load)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && hash.includes('type=invite')) {
      console.log('📧 [InviteHandler] Detected invite token in URL, redirecting to accept-invite page...');
      // Redirect to accept-invite page preserving the hash
      window.location.href = '/auth/accept-invite' + hash;
      return;
    }

    // Listen for app URL open events (deep links - iOS)
    CapacitorApp.addListener('appUrlOpen', async (event: { url: string }) => {
      console.log('🔗 [DeepLink] URL received:', event.url);

      try {
        const url = new URL(event.url);

        // Check if URL contains OAuth tokens in hash
        if (url.hash && url.hash.includes('access_token')) {
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const type = params.get('type');

          // If it's an invite, redirect to accept-invite page
          if (type === 'invite') {
            window.location.href = '/auth/accept-invite' + url.hash;
            return;
          }

          if (access_token && refresh_token) {
            console.log('🔑 [DeepLink] Setting session with tokens...');
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            });

            if (error) {
              console.error('❌ [DeepLink] Error setting session:', error);
            } else {
              console.log('✅ [DeepLink] Session set successfully!');
              // Redirect to main app after successful auth
              window.location.href = '/';
            }
          }
        }
      } catch (error) {
        console.error('❌ [DeepLink] Error processing URL:', error);
      }
    });

    // Cleanup listener on unmount
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <DeepLinkHandler>
        <TooltipProvider>
          <AccountTypeProvider>
            <DashboardProvider>
              <SelectedClientProvider>
                <TasksProvider>
                  <AuthProvider>
                    <PermissionsProvider>
                      <ChatProvider>
                        <Toaster />
                        <Sonner />
                        <AccountWizardContainer />
                        <BrowserRouter>
                          <Routes>
                            {/* PUBLIC ROUTE - Client Portal (No Authentication Required) */}
                            <Route path="/portal/:shareToken" element={<ClientPortal />} />
                            <Route path="/auth/meta/callback" element={<ProtectedRoute><MetaCallback /></ProtectedRoute>} />
                            <Route path="/auth/accept-invite" element={<AcceptInvite />} />

                            <Route path="/login" element={<Login />} />
                            <Route
                              path="/onboarding"
                              element={
                                <ProtectedRoute>
                                  <OnboardingWizard />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <Overview />
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
                              path="/tasks"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <TasksPage />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/graficos"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <Graficos />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/relatorios"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <Relatorios />
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
                            <Route
                              path="/team"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <TeamConnections />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/connections"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <Connections />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/assets"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <Assets />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/account-groups"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <AccountGroups />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/products"
                              element={
                                <ProtectedRoute>
                                  <DashboardLayout>
                                    <Products />
                                  </DashboardLayout>
                                </ProtectedRoute>
                              }
                            />
                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </BrowserRouter>
                      </ChatProvider>
                    </PermissionsProvider>
                  </AuthProvider>
                </TasksProvider>
              </SelectedClientProvider>
            </DashboardProvider>
          </AccountTypeProvider>
        </TooltipProvider>
      </DeepLinkHandler>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
