import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    // Disable turbopack to use webpack instead
    turbo: undefined,
  },
};

export default nextConfig;
