/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base do backend/ FastAPI (ex: http://localhost:8000). Ver src/lib/api.ts. */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
