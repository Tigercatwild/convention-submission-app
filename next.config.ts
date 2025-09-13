import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow up to 10MB for file uploads
    },
  },
};

export default nextConfig;
