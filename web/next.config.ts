import type { NextConfig } from "next";
import "./lib/utils/env";

const nextConfig: NextConfig = {
  output: "standalone",

  async rewrites() {
    return [
      {
        /**
         * Captura todas as chamadas que começam com /api/v1
         * e redireciona para o seu servidor Fastify.
         */
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
    ];
  },

  // Opcional: Se você for usar imagens de domínios externos (ex: S3, Cloudinary)
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
