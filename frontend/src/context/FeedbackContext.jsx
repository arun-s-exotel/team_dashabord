import { createContext, useContext, useState, useCallback, useRef } from 'react';

const FeedbackContext = createContext(null);

let idSeq = 0;
const nextId = () => ++idSeq;

const TOAST_DURATION = 4000;

const toneStyles = {
  success: {
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  error: {
    bar: 'bg-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    icon: (
      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12a2 2 0 00-3.48 0l-7.07 12a2 2 0 001.74 3z" />
      </svg>
    )
  },
  info: {
    bar: 'bg-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  warning: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12a2 2 0 00-3.48 0l-7.07 12a2 2 0 001.74 3z" />
      </svg>
    )
  }
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolverRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((tone, message, opts = {}) => {
    const id = nextId();
    const duration = opts.duration ?? TOAST_DURATION;
    setToasts(prev => [...prev, { id, tone, message, title: opts.title }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((message, opts) => push('success', message, opts), [push]);
  const error = useCallback((message, opts) => push('error', message, opts), [push]);
  const info = useCallback((message, opts) => push('info', message, opts), [push]);
  const warning = useCallback((message, opts) => push('warning', message, opts), [push]);

  const confirm = useCallback((options = {}) => {
    return new Promise(resolve => {
      confirmResolverRef.current = resolve;
      setConfirmState({
        title: options.title ?? 'Are you sure?',
        message: options.message ?? '',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tone: options.tone ?? 'danger'
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmResolverRef.current?.(true);
    confirmResolverRef.current = null;
    setConfirmState(null);
  }, []);

  const handleCancel = useCallback(() => {
    confirmResolverRef.current?.(false);
    confirmResolverRef.current = null;
    setConfirmState(null);
  }, []);

  return (
    <FeedbackContext.Provider value={{ success, error, info, warning, confirm }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
        {toasts.map(t => {
          const style = toneStyles[t.tone] || toneStyles.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border} shadow-lg backdrop-blur-sm animate-toast-in`}
            >
              <div className={`w-1 self-stretch rounded-full ${style.bar}`} />
              <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
              <div className={`flex-1 ${style.text} text-sm`}>
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className={t.title ? 'mt-0.5' : ''}>{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className={`flex-shrink-0 -m-1 p-1 rounded-md hover:bg-black/5 ${style.text} opacity-60 hover:opacity-100 transition`}
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-modal-in">
            <h3 className="text-lg font-bold text-slate-900">{confirmState.title}</h3>
            {confirmState.message && (
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{confirmState.message}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2.5 text-white rounded-xl font-medium shadow-lg transition-colors ${
                  confirmState.tone === 'danger'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
