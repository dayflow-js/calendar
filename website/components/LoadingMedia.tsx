'use client';

import Image from 'next/image';
import type { ImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { VideoHTMLAttributes } from 'react';

export function LoadingImage({
  onLoad,
  onError,
  className,
  ...props
}: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      {...props}
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

type LoadingVideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  src: string;
};

export function LoadingVideo({
  src,
  className,
  onLoadedMetadata,
  onLoadedData,
  onError,
  ...props
}: LoadingVideoProps) {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 1) {
      setLoaded(true);
    }
  }, [src]);

  return (
    // These muted interface demos have no spoken content.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      {...props}
      ref={videoRef}
      className={`${className || ''} ${loaded ? '' : 'media-loading-pending'}`}
      onLoadedMetadata={event => {
        setLoaded(true);
        onLoadedMetadata?.(event);
      }}
      onLoadedData={event => {
        setLoaded(true);
        onLoadedData?.(event);
      }}
      onError={event => {
        setLoaded(true);
        onError?.(event);
      }}
    >
      <source src={src} type='video/mp4' />
    </video>
  );
}
