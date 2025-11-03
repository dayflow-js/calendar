# Day Flow Website

This is the documentation website for Day Flow, built with [Next.js](https://nextjs.org/) and [Nextra](https://nextra.site/).

## Features

- **Interactive Homepage**: A modern landing page with a fully functional calendar demo
- **Live Examples**: Users can interact with the calendar directly on the homepage
- **Schedule-x Inspired Design**: Clean, modern UI with feature cards and code examples
- **Documentation**: Comprehensive docs powered by Nextra

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the website.

## Important: Import from Source

Since this package is **not yet published to npm**, the website imports components directly from the parent `src` directory:

```tsx
import { useCalendarApp, DayFlowCalendar } from '../../src';
```

The webpack configuration ensures all React imports use the website's React version to avoid "Invalid hook call" errors.

## Build

Build the website for production:

```bash
npm run build
```

## Deployment

The website can be deployed to:

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [GitHub Pages](https://pages.github.com)
- Any static hosting service

## Structure

```
website/
├── pages/
│   ├── index.tsx              # Interactive homepage with calendar demo
│   ├── _app.tsx               # App wrapper (imports calendar CSS)
│   └── docs/                  # Documentation pages (MDX)
├── components/
│   ├── InteractiveCalendar.tsx        # Calendar demo component
│   ├── InteractiveCalendarWrapper.tsx # Dynamic import wrapper
│   └── Demo.tsx                       # Demo wrapper component
├── public/                    # Static assets
├── styles/                    # Global styles
├── next.config.mjs            # Next.js config (with React alias)
└── theme.config.tsx           # Nextra theme configuration
```

## Writing Documentation

Documentation files are written in MDX (Markdown + JSX). You can:

- Use standard Markdown syntax
- Import and use React components
- Add interactive examples

Example:

```mdx
import { Demo } from '@/components/Demo';

# My Page

Some content here.

<Demo>
  <YourComponent />
</Demo>
```

## Troubleshooting

### Clear Cache

If you encounter build issues, try clearing the Next.js cache:

```bash
rm -rf .next
npm run dev
```

### React Version Errors

The website uses React 18.3.1 for compatibility with Next.js 14.2. The webpack configuration in `next.config.mjs` forces all React imports (including from `../../src`) to use the website's React version:

```javascript
config.resolve.alias = {
  react: path.resolve(__dirname, './node_modules/react'),
  'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
  // ...
};
```

This prevents "Invalid hook call" errors when importing from the parent src directory.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Nextra Documentation](https://nextra.site)
