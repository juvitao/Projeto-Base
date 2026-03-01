import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvolutionConfig } from "@/evolution-integration/useEvolutionConfig";
import { toast } from "sonner";
import { QrCode, RefreshCcw, Power, Trash2, Smartphone } from "lucide-react";

export function InstanceStatus() {
    const { client } = useEvolutionConfig();
    const [instanceName, setInstanceName] = useState(() => localStorage.getItem("evol_instance_name") || "");
    const [status, setStatus] = useState<string>("Não verificada");
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (instanceName) {
            localStorage.setItem("evol_instance_name", instanceName);
        }
    }, [instanceName]);

    const fetchStatus = async (overrideName?: string) => {
        const nameToUse = overrideName || instanceName;
        if (!client || !nameToUse) {
            toast.error("Configure a API e o nome da instância primeiro.");
            return;
        }
        setLoading(true);
        setQrCode(null);
        try {
            const state = await client.getConnectionState(nameToUse);
            const currentState = state?.instance?.state || "Desconhecido";
            setStatus(currentState);

            if (currentState === "close" || currentState === "connecting") {
                const qrData = await client.connectInstance(nameToUse);
                if (qrData?.base64) {
                    setQrCode(qrData.base64);
                    setStatus("Aguardando QR Code");
                }
            }
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("404")) {
                setStatus("Não existe");
            } else {
                toast.error(error.message || "Erro ao buscar status");
                setStatus("Erro");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAndConnect = async () => {
        if (!client || !instanceName) return;
        setLoading(true);
        try {
            await client.createInstance({ instanceName });
            toast.success("Instância criada! Buscando QR Code...");
            setTimeout(() => fetchStatus(instanceName), 2000);
        } catch (error: any) {
            toast.error(error.message || "Erro ao criar instância. Verifique se ela já existe.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!client || !instanceName) return;
        setLoading(true);
        try {
            await client.logoutInstance(instanceName);
            toast.success("Desconectado com sucesso.");
            setQrCode(null);
            setStatus("close");
        } catch (error: any) {
            toast.error(error.message || "Erro ao desconectar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conexão do WhatsApp</CardTitle>
                <CardDescription>
                    Crie ou conecte uma instância para enviar e receber mensagens.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="instanceName">Nome da Instância</Label>
                    <div className="flex space-x-2">
                        <Input
                            id="instanceName"
                            placeholder="ex: minha-loja"
                            value={instanceName}
                            onChange={(e) => setInstanceName(e.target.value)}
                        />
                        <Button variant="outline" onClick={() => fetchStatus()} disabled={loading || !client}>
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Status Atual:</p>
                        <p className="text-2xl font-bold capitalize">{status}</p>
                    </div>
                    {status === "open" && <Smartphone className="w-8 h-8 text-green-500" />}
                </div>

                {qrCode && (
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-white space-y-4">
                        <p className="text-sm text-center text-muted-foreground">Escaneie o QR Code com seu WhatsApp para conectar.</p>
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 border rounded-lg" />
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-between">
                {status === "Não existe" || status === "Desconhecido" || status === "Não verificada" ? (
                    <Button onClick={handleCreateAndConnect} disabled={loading || !client} className="w-full">
                        <QrCode className="w-4 h-4 mr-2" />
                        Criar Instância e Conectar
                    </Button>
                ) : status === "open" ? (
                    <Button variant="destructive" onClick={handleLogout} disabled={loading || !client} className="w-full">
                        <Power className="w-4 h-4 mr-2" />
                        Desconectar (Logout)
                    </Button>
                ) : (
                    <Button onClick={() => fetchStatus()} disabled={loading || !client} className="w-full">
                        <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar Status / QR Code
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
