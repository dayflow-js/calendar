'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { ReleaseImage } from '@/lib/changelog';

import styles from './changelog.module.css';

/** Opens a screenshot at full size in a modal dialog. */
export function Lightbox({
  image,
  className,
  style,
  children,
}: {
  image: ReleaseImage;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type='button'
        className={className}
        style={style}
        aria-label={`Enlarge: ${image.alt}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label={image.alt}
        onClick={() => dialogRef.current?.close()}
      >
        <Image
          className={image.darkSrc ? styles.lightOnly : undefined}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
        />
        {image.darkSrc && (
          <Image
            className={styles.darkOnly}
            src={image.darkSrc}
            alt={image.alt}
            width={image.width}
            height={image.height}
          />
        )}
        <button
          type='button'
          className={styles.lightboxClose}
          aria-label='Close'
          autoFocus
        >
          <X size={18} />
        </button>
      </dialog>
    </>
  );
}
