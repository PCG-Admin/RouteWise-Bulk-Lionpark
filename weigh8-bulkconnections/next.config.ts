import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: false, // Disabled to fix reload issues
  // TypeScript and ESLint errors are enforced — do not suppress in production builds
};

export default nextConfig;
