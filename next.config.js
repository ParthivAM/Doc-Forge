/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
    // Prevent webpack from bundling pdf-parse and its dependencies
    // This fixes the "Object.defineProperty called on non-object" error
    experimental: {
        serverComponentsExternalPackages: ['pdf-parse'],
    },
};

module.exports = nextConfig;
