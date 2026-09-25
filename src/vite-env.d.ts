/// <reference types="vite/client" />

/**
 * Environment variables exposed to the client.
 * Only variables prefixed with VITE_ are available in the browser.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OFFLINE_GUARD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Type declaration for the `virtual:pwa-register` module injected by
 * `vite-plugin-pwa`. It is resolved at build time by the Vite plugin; this
 * declaration only lets TypeScript see it.
 */
declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedReload?: () => void;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(options?: RegisterSWOptions): () => Promise<void>;
}
