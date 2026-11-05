import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CalendarPlus,
  Download,
  Eye,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  X,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { formatDate, formatTime, initials } from '../lib/format'
import { useToast } from '../components/ToastProvider'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const FILTERS = [
  { value: 'ALL', label: 'All appointments' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function AppointmentDetails({ appointment }) {
  if (!appointment) return null
  const key = `${appointment.appointmentDate.replaceAll('-', '')}-${appointment.appointmentTime.replace(':', '')}-${appointment.id}`
  return (
    <div className="detail-sheet">
      <div className="detail-hero">
        <span className="avatar">{initials(appointment.patientName)}</span>
        <div>
          <h3>{appointment.patientName}</h3>
          <span className="mono">{appointment.id}</span>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="detail-grid">
        <div>
          <span className="detail-label">Appointment date</span>
          <strong>{formatDate(appointment.appointmentDate)}</strong>
        </div>
        <div>
          <span className="detail-label">Appointment time</span>
          <strong>{formatTime(appointment.appointmentTime)}</strong>
        </div>
        <div>
          <span className="detail-label">
            <Mail size={12} /> Email
          </span>
          <strong>{appointment.email}</strong>
        </div>
        <div>
          <span className="detail-label">
            <Phone size={12} /> Phone
          </span>
          <strong>{appointment.phone}</strong>
        </div>
      </div>
      <div className="detail-description">
        <span className="detail-label">Description</span>
        <p>{appointment.description}</p>
      </div>
      <div className="detail-avl">
        <span>AVL composite key</span>
        <code>{key}</code>
        <small>
          Ordered by date → time → unique ID. The active scheduling tree contains this key only while the
          status is BOOKED.
        </small>
      </div>
      {appointment.cancelledAt && (
        <div className="cancelled-at">
          <XCircle size={14} />
          Cancelled on {new Date(appointment.cancelledAt).toLocaleString('en-IN')}
        </div>
      )}
    </div>
  )
}

export default function ManageAppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const toast = useToast()

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await api.appointments(query, statusFilter)
      setAppointments(result)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to load appointments.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => load(), query ? 280 : 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter])

  const counts = useMemo(() => {
    return {
      total: appointments.length,
      booked: appointments.filter((appointment) => appointment.status === 'BOOKED').length,
      cancelled: appointments.filter((appointment) => appointment.status === 'CANCELLED').length,
    }
  }, [appointments])

  const openDetails = async (appointment) => {
    setDetail(appointment)
    setDetailLoading(true)
    try {
      const fresh = await api.appointment(appointment.id)
      setDetail(fresh)
    } catch {
      // Keep the row data if the detail request fails.
    } finally {
      setDetailLoading(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const operation = await api.cancel(cancelTarget.id)
      toast.success(
        `${cancelTarget.id} was cancelled. ${
          operation.rotations?.length
            ? `The AVL tree performed ${operation.rotations.length} rotation(s).`
            : 'No rotation was required.'
        }`,
        'Removed from the tree',
      )
      setCancelTarget(null)
      if (detail?.id === cancelTarget.id) setDetail(null)
      await load(true)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Cancellation failed.')
    } finally {
      setCancelling(false)
    }
  }

  const exportCsv = () => {
    if (!appointments.length) {
      toast.info('There are no rows to export.')
      return
    }
    const header = ['Appointment ID', 'Patient Name', 'Email', 'Phone', 'Date', 'Time', 'Status', 'Description']
    const rows = appointments.map((appointment) => [
      appointment.id,
      appointment.patientName,
      appointment.email,
      appointment.phone,
      appointment.appointmentDate,
      appointment.appointmentTime,
      appointment.status,
      appointment.description,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `medislot-appointments-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`${appointments.length} rows exported.`, 'CSV ready')
  }

  return (
    <div className="manage-page">
      <section className="manage-toolbar card fade-up">
        <div className="manage-intro">
          <span className="eyebrow-chip">
            <CalendarDays size={12} /> {counts.total} result{counts.total === 1 ? '' : 's'}
          </span>
          <h2>Appointment registry</h2>
          <p>Search the persisted records and manage booking status without breaking the tree index.</p>
        </div>
        <div className="manage-actions">
          <button className="button secondary" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
          <Link to="/book" className="button primary">
            <CalendarPlus size={16} /> New appointment
          </Link>
        </div>
      </section>

      <section className="card table-card fade-up">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by appointment ID, patient, email or phone…"
              aria-label="Search appointments"
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="filter-tabs">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={`filter-tab ${statusFilter === filter.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            className="icon-button"
            onClick={() => load(true)}
            disabled={refreshing}
            aria-label="Refresh appointments"
            title="Refresh"
          >
            <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
          </button>
        </div>

        <div className="table-meta">
          <span>
            <Filter size={13} /> {statusFilter === 'ALL' ? 'All statuses' : statusFilter.toLowerCase()}
          </span>
          <span>
            {counts.booked} booked · {counts.cancelled} cancelled in view
          </span>
        </div>

        {loading ? (
          <div className="table-loading">
            {[1, 2, 3, 4, 5].map((item) => (
              <div className="skeleton" style={{ height: 60 }} key={item} />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Stethoscope size={28} />
            </div>
            <h3>No appointments match</h3>
            <p>
              {query
                ? `Nothing matched “${query}”. Try a patient name or an ID such as APT-0001.`
                : 'The registry is empty. Book an appointment to create the first AVL node.'}
            </p>
            {!query && (
              <Link to="/book" className="button primary" style={{ marginTop: 17 }}>
                <CalendarPlus size={16} /> Book appointment
              </Link>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} onClick={() => openDetails(appointment)} className="clickable-row">
                    <td>
                      <span className="id-cell mono">{appointment.id}</span>
                    </td>
                    <td>
                      <div className="patient-cell">
                        <span className="avatar small">{initials(appointment.patientName)}</span>
                        <div>
                          <strong>{appointment.patientName}</strong>
                          <span>{appointment.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="phone-cell">{appointment.phone}</span>
                    </td>
                    <td>
                      <span className="date-cell">{formatDate(appointment.appointmentDate)}</span>
                    </td>
                    <td>
                      <span className="time-cell">{formatTime(appointment.appointmentTime)}</span>
                    </td>
                    <td>
                      <StatusBadge status={appointment.status} />
                    </td>
                    <td>
                      <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          className="row-action"
                          onClick={() => openDetails(appointment)}
                          title="View details"
                          aria-label={`View ${appointment.id}`}
                        >
                          <Eye size={15} />
                        </button>
                        {appointment.status === 'BOOKED' && (
                          <button
                            className="row-action danger"
                            onClick={() => setCancelTarget(appointment)}
                            title="Cancel appointment"
                            aria-label={`Cancel ${appointment.id}`}
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Appointment details"
        subtitle={detailLoading ? 'Refreshing from the backend…' : 'Complete persisted record and AVL key.'}
        size="md"
        footer={
          <>
            <button className="button secondary" onClick={() => setDetail(null)}>
              Close
            </button>
            {detail?.status === 'BOOKED' && (
              <button
                className="button danger"
                onClick={() => {
                  setCancelTarget(detail)
                  setDetail(null)
                }}
              >
                <XCircle size={16} /> Cancel appointment
              </button>
            )}
          </>
        }
      >
        <AppointmentDetails appointment={detail} />
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        loading={cancelling}
        title="Cancel this appointment?"
        message={
          cancelTarget
            ? `${cancelTarget.id} for ${cancelTarget.patientName} will be marked CANCELLED in H2 and removed from the active AVL tree. The slot becomes bookable again.`
            : ''
        }
        confirmLabel="Cancel appointment"
        tone="danger"
      />
    </div>
  )
}
