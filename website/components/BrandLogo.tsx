import Image from 'next/image';
import clsx from 'clsx';
import { withBasePath } from '@/utils/basePath';

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
};

const basePath = process.env.BASE_PATH || '';

export function BrandLogo({ className, showText = true }: BrandLogoProps) {
  return (
    <span
      className={clsx(
        'flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white',
        className
      )}
    >
      <Image
        src={withBasePath('/logo.png')}
        alt="DayFlow logo"
        width={28}
        height={28}
        priority
        className="h-7 w-auto"
      />
      {showText && <span className="leading-none">DayFlow</span>}
    </span>
  );
}
