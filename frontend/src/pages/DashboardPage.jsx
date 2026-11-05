import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  Clock3,
  GitBranch,
  RefreshCw,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDay, formatTime, initials } from '../lib/format'
import { useToast } from '../components/ToastProvider'
import StatusBadge from '../components/StatusBadge'

const STAT_META = [
  {
    key: 'totalAppointments',
    label: 'Total appointments',
    hint: 'All records in H2',
    icon: Users,
    tone: 'blue',
  },
  {
    key: 'bookedAppointments',
    label: 'Booked appointments',
    hint: 'Active AVL nodes',
    icon: CalendarCheck2,
    tone: 'mint',
  },
  {
    key: 'availableSlots',
    label: 'Available slots',
    hint: 'Next 7 clinic days',
    icon: CalendarClock,
    tone: 'amber',
  },
  {
    key: 'cancelledAppointments',
    label: 'Cancelled',
    hint: 'Removed from the tree',
    icon: CalendarX2,
    tone: 'rose',
  },
]

function StatCard({ item, value, meta, index }) {
  const Icon = item.icon
  return (
    <article className={`stat-card stat-${item.tone}`} style={{ '--delay': `${index * 70}ms` }}>
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={20} strokeWidth={2} />
        </span>
        <span className="stat-live">
          <span className="live-dot" /> Live
        </span>
      </div>
      <div className="stat-number">{value ?? '—'}</div>
      <div className="stat-label">{item.label}</div>
      <div className="stat-foot">
        <span>{meta}</span>
      </div>
      <span className="stat-orb" />
    </article>
  )
}

