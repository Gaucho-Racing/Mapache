export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://mapache-api.gauchoracing.com";

export const BACKEND_WS_URL =
  import.meta.env.VITE_BACKEND_WS_URL ?? "wss://mapache-api.gauchoracing.com";

export const SENTINEL_OAUTH_BASE_URL =
  "https://sso.gauchoracing.com/oauth/authorize";
export const SENTINEL_CLIENT_ID =
  import.meta.env.VITE_SENTINEL_CLIENT_ID ?? "z6V9NREjMFhf";

export const MAPBOX_ACCESS_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";

export const SOCIAL_LINKS = {
  github: "https://github.com/gaucho-racing/mapache",
  instagram: "https://instagram.com/gauchoracingucsb",
  twitter: "https://twitter.com/gauchoracing_",
  linkedin:
    "https://www.linkedin.com/company/gaucho-racing-at-uc-santa-barbara",
};

export const GR_COLORS = {
  PINK: "#e105a3",
  PURPLE: "#8412fc",
};
