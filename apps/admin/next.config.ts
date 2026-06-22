import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Source-only workspace packages (no build step) — let Next transpile them. The admin
  // reads the DB server-side via @roam/db; @roam/content provides the StoredContent types.
  transpilePackages: ['@roam/db', '@roam/content', '@roam/pipeline'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

export default nextConfig;
