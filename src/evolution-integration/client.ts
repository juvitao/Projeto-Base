import { CreateInstanceData, InstanceState, QRCodeData, SendMessageData } from './types';

export class EvolutionClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.apiKey = apiKey;
    }

    private async fetchApi(path: string, options: RequestInit = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            "Content-Type": "application/json",
            "apikey": this.apiKey,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        // Handle empty responses
        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (!response.ok) {
            let errorMessage = `API Error: ${response.status}`;
            if (isJson) {
                const error = await response.json().catch(() => ({}));
                errorMessage = error.message || error.response?.message || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (isJson) {
            return response.json();
        }

        return response.text();
    }

    // --- Instances ---

    async createInstance(data: CreateInstanceData) {
        return this.fetchApi("/instance/create", {
            method: "POST",
            body: JSON.stringify({
                instanceName: data.instanceName,
                qrcode: data.qrcode ?? true,
                integration: "WHATSAPP-BAILEYS",
                token: data.token,
                number: data.number,
            }),
        });
    }

    async fetchInstances() {
        return this.fetchApi("/instance/fetchInstances");
    }

    async getConnectionState(instanceName: string): Promise<InstanceState> {
        return this.fetchApi(`/instance/connectionState/${instanceName}`);
    }

    async connectInstance(instanceName: string): Promise<QRCodeData> {
        // Connect instance usually returns base64 qr if not connected
        return this.fetchApi(`/instance/connect/${instanceName}`);
    }

    async logoutInstance(instanceName: string) {
        return this.fetchApi(`/instance/logout/${instanceName}`, {
            method: "DELETE",
        });
    }

    async deleteInstance(instanceName: string) {
        return this.fetchApi(`/instance/delete/${instanceName}`, {
            method: "DELETE",
        });
    }

    // --- Messaging ---

    async sendText(instanceName: string, data: SendMessageData) {
        return this.fetchApi(`/message/sendText/${instanceName}`, {
            method: "POST",
            body: JSON.stringify({
                number: data.number,
                text: data.text,
                delay: data.delay || 1200,
                options: {
                    linkPreview: data.linkPreview !== false
                }
            }),
        });
    }
}
