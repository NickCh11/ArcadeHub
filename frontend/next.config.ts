import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://lhwvcwakbcegwknvezpe.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_ML8GDmkJyOWww8obM_v9Og_Q8Q5Hnsm",
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
  },
};

export default nextConfig;
