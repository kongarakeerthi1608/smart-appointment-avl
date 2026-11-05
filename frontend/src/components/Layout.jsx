import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  Binary,
  BookOpenText,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  CircleHelp,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react'
import { api } from '../lib/api'

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    links: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/book', label: 'Book Appointment', icon: CalendarPlus },
      { to: '/manage', label: 'Manage Appointments', icon: CalendarDays },
    ],
  },
  {
    label: 'AVL Laboratory',
    links: [
      { to: '/visualizer', label: 'AVL Tree Visualizer', icon: GitBranch, badge: 'Live' },
      { to: '/analysis', label: 'Algorithm Analysis', icon: Binary },
      { to: '/about', label: 'About Project', icon: BookOpenText },
    ],
  },
]

const PAGE_META = {
  '/': {
    eyebrow: 'Clinic overview',
    title: 'Dashboard',
    subtitle: 'A live view of appointments and the AVL scheduling engine.',
  },
  '/book': {
    eyebrow: 'Reception desk',
    title: 'Book Appointment',
    subtitle: 'Reserve a slot — every confirmed booking enters the AVL tree.',
  },
  '/manage': {
    eyebrow: 'Appointment records',
    title: 'Manage Appointments',
    subtitle: 'Search, inspect and cancel bookings while keeping H2 and AVL in sync.',
  },
  '/visualizer': {
    eyebrow: 'AVL laboratory',
    title: 'AVL Tree Visualizer',
    subtitle: 'The actual balanced tree held by the Spring Boot backend.',
  },
  '/analysis': {
    eyebrow: 'Advanced data structures',
    title: 'Algorithm Analysis',
    subtitle: 'Complexity, balance factors and why rotations matter.',
  },
  '/about': {
    eyebrow: 'Project dossier',
    title: 'About Project',
    subtitle: 'Problem statement, architecture and evaluation notes.',
  },
}

function Brand() {
  return (
    <NavLink to="/" className="brand">
      <span className="brand-mark">
        <HeartPulse size={25} />
      </span>
      <span className="brand-copy">
        <strong>MediSlot</strong>
        <small>AVL scheduling engine</small>
      </span>
    </NavLink>
  )
}

export default function Layout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [connected, setConnected] = useState(null)
  const meta = PAGE_META[location.pathname] || {
    eyebrow: 'MediSlot',
    title: 'Smart Appointments',
    subtitle: '',
  }

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    let active = true
    api
      .health()
      .then(() => active && setConnected(true))
      .catch(() => active && setConnected(false))
    return () => {
      active = false
    }
  }, [location.pathname])

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button ghost mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="nav-section" key={section.label}>
              <span className="nav-label">{section.label}</span>
              {section.links.map(({ to, label, icon: Icon, end, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={19} strokeWidth={1.9} />
                  <span>{label}</span>
                  {badge && <em>{badge}</em>}
                  <ChevronRight size={15} className="nav-chevron" />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="engine-card">
            <span className="engine-orbit">
              <Activity size={20} />
            </span>
            <div>
              <strong>AVL engine</strong>
              <small>
                <span className={`connection-dot ${connected === false ? 'offline' : ''}`} />
                {connected === null ? 'Connecting…' : connected ? 'Spring Boot + H2 online' : 'Backend offline'}
              </small>
            </div>
          </div>
          <div className="sidebar-meta">
            <span>
              <ShieldCheck size={14} /> ADS PBL · 2026
            </span>
            <span>
              <Stethoscope size={14} /> Self-balancing
            </span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
          <div className="page-title">
            <span className="eyebrow">{meta.eyebrow}</span>
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="topbar-actions">
            <span className="topbar-pill">
              <CalendarDays size={15} />
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }).format(new Date())}
            </span>
            <NavLink to="/analysis" className="topbar-help" title="Algorithm analysis">
              <CircleHelp size={19} />
            </NavLink>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Smart Appointment Booking System · AVL Tree PBL</span>
          <span>Built with Java, Spring Boot, React &amp; H2</span>
        </footer>
      </div>
    </div>
  )
}
