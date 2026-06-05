/// <reference types="vite/client" />

// vite-imagetools: optimized image imports with query params (?format=avif etc.)
declare module "*&format=avif" {
  const src: string;
  export default src;
}
declare module "*&format=webp" {
  const src: string;
  export default src;
}
declare module "*?format=avif" {
  const src: string;
  export default src;
}
declare module "*?format=webp" {
  const src: string;
  export default src;
}
