import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CalendarPlus,
  GitBranch,
  Info,
  LockKeyhole,
  Mail,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import {
  addDaysISO,
  formatDate,
  isSunday,
  nextClinicDate,
  todayISO,
} from '../lib/format'
import { useToast } from '../components/ToastProvider'
import Modal from '../components/Modal.jsx'

const INITIAL_FORM = {
  patientName: '',
  email: '',
  phone: '',
  appointmentDate: nextClinicDate(todayISO()),
  appointmentTime: '',
  description: '',
}

function validate(form) {
  const errors = {}
  if (!form.patientName.trim() || form.patientName.trim().length < 2) {
    errors.patientName = 'Enter the patient’s full name.'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!/^[+]?[0-9()\-\s]{7,20}$/.test(form.phone)) {
    errors.phone = 'Enter a valid phone number.'
  }
  if (!form.appointmentDate) {
    errors.appointmentDate = 'Choose an appointment date.'
  } else if (form.appointmentDate < todayISO()) {
    errors.appointmentDate = 'Date cannot be in the past.'
  } else if (isSunday(form.appointmentDate)) {
    errors.appointmentDate = 'The clinic is closed on Sundays.'
  }
  if (!form.appointmentTime) {
    errors.appointmentTime = 'Select an available time slot.'
  }
  if (!form.description.trim() || form.description.trim().length < 5) {
    errors.description = 'Add a brief reason for the visit.'
  }
  return errors
}

