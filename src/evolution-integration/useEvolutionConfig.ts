import { useMemo } from 'react';
import { EvolutionClient } from './client';

export function useEvolutionConfig() {
    // Configurações internas. Em produção, definir no .env: VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY
    const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL || "https://evo.jv2systems.com";
    const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || "jv-sistemas-evolution-api-2025-token-master-key";

    const client = useMemo(() => {
        if (apiUrl && apiKey) {
            return new EvolutionClient(apiUrl, apiKey);
        }
        return null;
    }, [apiUrl, apiKey]);

    return { apiUrl, apiKey, client };
}
