import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VoraLogo } from "@/components/VoraLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;



        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar o cadastro."
        });
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast({ title: "Login realizado!" });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao autenticar",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-12">
        {/* Logo + Branding */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-4">
          <VoraLogo size="lg" className="scale-125 transition-transform hover:scale-130 duration-700" withText={true} />
        </div>


        {/* Login Form */}
        <div className="bg-card p-8 rounded-2xl shadow-lg border border-border space-y-6">
          <div className="space-y-2 text-left">
            <h2 className="text-2xl font-bold text-foreground">
              {isSignUp ? "Criar conta" : "Bem-vindo"}
            </h2>
            <p className="text-muted-foreground font-light">
              {isSignUp ? "Preencha os dados para criar sua conta" : "Entre para acessar o sistema"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-11 font-light"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-11 font-light"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-bold mt-6" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aguarde...</>
              ) : (
                isSignUp ? "Criar conta" : "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-light">
              {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? "Fazer login" : "Crie agora"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

