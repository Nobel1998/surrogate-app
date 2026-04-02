import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Allow larger uploads (videos) via App Route without truncation (default 10MB).
  // 150 MB limit (explicit object form)
  middlewareClientMaxBodySize: {
    value: 150 * 1024 * 1024,
  },
};

export default nextConfig;
