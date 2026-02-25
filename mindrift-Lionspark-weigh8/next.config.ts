import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: false, // Disabled to fix reload issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/camera-images/:path*',
        destination: 'http://localhost:3021/images/processed/:path*',
      },
    ];
  },
};

export default nextConfig;
