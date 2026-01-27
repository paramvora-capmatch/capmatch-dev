import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react", "recharts", "framer-motion"],
  },
  images: {
    remotePatterns: [
      // Local Supabase development - public URLs
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      // Local Supabase development - signed URLs
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/sign/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/sign/**',
      },
      // Supabase cloud (production) - public URLs
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Supabase cloud (production) - signed URLs
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
      // Also allow any Supabase project URL (for flexibility) - public URLs
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      // Also allow any Supabase project URL (for flexibility) - signed URLs
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  // ...other configurations
};

export default nextConfig;