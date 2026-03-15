import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { DefaultColorPalette } from '@/components/ColorPalette';
import { FrameworkInstall } from '@/components/FrameworkInstall';
import { FrameworkTabs, Tab } from '@/components/FrameworkTabs';

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
      src={src}
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
    Tab,
    DefaultColorPalette,
    DocImg,
    ...components,
  };
}
