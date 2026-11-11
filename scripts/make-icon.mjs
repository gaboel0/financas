// Gera src-tauri/app-icon.png (1024px): quadrado arredondado azul com casa branca.
import sharp from "sharp";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="230" fill="#2563eb"/>
  <path d="M512 214 L206 486 H296 V780 H440 V584 H584 V780 H728 V486 H818 Z" fill="#ffffff" stroke="#ffffff" stroke-width="24" stroke-linejoin="round"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("src-tauri/app-icon.png");
