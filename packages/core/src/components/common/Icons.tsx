// Icons are decorative by default; pass aria-hidden={false} plus a label to expose one.
interface IconProps extends Record<string, unknown> {
  className?: string;
  width?: number;
  height?: number;
  title?: string;
}

export const ChevronLeft = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m15 18-6-6 6-6' />
  </svg>
);

export const ChevronRight = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m9 18 6-6-6-6' />
  </svg>
);

export const ChevronsLeft = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m11 17-5-5 5-5' />
    <path d='m18 17-5-5 5-5' />
  </svg>
);

export const ChevronsRight = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m6 17 5-5-5-5' />
    <path d='m13 17 5-5-5-5' />
  </svg>
);

export const ChevronDown = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m6 9 6 6 6-6' />
  </svg>
);

export const Plus = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M5 12h14' />
    <path d='M12 5v14' />
  </svg>
);

export const Search = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <circle cx='11' cy='11' r='8' />
    <path d='m21 21-4.3-4.3' />
  </svg>
);

export const Check = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M20 6 9 17l-5-5' />
  </svg>
);

export const ChevronsUpDown = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m7 15 5 5 5-5' />
    <path d='m7 9 5-5 5 5' />
  </svg>
);

export const X = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M18 6 6 18' />
    <path d='m6 6 12 12' />
  </svg>
);

export const CalendarDays = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M8 2v4' />
    <path d='M16 2v4' />
    <rect width='18' height='18' x='3' y='4' rx='2' />
    <path d='M3 10h18' />
    <path d='M8 14h.01' />
    <path d='M12 14h.01' />
    <path d='M16 14h.01' />
    <path d='M8 18h.01' />
    <path d='M12 18h.01' />
    <path d='M16 18h.01' />
  </svg>
);

export const MoveRight = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M18 8L22 12L18 16' />
    <path d='M2 12H22' />
  </svg>
);

export const Loader2 = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M21 12a9 9 0 1 1-6.219-8.56' />
  </svg>
);

export const Gift = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <rect width='18' height='14' x='3' y='8' rx='2' />
    <path d='M12 5a3 3 0 1 0-3 3' />
    <path d='M12 5a3 3 0 1 1 3 3' />
    <path d='M3 12h18' />
    <path d='M12 22V8' />
  </svg>
);

export const Heart = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' />
  </svg>
);

export const MapPin = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
    <circle cx='12' cy='10' r='3' />
  </svg>
);

export const Star = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
  </svg>
);

export const PanelRightClose = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <rect width='18' height='18' x='3' y='3' rx='2' />
    <path d='M15 3v18' />
    <path d='m8 9 3 3-3 3' />
  </svg>
);

export const PanelRightOpen = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <rect width='18' height='18' x='3' y='3' rx='2' />
    <path d='M15 3v18' />
    <path d='m10 15-3-3 3-3' />
  </svg>
);

export const Calendar = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <rect width='18' height='18' x='3' y='4' rx='2' />
    <path d='M3 10h18' />
    <path d='M8 2v4' />
    <path d='M16 2v4' />
  </svg>
);

export const ArrowLeft = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='m12 19-7-7 7-7' />
    <path d='M19 12H5' />
  </svg>
);

export const AudioLines = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <path d='M4 11a9 9 0 0 1 9 9' />
    <path d='M4 4a16 16 0 0 1 16 16' />
    <circle cx='5' cy='19' r='1' />
  </svg>
);

export const AlertCircle = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <circle cx='12' cy='12' r='10' />
    <line x1='12' x2='12' y1='8' y2='12' />
    <line x1='12' x2='12.01' y1='16' y2='16' />
  </svg>
);

export const CalendarClock = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
    <line x1='16' y1='2' x2='16' y2='6' />
    <line x1='8' y1='2' x2='8' y2='6' />
    <line x1='3' y1='10' x2='21' y2='10' />
    <circle cx='16' cy='16' r='3.5' fill='currentColor' stroke='none' />
    <path
      d='M16 14.5V16L17 16.5'
      stroke='var(--df-color-card, #ffffff)'
      stroke-width='1.2'
      fill='none'
    />
  </svg>
);

export const ListChecks = ({
  className,
  width = 24,
  height = 24,
  ...props
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
    {...props}
  >
    <circle cx='6' cy='7' r='2.5' />
    <polyline points='4.8 7 5.6 7.8 7.2 6.2' stroke-width='1.5' />
    <line x1='11' y1='7' x2='20' y2='7' />
    <circle cx='6' cy='17' r='2.5' />
    <line x1='11' y1='17' x2='17' y2='17' />
  </svg>
);
