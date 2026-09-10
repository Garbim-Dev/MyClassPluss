/// <reference types="vite-plugin-pwa/client" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}