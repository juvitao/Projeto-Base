import { useMemo } from 'react';
import { EvolutionClient } from './client';

export function useEvolutionConfig() {
    // Configurações internas. Em produção, definir no .env: VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY
    // Usando proxy local no Vite (ou sub-rota neutra) para evitar erro de CORS
    const apiUrl = "/evolution-api";
    const apiKey = "jv-sistemas-evolution-api-2025-token-master-key";

    const client = useMemo(() => {
        if (apiUrl && apiKey) {
            return new EvolutionClient(apiUrl, apiKey);
        }
        return null;
    }, [apiUrl, apiKey]);

    return { apiUrl, apiKey, client };
}
