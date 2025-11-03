import nextra from 'nextra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  defaultShowCopyCode: true,
});

export default withNextra({
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.BASE_PATH || '',
  webpack: (config, { isServer, webpack }) => {
    // Force all React imports to use website's node_modules to avoid version conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(
        __dirname,
        './node_modules/react/jsx-runtime'
      ),
      'react/jsx-dev-runtime': path.resolve(
        __dirname,
        './node_modules/react/jsx-dev-runtime'
      ),
    };

    // Fix for nextra/uvu compatibility issues in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        uvu: false,
      };

      // Replace uvu/diff with a browser-safe stub
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /uvu\/diff/,
          path.resolve(__dirname, './webpack-stub.js')
        )
      );
    }

    return config;
  },
});
