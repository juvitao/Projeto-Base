import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    MoreVertical,
    MessageSquare,
    Phone,
    Video,
    Paperclip,
    Smile,
    Send,
    CheckCheck,
    Clock,
    UserCircle2,
    Filter,
    Loader2,
    AlertCircle,
    Smartphone,
    QrCode,
    RefreshCcw,
    Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useEvolutionConfig } from "@/evolution-integration/useEvolutionConfig";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Componente de Conexão QR Code ───
function WhatsAppConnectFlow({ onConnected }: { onConnected: () => void }) {
    const { client } = useEvolutionConfig();
    const { user } = useAuth();
    const [step, setStep] = useState<"naming" | "qr" | "success">("naming");
    const [instanceName, setInstanceName] = useState("");
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Gerar nome automático baseado no user
    useEffect(() => {
        if (user?.email) {
            const name = "vora-" + user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
            setInstanceName(name);
        }
    }, [user]);

    // Limpar polling ao desmontar
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
        setStatusMsg("Criando instância...");

        try {
            // 1. Criar instância — Evolution API v2 retorna o QR na criação
            let qrBase64: string | null = null;

            try {
                const createRes = await client.createInstance({ instanceName: instanceName.trim(), qrcode: true });
                // Evolution API v2 pode retornar QR direto no create
                qrBase64 = createRes?.qrcode?.base64 || createRes?.base64 || null;
            } catch (createErr: any) {
                // Se a instância já existe, tentar conectar ela
                if (createErr.message?.includes("already") || createErr.message?.includes("409")) {
                    // Instância já existe — ok, vamos tentar buscar QR
                } else {
                    throw createErr; // Erro real — propagar
                }
            }

            // 2. Se não veio QR no create, buscar via connect
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

                // 3. Polling para detectar quando conectar
                pollRef.current = setInterval(async () => {
                    try {
                        const state = await client.getConnectionState(instanceName.trim());
                        const currentState = state?.instance?.state;
                        if (currentState === "open") {
                            if (pollRef.current) clearInterval(pollRef.current);
                            
                            // Salvar conexão no Supabase
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
                            setStatusMsg("WhatsApp conectado com sucesso!");
                            toast.success("WhatsApp conectado! 🎉");
                            setTimeout(() => onConnected(), 2000);
                        }
                    } catch {
                        // Continuar polling
                    }
                }, 3000);
            } else {
                toast.error("Não foi possível gerar o QR Code. Tente novamente.");
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
        } catch (err: any) {
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
                        Vamos criar uma conexão para o seu WhatsApp. O nome abaixo é gerado automaticamente.
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
                        Abra o WhatsApp no celular → Mais opções (⋮) → Dispositivos conectados → Conectar dispositivo
                    </p>
                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                        <img
                            src={qrCode}
                            alt="QR Code WhatsApp"
                            className="w-64 h-64 rounded-lg"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Aguardando conexão do celular...</span>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleRefreshQR}
                        disabled={loading}
                        size="sm"
                    >
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
                    <h2 className="text-2xl font-bold text-emerald-500">Conectado! 🎉</h2>
                    <p className="text-muted-foreground">
                        Seu WhatsApp foi conectado com sucesso. Carregando suas conversas...
                    </p>
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </>
            )}
        </div>
    );
}


