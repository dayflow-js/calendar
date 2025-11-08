import type { NextConfig } from "next";
import nextra from 'nextra';
import path from 'path';

const withNextra = nextra({
  // Enable search with pagefind for static export
  search: {
    codeblocks: true,
  },
});

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.BASE_PATH || '',
  outputFileTracingRoot: path.join(process.cwd()),
  images: {
    unoptimized: true, // Required for static export
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

export default withNextra(nextConfig);
