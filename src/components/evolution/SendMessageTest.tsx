import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEvolutionConfig } from "@/evolution-integration/useEvolutionConfig";
import { toast } from "sonner";
import { Send } from "lucide-react";

export function SendMessageTest() {
    const { client } = useEvolutionConfig();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSendMessage = async () => {
        const instanceName = localStorage.getItem("evol_instance_name");

        if (!client || !instanceName) {
            toast.error("Configure a API e conecte uma instância primeiro.");
            return;
        }

        if (!phoneNumber || !message) {
            toast.warning("Preencha o número e a mensagem.");
            return;
        }

        setLoading(true);
        try {
            // Clean up number
            const cleanNumber = phoneNumber.replace(/\D/g, "");
            await client.sendText(instanceName, {
                number: cleanNumber,
                text: message
            });
            toast.success("Mensagem enviada com sucesso!");
            setMessage(""); // clear after sending
        } catch (error: any) {
            toast.error(error.message || "Erro ao enviar mensagem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Teste de Envio</CardTitle>
                <CardDescription>
                    Envie uma mensagem de texto para validar a conexão.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Número do WhatsApp (com DDI)</Label>
                    <Input
                        id="phoneNumber"
                        placeholder="Ex: 5511999999999"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="messageText">Mensagem</Label>
                    <Textarea
                        id="messageText"
                        placeholder="Olá, testando integração!"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSendMessage} disabled={loading || !client} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? "Enviando..." : "Enviar Mensagem"}
                </Button>
            </CardFooter>
        </Card>
    );
}
