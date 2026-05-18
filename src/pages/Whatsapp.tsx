import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Loader2,
    AlertCircle,
    Smartphone,
    QrCode,
    RefreshCcw,
    Wifi,
    WifiOff,
    Users,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useEvolutionConfig } from "@/evolution-integration/useEvolutionConfig";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Componente de Conexao (QR Code) - inalterado
// ─────────────────────────────────────────────────────────────
function WhatsAppConnectFlow({ onConnected }: { onConnected: () => void }) {
    const { client } = useEvolutionConfig();
    const { user } = useAuth();
    const [step, setStep] = useState<"naming" | "qr" | "success">("naming");
    const [instanceName, setInstanceName] = useState("");
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Gera nome automatico baseado no email do user
    useEffect(() => {
        if (user?.email) {
            const name = "vora-" + user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
            setInstanceName(name);
        }
    }, [user]);

    // Limpa polling no unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const handleConnect = async () => {
        if (!client) {
            toast.error("Evolution API nao configurada (faltam VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY no env)");
            return;
        }
        if (!instanceName.trim()) {
            toast.error("Nome da instancia e obrigatorio");
            return;
        }
        setLoading(true);
        setStatusMsg("Criando instancia...");

        try {
            let qrBase64: string | null = null;

            try {
                const createRes = await client.createInstance({ instanceName: instanceName.trim(), qrcode: true });
                qrBase64 = createRes?.qrcode?.base64 || createRes?.base64 || null;
            } catch (createErr: any) {
                if (createErr.message?.includes("already") || createErr.message?.includes("409")) {
                    // instancia ja existe - segue pra buscar o QR
                } else {
                    throw createErr;
                }
            }

            if (!qrBase64) {
                setStatusMsg("Gerando QR Code...");
                await new Promise(r => setTimeout(r, 2000));
                const qrData = await client.connectInstance(instanceName.trim());
                qrBase64 = qrData?.base64 || null;
            }

            if (qrBase64) {
                setQrCode(qrBase64);
                setStep("qr");
                setStatusMsg("Escaneie o QR Code com seu WhatsApp");

                // Polling pra detectar conexao
                pollRef.current = setInterval(async () => {
                    try {
                        const state = await client.getConnectionState(instanceName.trim());
                        const currentState = state?.instance?.state;
                        if (currentState === "open") {
                            if (pollRef.current) clearInterval(pollRef.current);

                            if (user) {
                                await (supabase as any)
                                    .from("whatsapp_connections")
                                    .upsert({
                                        user_id: user.id,
                                        instance_name: instanceName.trim(),
                                        status: "connected",
                                        updated_at: new Date().toISOString(),
                                    }, { onConflict: "user_id" });
                            }

                            setStep("success");
                            setStatusMsg("WhatsApp conectado!");
                            toast.success("WhatsApp conectado!");
                            setTimeout(() => onConnected(), 1500);
                        }
                    } catch {
                        // continua polling
                    }
                }, 3000);
            } else {
                toast.error("Nao foi possivel gerar o QR Code. Tente novamente.");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao conectar");
            setStatusMsg("Erro ao conectar. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshQR = async () => {
        if (!client || !instanceName) return;
        setLoading(true);
        try {
            const qrData = await client.connectInstance(instanceName.trim());
            if (qrData?.base64) {
                setQrCode(qrData.base64);
                toast.success("QR Code atualizado!");
            }
        } catch {
            toast.error("Erro ao atualizar QR Code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center text-center max-w-lg p-8 space-y-6">
            {step === "naming" && (
                <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Smartphone className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Conectar WhatsApp</h2>
                    <p className="text-muted-foreground text-sm">
                        Vamos criar uma conexao para o seu WhatsApp. O nome abaixo e gerado automaticamente.
                    </p>
                    <div className="w-full space-y-2">
                        <Input
                            value={instanceName}
                            onChange={e => setInstanceName(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                            placeholder="nome-da-instancia"
                            className="text-center"
                        />
                    </div>
                    <Button
                        onClick={handleConnect}
                        disabled={loading || !instanceName.trim()}
                        className="bg-[#00E676] hover:bg-[#00C853] text-black font-semibold w-full"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{statusMsg}</>
                        ) : (
                            <><QrCode className="w-4 h-4 mr-2" />Gerar QR Code</>
                        )}
                    </Button>
                </>
            )}

            {step === "qr" && qrCode && (
                <>
                    <h2 className="text-xl font-bold">Escaneie o QR Code</h2>
                    <p className="text-muted-foreground text-sm">
                        Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                    </p>
                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                        <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Aguardando conexao do celular...</span>
                    </div>
                    <Button variant="outline" onClick={handleRefreshQR} disabled={loading} size="sm">
                        <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Atualizar QR Code
                    </Button>
                </>
            )}

            {step === "success" && (
                <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Wifi className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-500">Conectado!</h2>
                    <p className="text-muted-foreground">Pronto para envios automaticos.</p>
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Pagina principal - configuracao enxuta (sem chat clone)
// ─────────────────────────────────────────────────────────────
export default function WhatsApp() {
    const { isConnected, isLoadingInstance, chats, isLoadingChats, reconnect } = useWhatsApp();
    const { user } = useAuth();

    const [showConnect, setShowConnect] = useState(false);
    const [notifGroup, setNotifGroup] = useState<{ jid: string; name: string } | null>(null);
    const [groupPickerOpen, setGroupPickerOpen] = useState(false);
    const [savingGroup, setSavingGroup] = useState(false);

    // Carrega grupo de notificacao salvo
    useEffect(() => {
        if (!user || !isConnected) return;
        (async () => {
            const { data } = await (supabase as any)
                .from("whatsapp_connections")
                .select("notification_group_jid, notification_group_name")
                .eq("user_id", user.id)
                .maybeSingle();
            if (data?.notification_group_jid) {
                setNotifGroup({ jid: data.notification_group_jid, name: data.notification_group_name || "Grupo" });
            }
        })();
    }, [user, isConnected]);

    // Apenas grupos (JIDs com @g.us)
    const groups = chats.filter(c => c.id?.includes("@g.us"));

    const handleSelectGroup = async (groupJid: string, groupName: string) => {
        if (!user) return;
        setSavingGroup(true);
        try {
            await (supabase as any)
                .from("whatsapp_connections")
                .update({
                    notification_group_jid: groupJid,
                    notification_group_name: groupName,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
            setNotifGroup({ jid: groupJid, name: groupName });
            setGroupPickerOpen(false);
            toast.success(`Grupo "${groupName}" selecionado`);
        } catch {
            toast.error("Erro ao salvar grupo");
        } finally {
            setSavingGroup(false);
        }
    };

    // ── Estados de loading e desconectado ──

    if (isLoadingInstance) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                <p>Verificando conexao do WhatsApp...</p>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <header className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">WhatsApp</h1>
                    <p className="text-muted-foreground text-sm">Conexao e disparo automatico de mensagens</p>
                </header>

                <Card>
                    <CardContent className="p-8">
                        {showConnect ? (
                            <WhatsAppConnectFlow onConnected={() => {
                                setShowConnect(false);
                                reconnect();
                            }} />
                        ) : (
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold">WhatsApp desconectado</h2>
                                <p className="text-muted-foreground text-sm max-w-sm">
                                    Conecte seu numero para habilitar envios automaticos e notificacoes em grupo.
                                </p>
                                <Button
                                    onClick={() => setShowConnect(true)}
                                    className="bg-[#00E676] hover:bg-[#00C853] text-black font-semibold"
                                >
                                    <Smartphone className="w-4 h-4 mr-2" />
                                    Conectar WhatsApp
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Estado conectado: status + selecao de grupo ──

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <header>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">WhatsApp</h1>
                <p className="text-muted-foreground text-sm">Conexao e disparo automatico de mensagens</p>
            </header>

            {/* Card 1 — Status da conexao */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <Wifi className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">Conectado</span>
                                    <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
                                        Ativo
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Seu WhatsApp esta pronto para enviar mensagens automaticas.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConnect(true)}
                        >
                            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                            Reconectar
                        </Button>
                    </div>

                    {/* Reconexao inline (mostra QR sem sair da pagina) */}
                    {showConnect && (
                        <div className="mt-6 pt-6 border-t flex justify-center">
                            <WhatsAppConnectFlow onConnected={() => {
                                setShowConnect(false);
                                reconnect();
                            }} />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Card 2 — Grupo de notificacoes */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold">Grupo de notificacoes</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Disparos automaticos (vendas, recebiveis, alertas) serao enviados para este grupo.
                            </p>
                        </div>
                    </div>

                    {/* Estado atual */}
                    <div className="bg-muted/30 border rounded-lg p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                Grupo selecionado
                            </p>
                            {notifGroup ? (
                                <p className="font-semibold truncate flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    {notifGroup.name}
                                </p>
                            ) : (
                                <p className="text-yellow-500 italic flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    Nenhum grupo selecionado
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGroupPickerOpen(!groupPickerOpen)}
                        >
                            {notifGroup ? "Trocar" : "Selecionar"}
                        </Button>
                    </div>

                    {/* Lista de grupos do WhatsApp */}
                    {groupPickerOpen && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-muted/30 px-4 py-2 border-b">
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                    Seus grupos do WhatsApp
                                </p>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {isLoadingChats ? (
                                    <div className="p-6 flex justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : groups.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        Nenhum grupo encontrado. Crie um grupo no seu WhatsApp e recarregue esta pagina.
                                    </div>
                                ) : (
                                    groups.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => handleSelectGroup(g.id, g.name)}
                                            disabled={savingGroup}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
                                                notifGroup?.jid === g.id && "bg-primary/5"
                                            )}
                                        >
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarImage src={g.avatar} />
                                                <AvatarFallback className="text-xs">{g.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{g.name}</p>
                                            </div>
                                            {notifGroup?.jid === g.id && (
                                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Card 3 — Hint sobre automacoes futuras */}
            <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    <WifiOff className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    Em breve: regras de disparo automatico (nova venda, recebivel vencido, estoque baixo).
                </CardContent>
            </Card>
        </div>
    );
}
