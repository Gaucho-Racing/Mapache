export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "https://mapache.gauchoracing.com/api";

export const BACKEND_WS_URL =
  import.meta.env.VITE_BACKEND_WS_URL ?? "wss://mapache.gauchoracing.com/api";

export const SENTINEL_OAUTH_BASE_URL =
  "https://sentinel-v5.gauchoracing.com/oauth/authorize";
export const SENTINEL_CLIENT_ID =
  import.meta.env.VITE_SENTINEL_CLIENT_ID ?? "TIvD6jCH3mGV";

// Public Mapbox token for the gaucho-racing org. Public tokens (pk.*) are
// designed to be embedded in client-side bundles — they're scoped to read
// styles/tiles, no admin capability. Hardcoded so every dev gets working
// maps out of the box without populating their .env.
export const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1IjoiZ2F1Y2hvcmFjaW5nIiwiYSI6ImNtcWhzczIyMjAwbjQycHBzbnhjeXRkcGEifQ.Uoy_aQ1KHZk5b_3LiLXyMA";

export const SKIP_AUTH_CHECK =
  import.meta.env.VITE_SKIP_AUTH_CHECK === "true";

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
