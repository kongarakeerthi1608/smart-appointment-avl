import { AlertTriangle, LoaderCircle } from 'lucide-react'
import Modal from './Modal.jsx'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="button secondary" onClick={onClose} disabled={loading}>
            Keep it
          </button>
          <button className={`button ${tone}`} onClick={onConfirm} disabled={loading}>
            {loading && <LoaderCircle size={17} className="spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-copy">
        <span className={`confirm-icon ${tone}`}>
          <AlertTriangle size={24} />
        </span>
        <p>{message}</p>
      </div>
    </Modal>
  )
}
