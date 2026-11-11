import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // dev em pasta própria: `next build` (produção) não quebra o `npm run dev` rodando
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  serverExternalPackages: ["pluggy-sdk"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const ext = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(ext) ? ext : [ext]),
        { "node:sqlite": "commonjs node:sqlite", "pluggy-sdk": "commonjs pluggy-sdk" },
      ];
    }
    return config;
  },
};

export default nextConfig;
