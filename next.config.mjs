/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  reactStrictMode: false,
  poweredByHeader: false,
};

export default nextConfig;
