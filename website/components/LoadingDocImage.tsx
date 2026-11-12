'use client';

import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

export function LoadingDocImage({
  onLoad,
  onError,
  className,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt || ''}
      className={`${className || ''} ${loaded ? '' : 'media-loading-pending'}`}
      onLoad={event => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={event => {
        setLoaded(true);
        onError?.(event);
      }}
    />
  );
}
