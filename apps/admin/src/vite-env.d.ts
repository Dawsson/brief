interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css";
declare module "@brief/ui/styles.css";
