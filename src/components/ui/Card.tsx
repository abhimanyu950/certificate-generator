import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  noPadding?: boolean;
}

export default function Card({
  title,
  subtitle,
  children,
  noPadding = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white border border-outline-variant rounded-2xl shadow-sm
        ${className}
      `}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-5 pt-5 pb-0">
          {title && <h3 className="text-sm font-bold text-on-surface">{title}</h3>}
          {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}
