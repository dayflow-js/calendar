import { JSX, ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

interface ButtonProps extends Omit<
  JSX.HTMLAttributes<HTMLButtonElement>,
  'onClick'
> {
  loading?: boolean;
  loadingText?: string;
  onClick?: (
    e: JSX.TargetedMouseEvent<HTMLButtonElement>
  ) => void | Promise<void>;
  children?: ComponentChildren;
  // Explicitly add missing attributes if Omit or JSX.HTMLAttributes is failing
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const LoadingButton = ({
  children,
  onClick,
  loading: propLoading,
  loadingText,
  disabled,
  className,
  type = 'button',
  ...props
}: ButtonProps) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = propLoading || internalLoading;

  const handleClick = async (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;

    if (onClick) {
      const result = onClick(e);
      if (result && typeof result === 'object' && 'then' in result) {
        setInternalLoading(true);
        try {
          await result;
        } finally {
          setInternalLoading(false);
        }
      }
    }
  };

  const buttonContent = (
    <>
      {isLoading && (
        <svg
          className='df-loading-btn-spinner'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
        >
          <circle
            className='df-loading-btn-track'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          />
          <path
            className='df-loading-btn-fill'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
          />
        </svg>
      )}
      <span className='df-loading-btn-label'>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </>
  );

  const commonProps = {
    ...props,
    disabled: disabled || isLoading,
    onClick: handleClick,
    className: `df-loading-btn${className ? ` ${className}` : ''}`,
    'data-loading': isLoading ? 'true' : 'false',
  };

  if (type === 'submit') {
    return (
      <button {...commonProps} type='submit'>
        {buttonContent}
      </button>
    );
  }

  if (type === 'reset') {
    return (
      <button {...commonProps} type='reset'>
        {buttonContent}
      </button>
    );
  }

  return (
    <button {...commonProps} type='button'>
      {buttonContent}
    </button>
  );
};