export default function WhatsApp() {
    const {
        isConnected,
        isLoadingInstance,
        chats,
        isLoadingChats,
        selectedChatId,
        messages,
        isLoadingMessages,
        fetchMessages,
        sendMessage,
        reconnect,
    } = useWhatsApp();

    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [showConnect, setShowConnect] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── Estado do grupo de notificações ──
    const [notifGroup, setNotifGroup] = useState<{ jid: string; name: string } | null>(null);
    const [showGroupPicker, setShowGroupPicker] = useState(false);
    const [savingGroup, setSavingGroup] = useState(false);

    // Carregar grupo salvo ao montar
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

    // Grupos = chats com @g.us
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
            setShowGroupPicker(false);
            toast.success(`Grupo "${groupName}" selecionado para notificações!`);
        } catch {
            toast.error("Erro ao salvar grupo");
        } finally {
            setSavingGroup(false);
        }
    };

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const activeChat = chats.find(c => c.id === selectedChatId);

    const handleChatSelect = (chatId: string) => {
        fetchMessages(chatId);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChatId) return;
        const txt = newMessage;
        setNewMessage(""); // Clear input immediately
        const success = await sendMessage(selectedChatId, txt);
        if (!success) {
            toast.error("Erro ao enviar mensagem");
        }
    };

    if (isLoadingInstance) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center m-2 border rounded-xl bg-card">
                <div className="flex flex-col items-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p>Conectando ao WhatsApp...</p>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="flex h-[calc(100vh-100px)] items-center justify-center m-2 border rounded-xl bg-card">
                {showConnect ? (
                    <WhatsAppConnectFlow onConnected={() => {
                        setShowConnect(false);
                        reconnect();
                    }} />
                ) : (
                    <div className="flex flex-col items-center text-center max-w-md p-8">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">WhatsApp Desconectado</h2>
                        <p className="text-muted-foreground mb-6">
                            Para visualizar suas conversas, você precisa conectar seu aparelho ao sistema.
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
            </div>
        );
    }

    const filteredChats = chats.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] m-2">
            {/* ── Banner de seleção de grupo de notificações ── */}
            <div className="border rounded-t-xl bg-card px-4 py-2 flex items-center justify-between gap-3 border-b-0">
                <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground shrink-0">Grupo de notificações:</span>
                    {notifGroup ? (
                        <span className="text-sm font-semibold truncate">{notifGroup.name}</span>
                    ) : (
                        <span className="text-sm text-yellow-500 italic">Nenhum selecionado</span>
                    )}
                </div>
                <div className="relative">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGroupPicker(!showGroupPicker)}
                        className="text-xs h-7"
                    >
                        {notifGroup ? "Trocar" : "Selecionar grupo"}
                    </Button>

                    {/* Dropdown de grupos */}
                    {showGroupPicker && (
                        <div className="absolute right-0 top-9 z-50 w-80 max-h-72 overflow-y-auto bg-card border rounded-lg shadow-xl">
                            <div className="p-2 border-b">
                                <p className="text-xs font-semibold text-muted-foreground px-2">Seus grupos do WhatsApp</p>
                            </div>
                            {isLoadingChats ? (
                                <div className="p-4 flex justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Nenhum grupo encontrado. Seus grupos aparecerão aqui após carregar as conversas.
                                </div>
                            ) : (
                                groups.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => handleSelectGroup(g.id, g.name)}
                                        disabled={savingGroup}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                                            notifGroup?.jid === g.id && "bg-primary/10"
                                        )}
                                    >
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={g.avatar} />
                                            <AvatarFallback className="text-xs">{g.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{g.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{g.lastMessage}</p>
                                        </div>
                                        {notifGroup?.jid === g.id && (
                                            <CheckCheck className="w-4 h-4 text-primary shrink-0 ml-auto" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Layout de chat (existente) ── */}
            <div className="flex flex-1 overflow-hidden bg-background border rounded-b-xl shadow-lg">
            {/* Sidebar de Conversas */}
            <div className="w-[350px] flex flex-col border-r bg-card/50">
                {/* Header Sidebar */}
                <div className="p-4 flex items-center justify-between border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                            <AvatarFallback>WA</AvatarFallback>
                        </Avatar>
                        <h2 className="font-bold text-lg">Conversas</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar contato ou mensagem"
                            className="pl-10 bg-muted/50 border-none focus-visible:ring-1"
                        />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
                            <Filter className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Chats List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoadingChats ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground text-sm">
                            Nenhuma conversa encontrada.
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleChatSelect(chat.id)}
                                className={cn(
                                    "flex items-center gap-3 p-4 cursor-pointer transition-colors relative",
                                    selectedChatId === chat.id
                                        ? "bg-primary/10"
                                        : "hover:bg-muted/50"
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={chat.avatar} />
                                        <AvatarFallback>{chat.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {chat.online && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className="font-semibold text-sm truncate pr-2">{chat.name}</h4>
                                        <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground truncate italic">
                                            {chat.lastMessage}
                                        </p>
                                        {chat.unread > 0 && (
                                            <Badge className="h-5 min-w-[20px] flex items-center justify-center p-0 rounded-full bg-primary text-[10px]">
                                                {chat.unread}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {selectedChatId === chat.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Janela de Chat Aberta */}
            <div className="flex-1 flex flex-col bg-[#0b0e11] dark:bg-[#0b0e11] bg-opacity-[0.02]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/630/wallpaper-whatsapp-dark-background.jpg")', backgroundBlendMode: 'overlay', backgroundSize: 'cover' }}>
                {activeChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 border-b flex items-center justify-between bg-card">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={activeChat?.avatar} />
                                    <AvatarFallback>{activeChat?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-sm">{activeChat?.name}</h3>
                                    <p className="text-[10px] text-muted-foreground">
                                        {activeChat?.id.replace('@s.whatsapp.net', '')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                                    <Video className="w-5 h-5 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                                    <Phone className="w-5 h-5 text-muted-foreground" />
                                </Button>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                                    <Search className="w-5 h-5 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {isLoadingMessages ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : messages.length > 0 ? (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex flex-col max-w-[70%] group",
                                            msg.sender === 'me' ? "ml-auto items-end" : "items-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "px-4 py-2 shadow-sm text-sm relative",
                                                msg.sender === 'me'
                                                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
                                                    : "bg-card border rounded-2xl rounded-tl-none"
                                            )}
                                        >
                                            {msg.text}
                                            <div className={cn(
                                                "flex items-center gap-1 mt-1 justify-end",
                                                msg.sender === 'me' ? "text-primary-foreground/70" : "text-muted-foreground"
                                            )}>
                                                <span className="text-[9px] uppercase font-medium">{msg.timestamp}</span>
                                                {msg.sender === 'me' && (
                                                    <CheckCheck className={cn(
                                                        "w-3 h-3 outline-none",
                                                        msg.status === 'read' ? "text-blue-300" : "",
                                                        msg.status === 'pending' ? "opacity-50" : ""
                                                    )} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                                    <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                                    <h3 className="text-xl font-bold">Nenhuma mensagem aqui</h3>
                                    <p className="max-w-xs text-sm mt-2">
                                        Envie uma mensagem para iniciar a conversa.
                                    </p>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Container */}
                        <div className="p-4 bg-muted/30 border-t backdrop-blur-md">
                            <div className="max-w-4xl mx-auto flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0 text-muted-foreground">
                                    <Smile className="w-6 h-6" />
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0 text-muted-foreground">
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                                <div className="flex-1 relative">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Digite uma mensagem"
                                        className="bg-background/80 border-none h-11 px-4 rounded-xl focus-visible:ring-1"
                                    />
                                </div>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    size="icon"
                                    className="rounded-full h-11 w-11 shrink-0 bg-primary hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                        <UserCircle2 className="w-20 h-20 mb-4" />
                        <h3 className="text-xl font-bold">WhatsApp Lever</h3>
                        <p className="max-w-xs text-sm mt-2">
                            Selecione uma conversa ao lado para começar a enviar mensagens.
                        </p>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}

function Separator({ orientation, className }: { orientation: 'horizontal' | 'vertical', className?: string }) {
    return <div className={cn(orientation === 'vertical' ? 'w-[1px] h-full' : 'h-[1px] w-full', 'bg-border', className)} />;
}
