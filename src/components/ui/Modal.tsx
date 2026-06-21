import { useEffect, useCallback, type ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div className={`
        relative bg-white w-full ${sizeClasses[size]} rounded-2xl shadow-2xl
        border border-outline-variant overflow-hidden animate-slide-in
      `}>
        {title && (
          <div className="px-5 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-low/30">
            <h3 id="modal-title" className="font-bold text-sm text-on-surface">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
            </button>
          </div>
        )}
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
