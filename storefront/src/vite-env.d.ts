/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STOREFRONT_PATH_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
