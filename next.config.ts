import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Permite carregar imagens de qualquer URL (útil quando integrarmos fotos dos produtos)
    remotePatterns: [],
  },
  // O Cloudscape publica ESM não transpilado — o Next precisa transpilar
  // esses pacotes ele mesmo antes de rodar no servidor/build.
  transpilePackages: [
    "@cloudscape-design/components",
    "@cloudscape-design/component-toolkit",
  ],
};

export default nextConfig;