export default function BookAppointmentPage() {
  const [searchParams] = useSearchParams()
  const requestedDate = searchParams.get('date')
  const requestedTime = searchParams.get('time')
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    appointmentDate: requestedDate || INITIAL_FORM.appointmentDate,
    appointmentTime: requestedTime || '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [availability, setAvailability] = useState(null)
  const [nextSlot, setNextSlot] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const toast = useToast()

  const maxDate = useMemo(() => addDaysISO(todayISO(), 60), [])
  const selectedDay = form.appointmentDate
  const closed = selectedDay ? isSunday(selectedDay) : false
  const slots = availability?.slots || []
  const availableCount = slots.filter((slot) => slot.available).length

  const loadAvailability = async (date, silent = false) => {
    if (!date) return
    if (!silent) setLoadingSlots(true)
    try {
      const result = await api.availability(date)
      setAvailability(result)
      setNextSlot(result.nextAvailable)
      if (form.appointmentTime) {
        const selected = result.slots.find((slot) => slot.time === form.appointmentTime)
        if (!selected?.available) {
          setForm((current) => ({ ...current, appointmentTime: '' }))
        }
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to load availability.')
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    loadAvailability(selectedDay)
    api
      .nextAvailable()
      .then((result) => setNextSlot(result))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay])

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const chooseSlot = (slot) => {
    if (!slot.available) return
    setForm((current) => ({ ...current, appointmentTime: slot.time }))
    setFieldErrors((current) => ({ ...current, appointmentTime: undefined }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const errors = validate(form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      toast.error(Object.values(errors)[0], 'Check the form')
      return
    }
    setSubmitting(true)
    try {
      const appointment = await api.book({
        ...form,
        patientName: form.patientName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      })
      setConfirmation(appointment)
      toast.success(`${appointment.id} is booked and inserted into the AVL tree.`, 'Appointment confirmed')
      setForm((current) => ({
        ...INITIAL_FORM,
        appointmentDate: current.appointmentDate,
      }))
      await loadAvailability(selectedDay, true)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors && Object.keys(error.fieldErrors).length) {
          setFieldErrors(error.fieldErrors)
        }
        toast.error(error.message, error.status === 409 ? 'Slot unavailable' : 'Booking failed')
        if (error.status === 409) {
          loadAvailability(selectedDay, true)
        }
      } else {
        toast.error('Could not reach the booking API.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="booking-page">
      <section className="booking-main card fade-up">
        <div className="booking-head">
          <div>
            <span className="eyebrow-chip">
              <CalendarPlus size={12} /> New appointment
            </span>
            <h2>Reserve a consultation</h2>
            <p>
              Confirm the patient details and choose one of the clinic’s 30-minute slots. The booking will be
              persisted in H2 and inserted into the live AVL tree.
            </p>
          </div>
          <span className="booking-step">01 / 01</span>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="form-section">
            <div className="form-section-head">
              <span className="form-section-icon">
                <UserRound size={17} />
              </span>
              <div>
                <h3>Patient details</h3>
                <p>Information used for the appointment record.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="patientName">
                  Patient name <em>*</em>
                </label>
                <div className="input-icon-wrap">
                  <UserRound size={16} />
                  <input
                    id="patientName"
                    value={form.patientName}
                    onChange={(event) => update('patientName', event.target.value)}
                    placeholder="e.g. Ananya Iyer"
                    autoComplete="name"
                    className={fieldErrors.patientName ? 'invalid' : ''}
                  />
                </div>
                {fieldErrors.patientName && <span className="field-error">{fieldErrors.patientName}</span>}
              </div>
              <div className="field">
                <label htmlFor="email">
                  Email address <em>*</em>
                </label>
                <div className="input-icon-wrap">
                  <Mail size={16} />
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder="patient@example.com"
                    autoComplete="email"
                    className={fieldErrors.email ? 'invalid' : ''}
                  />
                </div>
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>
              <div className="field">
                <label htmlFor="phone">
                  Phone number <em>*</em>
                </label>
                <div className="input-icon-wrap">
                  <Phone size={16} />
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    className={fieldErrors.phone ? 'invalid' : ''}
                  />
                </div>
                {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <span className="form-section-icon cyan">
                <CalendarDays size={17} />
              </span>
              <div>
                <h3>Visit schedule</h3>
                <p>Clinic hours are 09:00–17:00, Monday through Saturday.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="appointmentDate">
                  Appointment date <em>*</em>
                </label>
                <div className="input-icon-wrap">
                  <CalendarDays size={16} />
                  <input
                    id="appointmentDate"
                    type="date"
                    min={todayISO()}
                    max={maxDate}
                    value={form.appointmentDate}
                    onChange={(event) => update('appointmentDate', event.target.value)}
                    className={fieldErrors.appointmentDate ? 'invalid' : ''}
                  />
                </div>
                <span className="hint">Bookings open up to 60 days ahead.</span>
                {fieldErrors.appointmentDate && <span className="field-error">{fieldErrors.appointmentDate}</span>}
              </div>
              <div className="field">
                <label>
                  Selected slot <em>*</em>
                </label>
                <div className={`selected-slot ${form.appointmentTime ? 'has-slot' : ''}`}>
                  <Clock3 size={17} />
                  {form.appointmentTime ? (
                    <span>
                      {form.appointmentTime} <small>· 30 minutes</small>
                    </span>
                  ) : (
                    <span className="muted">Choose a time below</span>
                  )}
                </div>
                {fieldErrors.appointmentTime && <span className="field-error">{fieldErrors.appointmentTime}</span>}
              </div>
              <div className="field span-2">
                <div className="slot-label-row">
                  <label>
                    Available time slots <em>*</em>
                  </label>
                  <span className={`slot-count ${availableCount === 0 ? 'none' : ''}`}>
                    {loadingSlots ? 'Checking tree…' : `${availableCount} open`}
                  </span>
                </div>

                {closed ? (
                  <div className="closed-banner">
                    <Info size={17} />
                    <div>
                      <strong>Clinic closed</strong>
                      <span>Sundays have no appointment slots. Please choose another date.</span>
                    </div>
                  </div>
                ) : loadingSlots ? (
                  <div className="slot-grid">
                    {Array.from({ length: 16 }).map((_, index) => (
                      <div className="slot-skeleton skeleton" key={index} />
                    ))}
                  </div>
                ) : (
                  <div className="slot-grid">
                    {slots.map((slot) => {
                      const selected = form.appointmentTime === slot.time
                      const isPast = !slot.available && !slot.appointmentId
                      return (
                        <button
                          type="button"
                          key={slot.time}
                          className={`slot-button ${selected ? 'selected' : ''} ${
                            slot.available ? '' : 'unavailable'
                          }`}
                          onClick={() => chooseSlot(slot)}
                          disabled={!slot.available}
                          title={
                            slot.appointmentId
                              ? `Booked by ${slot.appointmentId}`
                              : isPast
                                ? 'Slot has passed'
                                : 'Available'
                          }
                        >
                          <span>{slot.time}</span>
                          {selected ? (
                            <Check size={14} />
                          ) : slot.available ? (
                            <span className="slot-open">Open</span>
                          ) : (
                            <LockKeyhole size={12} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="field span-2">
                <label htmlFor="description">
                  Appointment description <em>*</em>
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder="Briefly describe the reason for the visit, symptoms or follow-up notes…"
                  maxLength={600}
                  className={fieldErrors.description ? 'invalid' : ''}
                />
                <div className="textarea-foot">
                  <span className="hint">This description is stored with the appointment record.</span>
                  <span className="hint">{form.description.length}/600</span>
                </div>
                {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
              </div>
            </div>
          </div>

          <div className="booking-submit">
            <div className="booking-submit-note">
              <GitBranch size={18} />
              <div>
                <strong>AVL insertion is atomic</strong>
                <span>A successful booking immediately updates the backend tree and H2 record.</span>
              </div>
            </div>
            <button className="button primary large" type="submit" disabled={submitting || closed}>
              {submitting ? (
                <>
                  <span className="button-spinner" /> Booking…
                </>
              ) : (
                <>
                  Confirm booking <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <aside className="booking-side">
        <article className="card next-mini-card fade-up">
          <div className="next-mini-head">
            <span className="next-mini-icon">
              <Sparkles size={17} />
            </span>
            <span>Next available</span>
          </div>
          {nextSlot ? (
            <>
              <strong>{nextSlot.dayLabel}</strong>
              <h3>{nextSlot.time}</h3>
              <p>{formatDate(nextSlot.date)}</p>
              <button
                className="button secondary small wide"
                onClick={() => {
                  update('appointmentDate', nextSlot.date)
                  setForm((current) => ({ ...current, appointmentTime: nextSlot.time }))
                }}
              >
                Use this slot <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <p className="muted small-text">No slot available.</p>
          )}
        </article>

        <article className="card policy-card fade-up">
          <div className="section-title">
            <div>
              <h3>Clinic policy</h3>
              <p>Applied to every booking</p>
            </div>
          </div>
          <div className="policy-list">
            <div>
              <span className="policy-icon">
                <Clock3 size={15} />
              </span>
              <p>
                <strong>30-minute slots</strong>
                <span>09:00 to 16:30, last appointment starts at 16:30.</span>
              </p>
            </div>
            <div>
              <span className="policy-icon">
                <CalendarDays size={15} />
              </span>
              <p>
                <strong>Monday – Saturday</strong>
                <span>The clinic is closed every Sunday.</span>
              </p>
            </div>
            <div>
              <span className="policy-icon">
                <CheckCircle2 size={15} />
              </span>
              <p>
                <strong>Duplicate prevention</strong>
                <span>An AVL ceiling search rejects an already-booked date and time.</span>
              </p>
            </div>
          </div>
        </article>

        <article className="card insertion-card fade-up">
          <span className="eyebrow">Behind the booking</span>
          <h3>How the AVL tree handles it</h3>
          <div className="mini-steps">
            {[
              'Generate a unique APT ID',
              'Validate the slot against the tree',
              'Insert the composite key',
              'Rebalance with rotations',
              'Persist the confirmed record',
            ].map((step, index) => (
              <div className="mini-step" key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
          <Link to="/visualizer" className="text-link">
            Watch the tree update <ArrowRight size={14} />
          </Link>
        </article>
      </aside>

      <Modal
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title="Appointment confirmed"
        subtitle="The booking is saved and indexed in the live AVL tree."
        footer={
          <>
            <button
              className="button secondary"
              onClick={() => setConfirmation(null)}
            >
              Book another
            </button>
            <Link to="/manage" className="button primary" onClick={() => setConfirmation(null)}>
              Manage appointments <ArrowRight size={15} />
            </Link>
          </>
        }
      >
        {confirmation && (
          <div className="confirmation-card">
            <div className="confirmation-check">
              <CheckCircle2 size={34} />
            </div>
            <span className="eyebrow">Booking reference</span>
            <h3 className="mono">{confirmation.id}</h3>
            <div className="confirmation-grid">
              <div>
                <span>Patient</span>
                <strong>{confirmation.patientName}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{formatDate(confirmation.appointmentDate)}</strong>
              </div>
              <div>
                <span>Time</span>
                <strong>{confirmation.appointmentTime}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong className="mint-text">Booked</strong>
              </div>
            </div>
            <div className="confirmation-note">
              <GitBranch size={16} />
              <span>
                Inserted as key <code>{confirmation.appointmentDate.replaceAll('-', '')}-{confirmation.appointmentTime.replace(':', '')}-{confirmation.id}</code>
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
