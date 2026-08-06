/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare const __APP_VERSION__: string;
