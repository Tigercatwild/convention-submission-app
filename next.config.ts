import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // Note: bodyParser config doesn't work with App Router
  // We'll handle this in the API route itself
};

export default nextConfig;
