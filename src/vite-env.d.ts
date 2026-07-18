/// <reference types="vite/client" />

/**
 * Environment variables exposed to the client.
 * Only variables prefixed with VITE_ are available in the browser.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
