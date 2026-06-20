import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @roam/core is a source-only workspace package (no build step); let Next
  // transpile it instead of expecting prebuilt JS.
  transpilePackages: ['@roam/core'],
  images: {
    // Trail/region photos are served from R2 (and, in dev, may come straight
    // from OSM/Wikimedia source URLs). Allow https remote images broadly here;
    // tighten to the R2 custom domain once it is live (§3).
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
