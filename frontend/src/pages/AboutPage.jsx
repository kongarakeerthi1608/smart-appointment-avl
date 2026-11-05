import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Binary,
  BookOpenText,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Code2,
  Database,
  FolderTree,
  GitBranch,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  ListChecks,
  PlugZap,
  Server,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Workflow,
} from 'lucide-react'

const TECH = [
  { label: 'Java 17', detail: 'Manual AVL implementation', icon: Binary, tone: 'amber' },
  { label: 'Spring Boot 3', detail: 'REST API + dependency injection', icon: Server, tone: 'mint' },
  { label: 'React 18', detail: 'Dashboard, forms & visualizer', icon: Code2, tone: 'blue' },
  { label: 'H2 database', detail: 'File persistence, zero setup', icon: Database, tone: 'violet' },
  { label: 'Vite 6', detail: 'Fast dev server + production build', icon: PlugZap, tone: 'cyan' },
  { label: 'JUnit + MockMvc', detail: '14 automated tests', icon: TestTube2, tone: 'rose' },
]

const ENDPOINTS = [
  { method: 'GET', path: '/api/dashboard', purpose: 'Counts, weekly flow, next slot and tree health' },
  { method: 'GET', path: '/api/appointments', purpose: 'List persisted records with search and status filter' },
  { method: 'POST', path: '/api/appointments', purpose: 'Validate and insert a booking into the AVL tree' },
  { method: 'POST', path: '/api/appointments/{id}/cancel', purpose: 'Cancel in H2 and delete both AVL indexes' },
  { method: 'GET', path: '/api/appointments/availability', purpose: 'Slot-by-slot availability for a chosen date' },
  { method: 'GET', path: '/api/appointments/next-available', purpose: 'First genuinely open future clinic slot' },
  { method: 'GET', path: '/api/avl/tree', purpose: 'Full tree snapshot with heights and balance factors' },
  { method: 'GET', path: '/api/avl/health', purpose: 'Validate ordering, heights, BF and structure' },
  { method: 'GET', path: '/api/avl/traversals', purpose: 'Inorder, preorder and postorder node lists' },
  { method: 'POST', path: '/api/avl/search', purpose: 'ID-index lookup + primary-tree comparison path' },
  { method: 'POST', path: '/api/avl/sample', purpose: 'Insert a real sample booking and return its trace' },
  { method: 'DELETE', path: '/api/avl/appointments/{id}', purpose: 'Delete one node with full rotation frames' },
  { method: 'POST', path: '/api/avl/reset', purpose: 'Clear H2 and both AVL trees, then reset the sequence' },
]

const OBJECTIVES = [
  'Implement a generic AVL tree from scratch without TreeMap, PriorityQueue or any library-balanced structure.',
  'Combine date, time and appointment ID into one chronological composite key that supports duplicate checks and range queries.',
  'Synchronise an H2 record set with two in-memory AVL indexes: the schedule tree and the appointment-ID tree.',
  'Expose every operation through a REST API and replay the real server snapshots in a live visualizer.',
  'Prove the O(log n) guarantee with automated rotation, deletion, invariant and integration tests.',
]

const SCENARIOS = [
  'Insert keys that force LL, RR, LR and RL rotations.',
  'Insert duplicate composite keys and reject them.',
  'Delete a leaf, a one-child node and a two-child node.',
  'Verify the in-order successor replacement during deletion.',
  'Check height and balance factor values after every mutation.',
  'Validate parent pointers, BST ordering and absence of cycles.',
  'Search by appointment ID through the auxiliary index.',
  'Book through REST, then read the updated tree from /api/avl/tree.',
  'Reject Sunday, past, invalid-slot and out-of-horizon bookings.',
  'Cancel a REST appointment and confirm it disappears from both AVL indexes.',
]

