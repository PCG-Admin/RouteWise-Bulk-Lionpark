import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
