import { useState } from 'react';
import { PWASettings } from '../../types';

export function usePwaSettings() {
    // Retorna estado vazio/padrão para não quebrar componentes que dependem deste hook
    // Mas não realiza nenhuma chamada ao banco nem atualização de DOM/Manifest.
    const [settings] = useState<PWASettings | null>(null);
    const [loading] = useState(false);

    return { settings, loading };
}
