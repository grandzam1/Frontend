import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from 'cn';

export type ToastVariant = 'success' | 'error';

export type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (description: string, title?: string) => string;
  error: (description: string, title?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${++toastId}`;
      const variant = input.variant ?? 'success';
      const durationMs = input.durationMs ?? (variant === 'error' ? 6000 : 3500);
      setToasts((current) => [
        ...current,
        {
          id,
          title: input.title,
          description: input.description,
          variant,
          durationMs,
        },
      ]);
      window.setTimeout(() => dismiss(id), durationMs);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (description, title = 'Saved') =>
        toast({ description, title, variant: 'success' }),
      error: (description, title = 'Something went wrong') =>
        toast({ description, title, variant: 'error' }),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((item) => {
          const Icon = item.variant === 'error' ? AlertCircle : CheckCircle2;
          return (
            <div
              key={item.id}
              className={cn(
                'toast',
                item.variant === 'error' ? 'toast--error' : 'toast--success',
              )}
              role={item.variant === 'error' ? 'alert' : 'status'}
              data-testid={`toast-${item.variant}`}
            >
              <Icon className="toast__icon" aria-hidden />
              <div className="toast__body">
                {item.title ? <p className="toast__title">{item.title}</p> : null}
                <p className="toast__description">{item.description}</p>
              </div>
              <button
                type="button"
                className="toast__close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(item.id)}
              >
                <X aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }
  return context;
}
