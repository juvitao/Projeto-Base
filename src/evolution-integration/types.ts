export interface CreateInstanceData {
    instanceName: string;
    token?: string;
    number?: string;
    qrcode?: boolean;
}

export interface InstanceState {
    instance: {
        instanceName: string;
        state: "open" | "close" | "connecting" | "refused" | "timeout";
    };
}

export interface QRCodeData {
    pairingCode?: string;
    code?: string;
    base64?: string;
    count?: number;
}

export interface SendMessageData {
    number: string;
    text: string;
    delay?: number;
    linkPreview?: boolean;
}

export interface EvolutionConfig {
    apiUrl: string;
    apiKey: string;
}
