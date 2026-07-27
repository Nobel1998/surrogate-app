import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Next clones request bodies through proxy; default 10MB truncates large PDFs.
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
