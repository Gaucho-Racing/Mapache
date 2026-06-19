import axios from "axios";
import { getAccessToken } from "@/lib/auth";
import { getAxiosErrorCode, getAxiosErrorMessage } from "@/lib/axios-error-handler";

// Single authenticated axios client for the Mapache gateway. A request
// interceptor injects the sentinel bearer token (from lib/auth) so callers no
// longer hand-roll an authHeader() per request.
//
// Success envelopes are intentionally NOT unwrapped here: the gateway nests
// bodies differently per upstream (Go endpoints read response.data.data; the
// Python query endpoints read response.data.data.data), so each caller still
// peels its own envelope. Error extraction is centralized in
// lib/axios-error-handler; it is re-exported below as the canonical helper.
//
// NOTE: app-wide migration of the remaining hand-rolled `sentinel_access_token`
// call sites onto this client is a follow-up (PR3b).
export const http = axios.create();

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { getAxiosErrorCode, getAxiosErrorMessage };