const MODULES = [
  {
    icon: LayoutDashboard,
    title: 'Operations dashboard',
    copy: 'Live totals, available slots, cancellation count, weekly flow, upcoming visits and a balance-health card.',
  },
  {
    icon: CalendarClock,
    title: 'Booking workspace',
    copy: 'Patient details, date picker, real availability grid, duplicate guard and a confirmation receipt.',
  },
  {
    icon: Layers3,
    title: 'Record management',
    copy: 'Searchable appointment registry with status filters, details, CSV export and safe cancellation.',
  },
  {
    icon: GitBranch,
    title: 'AVL visualizer',
    copy: 'Real backend tree, operation replay, rotation before/after views, search paths and traversals.',
  },
  {
    icon: BookOpenText,
    title: 'Algorithm analysis',
    copy: 'Complexity table, height proof, balance factor explanation, rotation diagrams and BST comparison.',
  },
]

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero fade-up">
        <div className="about-hero-copy">
          <span className="eyebrow-chip">
            <GraduationCap size={12} /> Advanced Data Structures · PBL 2026
          </span>
          <h2>Smart Appointment Booking System Using AVL Tree</h2>
          <p>
            A full-stack clinic scheduling project that treats a self-balancing tree as the production index — not
            as a toy demo. Every booking, cancellation, search and visualizer frame is backed by a manually
            implemented Java AVL tree and a persistent H2 record.
          </p>
          <div className="about-hero-actions">
            <Link to="/visualizer" className="button primary">
              <GitBranch size={17} /> Inspect the live tree
            </Link>
            <Link to="/analysis" className="button secondary">
              <Binary size={17} /> Read the analysis
            </Link>
          </div>
          <div className="about-badges">
            <span>
              <CheckCircle2 size={13} /> No TreeMap
            </span>
            <span>
              <CheckCircle2 size={13} /> No PriorityQueue
            </span>
            <span>
              <CheckCircle2 size={13} /> 14 tests passing
            </span>
            <span>
              <CheckCircle2 size={13} /> Real DB-to-tree sync
            </span>
          </div>
        </div>
        <div className="about-hero-card">
          <span className="about-hero-card-label">Composite key example</span>
          <code className="about-key">20261105-0930-APT-0001</code>
          <div className="about-key-parts">
            <div>
              <span>Date</span>
              <strong>2026-11-05</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>09:30</strong>
            </div>
            <div>
              <span>Unique ID</span>
              <strong>APT-0001</strong>
            </div>
          </div>
          <p>
            Chronological ordering means an in-order traversal is already a sorted appointment schedule. The ID
            suffix breaks ties without ever violating uniqueness.
          </p>
          <div className="about-hero-tree" aria-hidden="true">
            <span className="mini-node root">0930</span>
            <span className="mini-node left">0900</span>
            <span className="mini-node right">1000</span>
            <span className="mini-node leaf-left">0830</span>
            <span className="mini-node leaf-right">1030</span>
          </div>
        </div>
      </section>

      <section className="about-tech-grid">
        {TECH.map((item) => {
          const Icon = item.icon
          return (
            <article className={`about-tech tone-${item.tone}`} key={item.label}>
              <span>
                <Icon size={18} />
              </span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </article>
          )
        })}
      </section>

      <section className="about-split">
        <article className="card about-card fade-up">
          <div className="section-title">
            <div>
              <h2>Problem statement</h2>
              <p>Why a plain list or an unbalanced BST is not enough</p>
            </div>
            <span className="analysis-pill blue">context</span>
          </div>
          <p className="about-copy">
            A clinic reception system must detect duplicate date/time bookings instantly, find the next free slot,
            display a chronological schedule, and keep working when appointments are inserted in sorted order or
            deleted from the middle. A linked list degrades to O(n) lookups. A naive BST becomes a chain when keys
            arrive in order.
          </p>
          <p className="about-copy">
            The project solves this by maintaining two AVL trees in memory while H2 remains the durable source of
            truth. On startup the backend deletes nothing; it rebuilds both indexes from every active BOOKED row.
            During runtime, each mutation updates the database and the trees in the same service method, so the
            dashboard, registry and visualizer can never drift apart.
          </p>
          <div className="about-objectives">
            {OBJECTIVES.map((objective) => (
              <div key={objective}>
                <span>
                  <CheckCircle2 size={15} />
                </span>
                <p>{objective}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card about-card fade-up">
          <div className="section-title">
            <div>
              <h2>System architecture</h2>
              <p>One request path from React to the AVL nodes</p>
            </div>
            <span className="analysis-pill mint">layers</span>
          </div>
          <div className="arch-flow">
            <div className="arch-node blue">
              <Code2 size={18} />
              <div>
                <strong>React UI</strong>
                <span>Dashboard · forms · visualizer</span>
              </div>
            </div>
            <span className="arch-arrow">
              <ArrowRight size={16} /> fetch /api
            </span>
            <div className="arch-node mint">
              <PlugZap size={18} />
              <div>
                <strong>REST controllers</strong>
                <span>Validation + JSON views</span>
              </div>
            </div>
            <span className="arch-arrow">
              <ArrowRight size={16} /> service calls
            </span>
            <div className="arch-node amber">
              <Workflow size={18} />
              <div>
                <strong>AppointmentService</strong>
                <span>Booking · cancel · next slot</span>
              </div>
            </div>
            <div className="arch-branches">
              <div className="arch-node violet">
                <GitBranch size={18} />
                <div>
                  <strong>Schedule AVL</strong>
                  <span>AppointmentKey → Appointment</span>
                </div>
              </div>
              <div className="arch-node cyan">
                <Binary size={18} />
                <div>
                  <strong>ID-index AVL</strong>
                  <span>String ID → Appointment</span>
                </div>
              </div>
              <div className="arch-node rose">
                <Database size={18} />
                <div>
                  <strong>H2 file database</strong>
                  <span>Durable BOOKED / CANCELLED rows</span>
                </div>
              </div>
            </div>
          </div>
          <div className="about-callout">
            <ShieldCheck size={16} />
            <p>
              Startup rebuild: active rows are inserted into both trees, then the ID sequence continues from the
              highest persisted APT number. No duplicate or orphan node can survive a restart.
            </p>
          </div>
        </article>
      </section>

      <section className="card about-card fade-up">
        <div className="section-title">
          <div>
            <h2>Application modules</h2>
            <p>Six screens, each tied to a real backend capability</p>
          </div>
          <span className="analysis-pill amber">
            <Boxes size={12} /> six modules
          </span>
        </div>
        <div className="module-grid">
          {MODULES.map((module) => {
            const Icon = module.icon
            return (
              <article className="module-card" key={module.title}>
                <span className="module-icon">
                  <Icon size={18} />
                </span>
                <h3>{module.title}</h3>
                <p>{module.copy}</p>
              </article>
            )
          })}
          <article className="module-card is-academic">
            <span className="module-icon">
              <GraduationCap size={18} />
            </span>
            <h3>Project dossier</h3>
            <p>Problem statement, architecture, endpoint map, test scenarios and evaluation notes.</p>
          </article>
        </div>
      </section>

      <section className="about-split about-lower">
        <article className="card about-card fade-up">
          <div className="section-title">
            <div>
              <h2>REST API map</h2>
              <p>Every screen reads and mutates through these endpoints</p>
            </div>
            <span className="analysis-pill blue">
              <Server size={12} /> 13 routes
            </span>
          </div>
          <div className="endpoint-table-wrap">
            <table className="endpoint-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((endpoint) => (
                  <tr key={`${endpoint.method}-${endpoint.path}`}>
                    <td>
                      <span className={`method-badge method-${endpoint.method.toLowerCase()}`}>
                        {endpoint.method}
                      </span>
                    </td>
                    <td>
                      <code>{endpoint.path}</code>
                    </td>
                    <td>{endpoint.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card about-card fade-up">
          <div className="section-title">
            <div>
              <h2>Test coverage</h2>
              <p>Ten required scenarios, executed as fourteen automated tests</p>
            </div>
            <span className="analysis-pill mint">
              <TestTube2 size={12} /> passing
            </span>
          </div>
          <div className="scenario-list">
            {SCENARIOS.map((scenario, index) => (
              <div key={scenario}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{scenario}</p>
                <CheckCircle2 size={14} />
              </div>
            ))}
          </div>
          <div className="test-split">
            <div>
              <strong>9</strong>
              <span>AVL unit tests</span>
            </div>
            <div>
              <strong>5</strong>
              <span>API integration tests</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>rotation cases</span>
            </div>
          </div>
        </article>
      </section>

      <section className="card about-card structure-card fade-up">
        <div className="section-title">
          <div>
            <h2>Project structure</h2>
            <p>Backend, tests and frontend in one repository</p>
          </div>
          <span className="analysis-pill violet">
            <FolderTree size={12} /> layout
          </span>
        </div>
        <div className="structure-grid">
          <pre className="structure-tree">
            <code>{`ads_pbl/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/smartclinic/appointments/
│       │   ├── avl/          AvlTree, AppointmentKey
│       │   ├── controller/   REST endpoints
│       │   ├── dto/          JSON records
│       │   ├── model/        Appointment, status
│       │   ├── repository/   Spring Data JPA
│       │   └── service/      booking, policy, demo data
│       ├── main/resources/   application.properties
│       └── test/java/        AVL + API tests
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── components/       layout, tree canvas, dialogs
        ├── lib/              API client, formatters
        ├── pages/            six application screens
        └── styles/           global design system`}</code>
          </pre>
          <div className="structure-notes">
            <div>
              <span className="structure-icon blue">
                <GitBranch size={16} />
              </span>
              <div>
                <strong>The heart of the project</strong>
                <p>
                  <code>AvlTree.java</code> owns insertion, deletion, search, rotations, snapshots, range queries
                  and validation. It is generic and fully hand-written.
                </p>
              </div>
            </div>
            <div>
              <span className="structure-icon mint">
                <Workflow size={16} />
              </span>
              <div>
                <strong>Operation tracing</strong>
                <p>
                  <code>AppointmentService</code> captures a snapshot before each mutation and turns the AVL
                  result into frames, steps and rotation views for the UI.
                </p>
              </div>
            </div>
            <div>
              <span className="structure-icon amber">
                <Database size={16} />
              </span>
              <div>
                <strong>Persistence boundary</strong>
                <p>
                  H2 stores appointments and statuses. The tree never replaces the database; it is rebuilt from
                  it and kept synchronised on every write.
                </p>
              </div>
            </div>
            <div>
              <span className="structure-icon rose">
                <ListChecks size={16} />
              </span>
              <div>
                <strong>Evaluation evidence</strong>
                <p>
                  Run <code>mvn test</code> for the AVL and API suite, then open the visualizer to see the same
                  invariants on live data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-footer-card fade-up">
        <span className="about-footer-icon">
          <Sparkles size={21} />
        </span>
        <div>
          <h2>Academic project · Advanced Data Structures</h2>
          <p>
            Smart Appointment Booking System Using AVL Tree. Built with Java, Spring Boot, REST, React and H2.
            The AVL implementation, rotations, visualizer frames and complexity analysis are the core deliverable.
          </p>
        </div>
        <Link to="/" className="button primary">
          Back to dashboard <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  )
}
