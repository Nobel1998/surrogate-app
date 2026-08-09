import type { NextConfig } from "next";

/** Direct APK for users who cannot open Google Play (e.g. China). */
const ANDROID_APK_URL =
  process.env.ANDROID_APK_URL ||
  'https://expo.dev/artifacts/eas/zJ9vLdqrPZBz4NwfA8NK7aRZsBDtXe050gEY86-4Gik.apk';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Next clones request bodies through proxy; default 10MB truncates large PDFs.
    proxyClientMaxBodySize: '100mb',
  },
  async redirects() {
    return [
      {
        source: '/downloads/mysurro-android.apk',
        destination: ANDROID_APK_URL,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
