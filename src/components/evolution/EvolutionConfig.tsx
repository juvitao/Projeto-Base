import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEvolutionConfig } from "@/evolution-integration/useEvolutionConfig";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function EvolutionConfig() {
    const { apiUrl, apiKey, saveConfig } = useEvolutionConfig();
    const [url, setUrl] = useState(apiUrl);
    const [key, setKey] = useState(apiKey);

    const handleSave = () => {
        saveConfig(url, key);
        toast.success("Configuração salva com sucesso!");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuração da Evolution API</CardTitle>
                <CardDescription>
                    Insira a URL e a Global API Key da sua instância Evolution API.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="apiUrl">URL da API</Label>
                    <Input
                        id="apiUrl"
                        placeholder="https://sua-api.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="apiKey">Global API Key</Label>
                    <Input
                        id="apiKey"
                        type="password"
                        placeholder="Sua Global API Key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />
                </div>
                <Button onClick={handleSave} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                </Button>
            </CardContent>
        </Card>
    );
}
