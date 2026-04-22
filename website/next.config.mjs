import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMDX } from 'fumadocs-mdx/next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteNodeModules = path.resolve(__dirname, 'node_modules');

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      'fumadocs-ui': path.resolve(websiteNodeModules, 'fumadocs-ui'),
      'fumadocs-core': path.resolve(websiteNodeModules, 'fumadocs-core'),
    },
  },
  output: 'export',
  reactStrictMode: true,
  basePath: process.env.BASE_PATH || '',
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@dayflow/core',
    '@dayflow/react',
    '@dayflow/plugin-drag',
    '@dayflow/plugin-keyboard-shortcuts',
    '@dayflow/plugin-localization',
    '@dayflow/plugin-sidebar',
    '@dayflow/blossom-color-picker',
    '@dayflow/blossom-color-picker-react',
  ],
};

// Apply webpack fix after withMDX so it isn't overridden
const mdxConfig = withMDX(config);
const originalWebpack = mdxConfig.webpack;
mdxConfig.webpack = (webpackConfig, options) => {
  const result = originalWebpack
    ? originalWebpack(webpackConfig, options)
    : webpackConfig;
  result.resolve.modules = [
    websiteNodeModules,
    ...(result.resolve.modules ?? ['node_modules']),
  ];
  return result;
};

export default mdxConfig;
