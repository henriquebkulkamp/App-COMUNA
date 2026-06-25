import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite carregar imagens de qualquer URL (útil quando integrarmos fotos dos produtos)
    remotePatterns: [],
  },
};

export default nextConfig;
