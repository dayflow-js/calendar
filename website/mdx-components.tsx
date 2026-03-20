import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { CliPreview } from '@/components/CliPreview';
import { DefaultColorPalette } from '@/components/ColorPalette';
import {
  CreateDayflowTabs,
  FrameworkInstall,
  PackageTabs,
} from '@/components/FrameworkInstall';
import { FrameworkTabs, Tab } from '@/components/FrameworkTabs';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

function DocImg({
  src,
  alt,
  ...props
}: {
  src: string;
  alt?: string;
  [key: string]: unknown;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      src={`${BASE}${src}`}
      alt={alt || ''}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    FrameworkTabs,
    FrameworkInstall,
    PackageTabs,
    CreateDayflowTabs,
    CliPreview,
    Tab,
    DefaultColorPalette,
    DocImg,
    ...components,
  };
}
