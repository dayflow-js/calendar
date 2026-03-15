import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: [
    '@dayflow/core',
    '@dayflow/react',
    '@dayflow/plugin-drag',
    '@dayflow/plugin-keyboard-shortcuts',
    '@dayflow/plugin-localization',
    '@dayflow/plugin-sidebar',
  ],
  rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
