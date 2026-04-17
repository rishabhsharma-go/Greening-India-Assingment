/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ASSIGNEE_LOOKUP_TEMPLATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
