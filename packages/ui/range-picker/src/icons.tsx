interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const ChevronLeft = ({
  className,
  width = 24,
  height = 24,
}: IconProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
    aria-hidden='true'
    focusable='false'
  >
    <path d='m15 18-6-6 6-6' />
  </svg>
);

export const ChevronRight = ({
  className,
  width = 24,
  height = 24,
}: IconProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
    aria-hidden='true'
    focusable='false'
  >
    <path d='m9 18 6-6-6-6' />
  </svg>
);

export const ChevronsLeft = ({
  className,
  width = 24,
  height = 24,
}: IconProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
    aria-hidden='true'
    focusable='false'
  >
    <path d='m11 17-5-5 5-5' />
    <path d='m18 17-5-5 5-5' />
  </svg>
);

export const ChevronsRight = ({
  className,
  width = 24,
  height = 24,
}: IconProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
    aria-hidden='true'
    focusable='false'
  >
    <path d='m6 17 5-5-5-5' />
    <path d='m13 17 5-5-5-5' />
  </svg>
);

export const MoveRight = ({
  className,
  width = 24,
  height = 24,
}: IconProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
    aria-hidden='true'
    focusable='false'
  >
    <path d='M18 8L22 12L18 16' />
    <path d='M2 12H22' />
  </svg>
);
