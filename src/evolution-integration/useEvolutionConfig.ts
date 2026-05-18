import { useMemo } from 'react';
import { EvolutionClient } from './client';

export function useEvolutionConfig() {
    const apiUrl = import.meta.env.VITE_EVOLUTION_API_URL || '';
    const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';

    const client = useMemo(() => {
        if (apiUrl && apiKey) {
            return new EvolutionClient(apiUrl, apiKey);
        }
        return null;
    }, [apiUrl, apiKey]);

    return { apiUrl, apiKey, client };
}

