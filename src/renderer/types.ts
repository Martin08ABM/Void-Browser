export interface Tab {
  id: number;
  title: string;
  url: string;
  isActive: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  favicon?: string;
  isPlayingAudio?: boolean;
  isMuted?: boolean;
}

export type PrivacyLevel = "high" | "medium" | "low";

export interface SearchEngine {
  name: string;
  url: string;
  description: string;
  privacyLevel: PrivacyLevel;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    name: "Google",
    url: "https://www.google.com/search?q=",
    description: "El motor más popular. Rastrea tu actividad para personalizar anuncios y resultados.",
    privacyLevel: "low",
  },
  {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=",
    description: "No rastrea, no perfila y no vende tus datos. Alta privacidad por defecto.",
    privacyLevel: "high",
  },
  {
    name: "Microsoft Bing",
    url: "https://www.bing.com/search?q=",
    description: "Integrado con Microsoft. Rastrea tu historial para mejorar resultados.",
    privacyLevel: "low",
  },
  {
    name: "Yandex",
    url: "https://yandex.com/search/?text=",
    description: "Motor ruso que recolecta datos de usuario para personalización.",
    privacyLevel: "low",
  },
  {
    name: "Ecosia",
    url: "https://www.ecosia.org/search?q=",
    description: "Busca ecológica que planta árboles. Rastrea mínimamente para mejorar.",
    privacyLevel: "medium",
  },
  {
    name: "Qwant",
    url: "https://www.qwant.com/?q=",
    description: "Motor europeo que no rastrea ni filtra resultados por perfil.",
    privacyLevel: "high",
  },
  {
    name: "Kagi",
    url: "https://kagi.com/search?q=",
    description: "De pago, sin anuncios ni rastreo. Resultados de alta calidad.",
    privacyLevel: "high",
  },
];

export const DEFAULT_SEARCH_ENGINE = SEARCH_ENGINES[0];
