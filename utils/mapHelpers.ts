// Types
export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: { [key: string]: any };
  geometry: {
    type: "Polygon" | "Point";
    coordinates: number[][][] | number[];
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// 1. Navigation Logic
export const saveNavigationState = (state: any) => {
  localStorage.setItem('navigation_state', JSON.stringify({
    ...state,
    created_at: new Date().toISOString()
  }));
};

export const clearNavigationState = () => {
  localStorage.removeItem('navigation_state');
};

export const openNavigation = (lat: number, lng: number, address?: string, options: any = {}) => {
  if (!lat || !lng) {
    if (address) {
      const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
      window.open(wazeUrl, '_blank');
      return;
    }
    return;
  }

  // Preparar estado para navegação interna
  const navState = {
    active: true,
    destination: {
      lat,
      lng,
      address,
      label: options.label || address || 'Destino'
    },
    context_id: options.context_id,
    vehicle_type: options.vehicle_type,
    return_tab: options.return_tab || (window.location.pathname.includes('/entregador') ? 'daily_panel' : 'history')
  };

  saveNavigationState(navState);

  // Disparar evento de navegação
  const navEvent = new CustomEvent('navigateToTab', {
    detail: { tab: 'delivery_navigation' }
  });
  window.dispatchEvent(navEvent);
};


// 2. Debounce Function
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: number | null = null;
  return function (this: any, ...args: any[]) {
    if (timeout) clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      func.apply(this, args);
    }, wait);
  } as T;
}

// 3. Export to GeoJSON
export const exportAreasToGeoJSON = (areas: LatLng[][]): string => {
  const features: GeoJSONFeature[] = areas.map((area, index) => ({
    type: "Feature",
    properties: {
      id: `area_${index + 1}`,
      name: `Área de Entrega ${index + 1}`,
      createdAt: new Date().toISOString()
    },
    geometry: {
      type: "Polygon",
      // GeoJSON requires [lng, lat] order and closed loops (first point = last point)
      coordinates: [[
        ...area.map(p => [p.lng, p.lat]),
        [area[0].lng, area[0].lat] // Close the loop
      ]]
    }
  }));

  const collection: GeoJSONCollection = {
    type: "FeatureCollection",
    features
  };

  return JSON.stringify(collection, null, 2);
};

// 4. Speech Recognition Helper
export const startSpeechRecognition = (
  onResult: (text: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError("Navegador não suporta voz.");
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    onError("Erro no reconhecimento de voz.");
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
    return recognition;
  } catch (e) {
    onError("Não foi possível iniciar o microfone.");
    return null;
  }
};

// 5. Phone Mask Helper
export const formatPhoneNumber = (value: string): string => {
  if (!value) return "";

  // Strip all non-digit characters
  const onlyNums = value.replace(/[^\d]/g, '');

  // Limit to 11 digits
  const truncatedNums = onlyNums.slice(0, 11);

  if (truncatedNums.length <= 2) {
    return `(${truncatedNums}`;
  }
  if (truncatedNums.length <= 7) {
    return `(${truncatedNums.slice(0, 2)}) ${truncatedNums.slice(2, 7)}`;
  }
  return `(${truncatedNums.slice(0, 2)}) ${truncatedNums.slice(2, 7)}-${truncatedNums.slice(7, 11)}`;
};

// 6. CPF Mask Helper
export const formatCpf = (value: string): string => {
  if (!value) return "";
  const onlyNums = value.replace(/[^\d]/g, '');
  const truncatedNums = onlyNums.slice(0, 11);

  if (truncatedNums.length <= 3) {
    return truncatedNums;
  }
  if (truncatedNums.length <= 6) {
    return `${truncatedNums.slice(0, 3)}.${truncatedNums.slice(3)}`;
  }
  if (truncatedNums.length <= 9) {
    return `${truncatedNums.slice(0, 3)}.${truncatedNums.slice(3, 6)}.${truncatedNums.slice(6)}`;
  }
  return `${truncatedNums.slice(0, 3)}.${truncatedNums.slice(3, 6)}.${truncatedNums.slice(6, 9)}-${truncatedNums.slice(9, 11)}`;
};

// 7. CNPJ/CPF Mask Helper
export const formatCnpjCpf = (value: string): string => {
  if (!value) return "";
  const onlyNums = value.replace(/[^\d]/g, '');

  if (onlyNums.length <= 11) {
    // CPF formatting
    return formatCpf(value);
  } else {
    // CNPJ formatting
    const truncatedNums = onlyNums.slice(0, 14);
    if (truncatedNums.length <= 2) {
      return truncatedNums;
    }
    if (truncatedNums.length <= 5) {
      return `${truncatedNums.slice(0, 2)}.${truncatedNums.slice(2)}`;
    }
    if (truncatedNums.length <= 8) {
      return `${truncatedNums.slice(0, 2)}.${truncatedNums.slice(2, 5)}.${truncatedNums.slice(5)}`;
    }
    if (truncatedNums.length <= 12) {
      return `${truncatedNums.slice(0, 2)}.${truncatedNums.slice(2, 5)}.${truncatedNums.slice(5, 8)}/${truncatedNums.slice(8)}`;
    }
    return `${truncatedNums.slice(0, 2)}.${truncatedNums.slice(2, 5)}.${truncatedNums.slice(5, 8)}/${truncatedNums.slice(8, 12)}-${truncatedNums.slice(12, 14)}`;
  }
};

