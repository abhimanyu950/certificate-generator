import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-xl border px-3 py-2 text-xs outline-none transition-all
            bg-surface-container-low
            focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50
            placeholder:text-on-surface-variant/50
            ${leftIcon ? 'pl-10' : ''}
            ${error
              ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400'
              : 'border-outline-variant'
            }
            ${className}
          `}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-[10px] text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-[10px] text-on-surface-variant/70">
          {helperText}
        </p>
      )}
    </div>
  );
}