function WeeklyChart({ days = [] }) {
  const max = Math.max(1, ...days.map((day) => Math.max(day.booked, day.available)))
  return (
    <div className="weekly-chart">
      <div className="chart-scale">
        {[4, 3, 2, 1, 0].map((tick) => (
          <span key={tick}>{Math.round((max / 4) * tick)}</span>
        ))}
      </div>
      <div className="chart-plot">
        <div className="chart-gridlines">
          {[0, 1, 2, 3, 4].map((line) => (
            <i key={line} />
          ))}
        </div>
        {days.map((day, index) => (
          <div className="chart-day" key={day.date} style={{ '--delay': `${index * 55}ms` }}>
            <div className="bars">
              <div
                className="bar bar-available"
                style={{ height: `${Math.max(4, (day.available / max) * 100)}%` }}
                title={`${day.available} available slots`}
              />
              <div
                className="bar bar-booked"
                style={{ height: `${Math.max(4, (day.booked / max) * 100)}%` }}
                title={`${day.booked} booked appointments`}
              />
            </div>
            <strong>{day.dayLabel}</strong>
            <span>{day.shortDate}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusDonut({ booked, cancelled, total }) {
  const bookedPct = total ? Math.round((booked / total) * 100) : 0
  const cancelledPct = total ? 100 - bookedPct : 0
  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{
          '--booked': `${bookedPct * 3.6}deg`,
          '--cancelled': `${cancelledPct * 3.6}deg`,
        }}
      >
        <div className="donut-center">
          <strong>{bookedPct}%</strong>
          <span>booked</span>
        </div>
      </div>
      <div className="donut-legend">
        <div>
          <span className="legend-dot mint" />
          <p>
            Booked <strong>{booked}</strong>
          </p>
        </div>
        <div>
          <span className="legend-dot rose" />
          <p>
            Cancelled <strong>{cancelled}</strong>
          </p>
        </div>
        <div>
          <span className="legend-dot pale" />
          <p>
            Total <strong>{total}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="page-loading">
      <div className="stats-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="skeleton" style={{ height: 165 }} key={item} />
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="skeleton" style={{ height: 370 }} />
        <div className="skeleton" style={{ height: 370 }} />
      </div>
      <div className="skeleton" style={{ height: 280 }} />
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const toast = useToast()

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      const result = await api.dashboard()
      setData(result)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to load the dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <DashboardSkeleton />

  if (!data) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">
          <Stethoscope size={28} />
        </div>
        <h3>Dashboard unavailable</h3>
        <p>Start the Spring Boot API on port 8080 and refresh this page.</p>
        <button className="button primary" onClick={() => load()} style={{ marginTop: 18 }}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    )
  }

  const total = data.totalAppointments || 0
  const next = data.nextAvailable

  return (
    <div className="dashboard-page">
      <section className="welcome-strip fade-up">
        <div className="welcome-copy">
          <span className="eyebrow-chip">
            <Sparkles size={12} /> AVL-powered scheduling
          </span>
          <h2>Good care starts with a balanced schedule.</h2>
          <p>
            Every appointment is indexed in a self-balancing AVL tree. Book, search and cancel while the
            engine keeps <strong>O(log n)</strong> operations and a live balance factor between −1 and +1.
          </p>
          <div className="welcome-actions">
            <Link to="/book" className="button primary">
              <CalendarPlus size={17} /> New appointment
            </Link>
            <Link to="/visualizer" className="button secondary">
              <GitBranch size={17} /> Open visualizer
            </Link>
          </div>
        </div>
        <div className="welcome-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-node node-root">50</div>
          <div className="floating-node node-left">25</div>
          <div className="floating-node node-right">75</div>
          <div className="floating-node node-leaf">10</div>
          <div className="floating-node node-leaf-right">90</div>
          <span className="balance-chip">BF 0</span>
          <CheckCircle2 className="welcome-check" size={19} />
        </div>
      </section>

      <section className="stats-grid stagger">
        {STAT_META.map((item, index) => (
          <StatCard
            key={item.key}
            item={item}
            value={data[item.key]}
            meta={item.hint}
            index={index}
          />
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card chart-card fade-up">
          <div className="section-title">
            <div>
              <h2>Weekly appointment flow</h2>
              <p>Booked versus available slots · next seven days</p>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-swatch blue" /> Booked
              </span>
              <span>
                <i className="legend-swatch pale" /> Available
              </span>
            </div>
          </div>
          <WeeklyChart days={data.weeklyBookings} />
          <div className="chart-summary">
            <div>
              <span className="summary-icon blue">
                <BarChart3 size={17} />
              </span>
              <p>
                <strong>{data.weeklyBookings.reduce((sum, day) => sum + day.booked, 0)}</strong>
                <span>booked this week</span>
              </p>
            </div>
            <div>
              <span className="summary-icon mint">
                <TrendingUp size={17} />
              </span>
              <p>
                <strong>{data.availableSlots}</strong>
                <span>open clinic slots</span>
              </p>
            </div>
            <div>
              <span className="summary-icon amber">
                <Clock3 size={17} />
              </span>
              <p>
                <strong>{data.treeHeight}</strong>
                <span>current tree height</span>
              </p>
            </div>
          </div>
        </article>

        <article className="next-card fade-up">
          <span className="next-glow" />
          <div className="next-head">
            <span className="next-icon">
              <CalendarClock size={23} />
            </span>
            <span className="next-label">Next available slot</span>
            <button
              className="next-refresh"
              onClick={() => load(true)}
              disabled={refreshing}
              aria-label="Refresh next available slot"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
          {next ? (
            <>
              <div className="next-date">{next.dayLabel}</div>
              <div className="next-time">{formatTime(next.time)}</div>
              <div className="next-meta">
                <span>{formatDate(next.date)}</span>
                <span className="next-meta-dot" />
                <span>Computed by AVL search</span>
              </div>
              <Link to={`/book?date=${next.date}&time=${next.time}`} className="next-cta">
                Reserve this slot <ArrowRight size={17} />
              </Link>
            </>
          ) : (
            <>
              <div className="next-date">Fully booked</div>
              <p className="next-empty">No open clinic slot was found in the next 60 days.</p>
            </>
          )}
          <div className="next-foot">
            <CheckCircle2 size={14} />
            Booked and cancelled slots are checked against the live tree
          </div>
        </article>
      </section>

      <section className="dashboard-lower">
        <article className="card upcoming-card fade-up">
          <div className="section-title">
            <div>
              <h2>Upcoming appointments</h2>
              <p>Ordered by the AVL tree's chronological in-order traversal</p>
            </div>
            <Link to="/manage" className="text-link">
              Manage all <ArrowRight size={14} />
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <div className="empty-state compact">
              <div className="empty-icon">
                <CalendarCheck2 size={25} />
              </div>
              <h3>No upcoming appointments</h3>
              <p>Book the first appointment to insert a root node into the AVL tree.</p>
            </div>
          ) : (
            <div className="upcoming-list">
              {data.upcoming.map((appointment) => (
                <div className="upcoming-row" key={appointment.id}>
                  <span className="avatar">{initials(appointment.patientName)}</span>
                  <div className="upcoming-person">
                    <strong>{appointment.patientName}</strong>
                    <span className="mono">{appointment.id}</span>
                  </div>
                  <div className="upcoming-date">
                    <strong>{formatDay(appointment.date)}</strong>
                    <span>{formatTime(appointment.time)}</span>
                  </div>
                  <span className="status-badge booked">
                    <CalendarCheck2 size={13} /> Booked
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="dashboard-side">
          <article className="card status-card fade-up">
            <div className="section-title">
              <div>
                <h2>Status distribution</h2>
                <p>Persisted appointment records</p>
              </div>
            </div>
            <StatusDonut booked={data.bookedAppointments} cancelled={data.cancelledAppointments} total={total} />
          </article>

          <article className="card avl-health-card fade-up">
            <div className="avl-health-head">
              <div>
                <span className="eyebrow">Live invariant</span>
                <h2>AVL tree health</h2>
              </div>
              <span className={`health-pill ${data.treeBalanced ? 'ok' : 'bad'}`}>
                <span /> {data.treeBalanced ? 'Balanced' : 'Check'}
              </span>
            </div>
            <div className="avl-metrics">
              <div>
                <strong>{data.activeTreeNodeCount}</strong>
                <span>nodes</span>
              </div>
              <div>
                <strong>{data.treeHeight}</strong>
                <span>height</span>
              </div>
              <div>
                <strong>log₂</strong>
                <span>lookup</span>
              </div>
            </div>
            <div className="root-key">
              <span>Root key</span>
              <code>{data.rootKey || 'empty tree'}</code>
            </div>
            <Link to="/visualizer" className="text-link">
              Inspect the tree <ArrowRight size={14} />
            </Link>
          </article>
        </div>
      </section>
    </div>
  )
}
