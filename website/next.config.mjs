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
  webpack: (config, { isServer, webpack }) => {
    // Allow imports from parent directory (src folder)
    config.resolve.modules.push('..');

    // Add alias for @ to resolve to parent src directory
    // Force all React imports to use website's node_modules to avoid version conflicts
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
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

    // Ignore CSS imports from parent src directory
    // We use website's own Tailwind setup instead
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/styles\/tailwind\.css$/,
        contextRegExp: /src$/,
      })
    );

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
  transpilePackages: ['react-calendar-package'],
});
