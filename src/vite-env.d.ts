/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_URL: string
  readonly VITE_MY_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
