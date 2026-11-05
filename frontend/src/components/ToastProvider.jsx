import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'success', title) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((current) => [...current.slice(-3), { id, message, type, title }])
      window.setTimeout(() => dismiss(id), 4600)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      success: (message, title) => push(message, 'success', title),
      error: (message, title) => push(message, 'error', title),
      info: (message, title) => push(message, 'info', title),
      dismiss,
    }),
    [dismiss, push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info
          return (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span className="toast-icon">
                <Icon size={19} />
              </span>
              <div className="toast-copy">
                {toast.title && <strong>{toast.title}</strong>}
                <span>{toast.message}</span>
              </div>
              <button className="icon-button ghost small" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context
}
