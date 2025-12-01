
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

// 1. Deep Linking Logic
export const openNavigation = (lat: number, lng: number, address?: string) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const encodedAddress = address ? encodeURIComponent(address) : '';

  // Waze Deep Link
  // Try Waze first if mobile, otherwise Google Maps
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  
  // Google Maps Fallback
  // api=1 ensures cross-platform compatibility
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedAddress}`;

  // Simple heuristic: Try to open Waze, user will choose app if multiple installed on Android.
  // On iOS, it's harder to check installation without custom scheme failover logic which is complex in web.
  // We'll prefer Waze URL which usually redirects to web waze if app missing, or prompts.
  
  window.open(wazeUrl, '_blank');
  // In a real production app, you might use a timeout to fallback to Google Maps if Waze fails to open custom scheme
};

// 2. Debounce Function
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: number | null = null;
  return function(this: any, ...args: any[]) {
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
