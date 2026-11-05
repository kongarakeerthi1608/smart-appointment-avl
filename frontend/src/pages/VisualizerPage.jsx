import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Binary,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  GitBranch,
  Layers3,
  ListOrdered,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { formatDate, formatTime } from '../lib/format'
import { useToast } from '../components/ToastProvider'
import TreeCanvas from '../components/TreeCanvas.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const FRAME_INTERVAL = 1400
const ROTATION_TYPES = new Set(['LL', 'RR', 'LR', 'RL'])
const TRAVERSAL_LABELS = {
  inorder: 'In-order traversal',
  preorder: 'Pre-order traversal',
  postorder: 'Post-order traversal',
}

function operationTone(operation, frame) {
  if (frame?.rotationType && ROTATION_TYPES.has(frame.rotationType)) return 'amber'
  if (operation?.operation === 'DELETE') return 'red'
  if (operation?.operation === 'SEARCH') return 'blue'
  return 'green'
}

function operationLabel(operation) {
  if (!operation) return 'Idle'
  return (
    {
      INSERT: 'Insertion',
      DELETE: 'Deletion',
      SEARCH: 'Search',
      RESET: 'Reset',
    }[operation.operation] || operation.operation
  )
}

export default function VisualizerPage() {
  const toast = useToast()
  const [tree, setTree] = useState(null)
  const [health, setHealth] = useState(null)
  const [traversals, setTraversals] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState('')

  const [operation, setOperation] = useState(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const [searchId, setSearchId] = useState('')
  const [deleteId, setDeleteId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [traversalKind, setTraversalKind] = useState('')
  const [rotationDetail, setRotationDetail] = useState(null)
  const [nodeDetail, setNodeDetail] = useState(null)

  const loadAll = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [treeData, healthData, traversalData, activeAppointments] = await Promise.all([
        api.tree(),
        api.treeHealth(),
        api.traversals(),
        api.appointments('', 'BOOKED'),
      ])
      setTree(treeData)
      setHealth(healthData)
      setTraversals(traversalData)
      setAppointments(activeAppointments)
    } catch (error) {
      setLoadError(true)
      toast.error(error instanceof ApiError ? error.message : 'Unable to reach the AVL engine.')
    } finally {
      setLoading(false)
    }
  }

  const refreshIndexes = async () => {
    const results = await Promise.allSettled([api.treeHealth(), api.traversals(), api.appointments('', 'BOOKED')])
    if (results[0].status === 'fulfilled') setHealth(results[0].value)
    if (results[1].status === 'fulfilled') setTraversals(results[1].value)
    if (results[2].status === 'fulfilled') setAppointments(results[2].value)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setDeleteId((current) => {
      if (current && appointments.some((appointment) => appointment.id === current)) return current
      return appointments[0]?.id || ''
    })
  }, [appointments])

  const frames = operation?.frames || []
  const hasFrames = frames.length > 0
  const activeFrame = hasFrames ? frames[Math.min(frameIndex, frames.length - 1)] : null
  const displayedTree = activeFrame?.tree || operation?.tree || tree

  useEffect(() => {
    if (!playing || !hasFrames) return undefined
    if (frameIndex >= frames.length - 1) {
      setPlaying(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      setFrameIndex((current) => Math.min(current + 1, frames.length - 1))
    }, FRAME_INTERVAL)
    return () => window.clearTimeout(timer)
  }, [playing, frameIndex, hasFrames, frames.length])

  const highlightKeys = useMemo(() => {
    if (!operation) return []
    if (operation.operation === 'SEARCH') return operation.searchPath || []
    return activeFrame?.highlightKeys || []
  }, [operation, activeFrame])

  const rotationType =
    activeFrame?.rotationType && ROTATION_TYPES.has(activeFrame.rotationType)
      ? activeFrame.rotationType
      : undefined
  const tone = operationTone(operation, activeFrame)
  const canReplay = frames.length > 1
  const rotations = operation?.rotations || []
  const activeAppointment = appointments.find((appointment) => appointment.id === deleteId) || null

  const execute = async (kind, action, onSuccess) => {
    setBusy(kind)
    try {
      const result = await action()
      setOperation(result)
      setFrameIndex(0)
      setPlaying((result.frames?.length || 0) > 1)
      setTree(result.tree ?? null)
      if (result.success) {
        toast.success(result.message, `${operationLabel(result)} complete`)
      } else {
        toast.error(result.message, `${operationLabel(result)} result`)
      }
      onSuccess?.()
      await refreshIndexes()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : `${operationLabel({ operation: kind })} failed.`)
    } finally {
      setBusy('')
    }
  }

  const insertSample = () => execute('INSERT', () => api.insertSample())
  const searchAppointment = (rawId = searchId) => {
    const id = rawId.trim().toUpperCase()
    if (!id) {
      toast.info('Enter an appointment ID such as APT-0001.')
      return
    }
    setSearchId(id)
    execute('SEARCH', () => api.avlSearch(id))
  }
  const confirmDelete = () => {
    if (!deleteId) return
    execute('DELETE', () => api.avlDelete(deleteId), () => setDeleteOpen(false))
  }
  const confirmReset = () => execute('RESET', () => api.reset(), () => setResetOpen(false))

  const replayFromStart = () => {
    if (!hasFrames) return
    if (frameIndex >= frames.length - 1) setFrameIndex(0)
    setPlaying(true)
  }

  const openTraversal = async (kind) => {
    setTraversalKind(kind)
    try {
      const result = await api.traversals()
      setTraversals(result)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to load the traversals.')
    }
  }

  if (loading) {
    return (
      <div className="page-loading viz-loading">
        <div className="skeleton" style={{ height: 98 }} />
        <div className="skeleton" style={{ height: 118 }} />
        <div className="viz-grid">
          <div className="skeleton" style={{ height: 560 }} />
          <div className="skeleton" style={{ height: 560 }} />
        </div>
      </div>
    )
  }

  if (loadError && !tree) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">
          <GitBranch size={28} />
        </div>
        <h3>The AVL engine is offline</h3>
        <p>Start the Spring Boot backend on port 8080, then reload this page to inspect the real tree.</p>
        <button className="button primary" onClick={loadAll} style={{ marginTop: 18 }}>
          <RotateCcw size={16} /> Reconnect
        </button>
      </div>
    )
  }

  return (
    <div className="visualizer-page">
      <section className="viz-health card fade-up">
        <div className="viz-health-copy">
          <span className="eyebrow-chip">
            <Activity size={12} /> Live backend index
          </span>
          <h2>One tree. Every operation is real.</h2>
          <p>
            The canvas below renders the exact <code>AvlTree&lt;AppointmentKey, Appointment&gt;</code> held in
            Spring Boot memory. Operations are replayed frame by frame using snapshots returned by the server.
          </p>
        </div>
        <div className="viz-health-metrics">
          <div className="viz-metric">
            <span>Nodes</span>
            <strong>{tree?.size ?? 0}</strong>
            <small>active bookings</small>
          </div>
          <div className="viz-metric">
            <span>Height</span>
            <strong>{tree?.height ?? 0}</strong>
            <small>root to deepest leaf</small>
          </div>
          <div className="viz-metric">
            <span>Invariant</span>
            <strong className={health?.balanced ? 'metric-ok' : 'metric-bad'}>
              {health?.balanced ? 'Balanced' : 'Invalid'}
            </strong>
            <small>{health?.nodesChecked ?? 0} nodes checked</small>
          </div>
          <div className="viz-metric">
            <span>Root</span>
            <strong className="metric-key">{tree?.rootKey || 'null'}</strong>
            <small>composite AVL key</small>
          </div>
        </div>
        <div className={`viz-health-flag ${health?.valid ? 'ok' : 'bad'}`}>
          {health?.valid ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
          {health?.valid ? 'AVL property verified' : 'Tree validation reported errors'}
        </div>
      </section>

      <section className="viz-actions card fade-up">
        <div className="viz-action-block">
          <span className="viz-action-label">Mutate the tree</span>
          <div className="viz-action-row">
            <button className="button primary" onClick={insertSample} disabled={Boolean(busy)}>
              {busy === 'INSERT' ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}
              Insert sample appointment
            </button>
            <button
              className="button secondary"
              onClick={() => setDeleteOpen(true)}
              disabled={Boolean(busy) || appointments.length === 0}
            >
              {busy === 'DELETE' ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}
              Delete appointment
            </button>
            <button
              className="button secondary viz-reset-button"
              onClick={() => setResetOpen(true)}
              disabled={Boolean(busy)}
            >
              {busy === 'RESET' ? <LoaderCircle size={16} className="spin" /> : <RotateCcw size={16} />}
              Reset tree
            </button>
          </div>
        </div>

        <form
          className="viz-action-block viz-search-block"
          onSubmit={(event) => {
            event.preventDefault()
            searchAppointment()
          }}
        >
          <span className="viz-action-label">Search the ID index</span>
          <div className="viz-search-row">
            <div className="search-box viz-search-box">
              <Search size={16} />
              <input
                value={searchId}
                onChange={(event) => setSearchId(event.target.value)}
                placeholder="APT-0001"
                aria-label="Appointment ID to search"
              />
            </div>
            <button className="button primary" type="submit" disabled={Boolean(busy)}>
              {busy === 'SEARCH' ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />}
              Search
            </button>
          </div>
          <span className="viz-action-hint">
            Resolves the ID index, then walks the chronological tree and highlights the comparison path.
          </span>
        </form>

        <div className="viz-action-block">
          <span className="viz-action-label">Read-only traversals</span>
          <div className="viz-action-row">
            <button className="button viz-traversal-button" onClick={() => openTraversal('inorder')}>
              <ListOrdered size={15} /> Inorder
            </button>
            <button className="button viz-traversal-button" onClick={() => openTraversal('preorder')}>
              <GitBranch size={15} /> Preorder
            </button>
            <button className="button viz-traversal-button" onClick={() => openTraversal('postorder')}>
              <Layers3 size={15} /> Postorder
            </button>
          </div>
          <span className="viz-action-hint">O(n) visits in sorted, root-first and leaf-first order.</span>
        </div>
      </section>

      <div className="viz-grid">
        <section className="card viz-canvas-card fade-up">
          <div className="viz-canvas-head">
            <div>
              <span className="eyebrow">Chronological schedule tree</span>
              <h2>
                AVL canvas
                <span className="viz-canvas-size">
                  {displayedTree?.size ?? 0} nodes · height {displayedTree?.height ?? 0}
                </span>
              </h2>
            </div>
            <div className="viz-frame-controls">
              <button
                className="icon-button small"
                onClick={() => {
                  setPlaying(false)
                  setFrameIndex((current) => Math.max(0, current - 1))
                }}
                disabled={!canReplay || frameIndex === 0}
                aria-label="Previous frame"
                title="Previous frame"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="button small viz-play"
                onClick={() => (playing ? setPlaying(false) : replayFromStart())}
                disabled={!canReplay}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                {playing ? 'Pause' : 'Replay'}
              </button>
              <button
                className="icon-button small"
                onClick={() => {
                  setPlaying(false)
                  setFrameIndex((current) => Math.min(frames.length - 1, current + 1))
                }}
                disabled={!canReplay || frameIndex >= frames.length - 1}
                aria-label="Next frame"
                title="Next frame"
              >
                <ChevronRight size={16} />
              </button>
              <span className="viz-frame-count">
                {hasFrames ? `Frame ${frameIndex + 1} / ${frames.length}` : 'No operation'}
              </span>
            </div>
          </div>

          {activeFrame ? (
            <div className={`frame-banner tone-${tone}`}>
              <span className="frame-banner-icon">
                {rotationType ? <RotateCw size={18} /> : operation?.operation === 'DELETE' ? <Trash2 size={18} /> : operation?.operation === 'SEARCH' ? <Search size={18} /> : <Sparkles size={18} />}
              </span>
              <div>
                <strong>{activeFrame.title}</strong>
                <p>{activeFrame.detail}</p>
              </div>
              {rotationType && <span className={`rotation-case case-${rotationType.toLowerCase()}`}>{rotationType}</span>}
            </div>
          ) : (
            <div className="frame-banner tone-neutral">
              <span className="frame-banner-icon">
                <Binary size={18} />
              </span>
              <div>
                <strong>Inspect the live tree</strong>
                <p>Click any node to read its key, height and balance factor. Run an operation to replay its trace.</p>
              </div>
            </div>
          )}

          <TreeCanvas
            tree={displayedTree}
            highlightKeys={highlightKeys}
            tone={tone}
            rotationType={rotationType}
            onNodeClick={setNodeDetail}
          />

          <div className="viz-legend">
            <span>
              <i className="viz-legend-dot new" /> Inserted / current
            </span>
            <span>
              <i className="viz-legend-dot rotation" /> Rotation pivot
            </span>
            <span>
              <i className="viz-legend-dot path" /> Search path
            </span>
            <span>
              <i className="viz-legend-dot deleted" /> Deleted / removed
            </span>
            <span className="viz-legend-note">H = height · BF = balance factor (left − right)</span>
          </div>

          {hasFrames && (
            <div className="frame-timeline" aria-label="Operation frames">
              {frames.map((frame, index) => (
                <button
                  key={`${frame.title}-${index}`}
                  className={`frame-dot ${index === frameIndex ? 'active' : ''} ${
                    frame.rotationType && ROTATION_TYPES.has(frame.rotationType) ? 'has-rotation' : ''
                  }`}
                  onClick={() => {
                    setPlaying(false)
                    setFrameIndex(index)
                  }}
                  title={frame.title}
                >
                  <span>{index + 1}</span>
                  <em>{frame.title}</em>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="card viz-panel fade-up">
          <div className="viz-panel-head">
            <div>
              <span className="eyebrow">Operation trace</span>
              <h2>{operation ? `${operationLabel(operation)} detail` : 'Waiting for an operation'}</h2>
            </div>
            {operation && (
              <span className={`viz-result ${operation.success ? 'ok' : 'bad'}`}>
                {operation.success ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                {operation.success ? 'Success' : 'Not found'}
              </span>
            )}
          </div>

          {!operation ? (
            <div className="viz-panel-empty">
              <div className="viz-empty-orbit">
                <GitBranch size={28} />
              </div>
              <h3>Every rotation tells a story</h3>
              <p>
                Insert a sample booking to watch the tree rebalance, search an ID to see the comparison path, or
                delete a node to observe the successor replacement and post-deletion rotations.
              </p>
              <div className="viz-empty-hints">
                <span>
                  <Plus size={13} /> Insert sample
                </span>
                <span>
                  <Search size={13} /> Search APT-ID
                </span>
                <span>
                  <Trash2 size={13} /> Delete node
                </span>
              </div>
            </div>
          ) : (
            <div className="viz-panel-body">
              <p className={`viz-message ${operation.success ? '' : 'bad'}`}>{operation.message}</p>

              {operation.appointment && (
                <div className="viz-appointment-card">
                  <span className="avatar small">
                    {operation.appointment.patientName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')}
                  </span>
                  <div>
                    <strong>{operation.appointment.patientName}</strong>
                    <span className="mono">{operation.appointment.id}</span>
                  </div>
                  <div className="viz-appointment-date">
                    <strong>{formatDate(operation.appointment.appointmentDate)}</strong>
                    <span>{formatTime(operation.appointment.appointmentTime)}</span>
                  </div>
                </div>
              )}

              {operation.operation === 'SEARCH' && operation.searchPath?.length > 0 && (
                <div className="viz-path">
                  <span className="viz-subhead">
                    <Search size={13} /> Comparison path
                  </span>
                  <div className="viz-path-keys">
                    {operation.searchPath.map((key, index) => (
                      <span key={key}>
                        <code>{key}</code>
                        {index < operation.searchPath.length - 1 && <ArrowRight size={11} />}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="viz-steps">
                <span className="viz-subhead">
                  <ListOrdered size={13} /> Algorithm steps
                </span>
                {operation.steps.map((step) => (
                  <div className={`viz-step type-${step.type.toLowerCase()}`} key={step.number}>
                    <span className="viz-step-index">{step.number}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                    <em>{step.type}</em>
                  </div>
                ))}
              </div>

              {rotations.length > 0 && (
                <div className="viz-rotations">
                  <span className="viz-subhead">
                    <RotateCw size={13} /> Rotations applied ({rotations.length})
                  </span>
                  {rotations.map((rotation, index) => (
                    <button
                      className="viz-rotation-card"
                      key={`${rotation.caseType}-${index}`}
                      onClick={() => setRotationDetail(rotation)}
                    >
                      <span className={`rotation-case case-${rotation.caseType.toLowerCase()}`}>
                        {rotation.caseType}
                      </span>
                      <div>
                        <strong>{rotation.action}</strong>
                        <p>{rotation.explanation}</p>
                        <code>
                          pivot {rotation.pivotKey} → child {rotation.childKey}
                        </code>
                      </div>
                      <Eye size={15} />
                    </button>
                  ))}
                </div>
              )}

              <div className="viz-compare-hint">
                <RotateCw size={15} />
                <p>
                  Use <strong>Replay</strong> or the frame timeline above to step through the exact before / after
                  snapshots captured by the backend.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
        title="Reset the entire schedule tree?"
        message="This permanently deletes every persisted H2 appointment and clears both AVL indexes. The next booking will start again at APT-0001. This action cannot be undone."
        confirmLabel="Reset everything"
        loading={busy === 'RESET'}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete an appointment node"
        subtitle="Cancels the booking in H2 and removes its composite key from both AVL indexes."
        size="md"
        footer={
          <>
            <button className="button secondary" onClick={() => setDeleteOpen(false)} disabled={busy === 'DELETE'}>
              Keep appointment
            </button>
            <button
              className="button danger"
              onClick={confirmDelete}
              disabled={!deleteId || busy === 'DELETE'}
            >
              {busy === 'DELETE' ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}
              Delete node
            </button>
          </>
        }
      >
        {appointments.length === 0 ? (
          <div className="empty-state compact viz-delete-empty">
            <div className="empty-icon">
              <Trash2 size={24} />
            </div>
            <h3>No active nodes to delete</h3>
            <p>The schedule tree is empty. Insert a sample appointment or create a booking first.</p>
          </div>
        ) : (
          <div className="delete-form">
            <div className="field">
              <label htmlFor="delete-appointment">Active appointment</label>
              <select
                id="delete-appointment"
                value={deleteId}
                onChange={(event) => setDeleteId(event.target.value)}
              >
                {appointments.map((appointment) => (
                  <option value={appointment.id} key={appointment.id}>
                    {appointment.id} · {appointment.patientName} · {appointment.appointmentDate}{' '}
                    {appointment.appointmentTime}
                  </option>
                ))}
              </select>
              <span className="hint">Only BOOKED records are present in the active AVL tree.</span>
            </div>

            {activeAppointment && (
              <div className="viz-delete-preview">
                <div>
                  <span className="detail-label">Patient</span>
                  <strong>{activeAppointment.patientName}</strong>
                </div>
                <div>
                  <span className="detail-label">Slot</span>
                  <strong>
                    {formatDate(activeAppointment.appointmentDate)} · {formatTime(activeAppointment.appointmentTime)}
                  </strong>
                </div>
                <div>
                  <span className="detail-label">Composite key</span>
                  <code className="mono">
                    {activeAppointment.appointmentDate.replaceAll('-', '')}-
                    {activeAppointment.appointmentTime.replace(':', '')}-{activeAppointment.id}
                  </code>
                </div>
              </div>
            )}

            <div className="viz-warning">
              <AlertTriangle size={16} />
              <p>
                Deletion follows the BST rule: a node with two children is replaced by its in-order successor.
                The visualizer will replay every resulting LL / RR / LR / RL rotation.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(traversalKind)}
        onClose={() => setTraversalKind('')}
        title={TRAVERSAL_LABELS[traversalKind] || 'Traversal'}
        subtitle="Read directly from the live scheduling AVL tree — no database sorting involved."
        size="lg"
      >
        <div className="traversal-tabs">
          {Object.entries(TRAVERSAL_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`traversal-tab ${traversalKind === key ? 'active' : ''}`}
              onClick={() => setTraversalKind(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {traversals?.[traversalKind]?.length ? (
          <div className="traversal-list">
            {traversals[traversalKind].map((item, index) => (
              <div className="traversal-item" key={`${item.key}-${index}`}>
                <span className="traversal-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <code>{item.key}</code>
                  <span>
                    {item.id} · {item.patientName}
                  </span>
                </div>
                <span className="traversal-date">
                  {formatDate(item.date)} · {formatTime(item.time)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <div className="empty-icon">
              <ListOrdered size={24} />
            </div>
            <h3>The traversal is empty</h3>
            <p>Insert an appointment to populate the tree.</p>
          </div>
        )}

        <div className="traversal-note">
          <Binary size={15} />
          <span>
            {traversalKind === 'inorder' && 'In-order visits left → node → right, producing chronological keys.'}
            {traversalKind === 'preorder' && 'Pre-order visits node → left → right and mirrors the insertion root path.'}
            {traversalKind === 'postorder' && 'Post-order visits left → right → node and is used when freeing nodes.'}
          </span>
        </div>
      </Modal>

      <Modal
        open={Boolean(rotationDetail)}
        onClose={() => setRotationDetail(null)}
        title={rotationDetail ? `${rotationDetail.caseType} rotation` : 'Rotation'}
        subtitle={rotationDetail ? `${rotationDetail.pivotKey} → ${rotationDetail.childKey}` : ''}
        size="xl"
      >
        {rotationDetail && (
          <div className="rotation-modal">
            <div className={`rotation-modal-banner case-${rotationDetail.caseType.toLowerCase()}`}>
              <RotateCw size={20} />
              <div>
                <strong>{rotationDetail.action}</strong>
                <p>{rotationDetail.explanation}</p>
              </div>
              <span className="rotation-case">{rotationDetail.caseType}</span>
            </div>
            <div className="rotation-compare">
              <div className="rotation-side">
                <div className="rotation-side-head">
                  <span>Before rotation</span>
                  <small>
                    {rotationDetail.before?.size ?? 0} nodes · h {rotationDetail.before?.height ?? 0}
                  </small>
                </div>
                <TreeCanvas tree={rotationDetail.before} tone="amber" />
              </div>
              <div className="rotation-side">
                <div className="rotation-side-head">
                  <span>After rotation</span>
                  <small>
                    {rotationDetail.after?.size ?? 0} nodes · h {rotationDetail.after?.height ?? 0}
                  </small>
                </div>
                <TreeCanvas tree={rotationDetail.after} tone="green" />
              </div>
            </div>
            <div className="viz-compare-hint">
              <ShieldCheck size={15} />
              <p>
                Heights and balance factors were recomputed during the unwind. The root of this subtree is now{' '}
                <code>{rotationDetail.childKey}</code>.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(nodeDetail)}
        onClose={() => setNodeDetail(null)}
        title="AVL node detail"
        subtitle={nodeDetail ? `${nodeDetail.appointmentId} · ${nodeDetail.patientName}` : ''}
        size="md"
        footer={
          nodeDetail && (
            <>
              <button
                className="button secondary"
                onClick={() => {
                  setDeleteId(nodeDetail.appointmentId)
                  setNodeDetail(null)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 size={16} /> Delete this node
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setNodeDetail(null)
                  searchAppointment(nodeDetail.appointmentId)
                }}
              >
                <Search size={16} /> Trace search
              </button>
            </>
          )
        }
      >
        {nodeDetail && (
          <div className="node-detail">
            <div className="node-detail-key">
              <span className="detail-label">Composite AVL key</span>
              <code>{nodeDetail.key}</code>
            </div>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Appointment</span>
                <strong className="mono">{nodeDetail.appointmentId}</strong>
              </div>
              <div>
                <span className="detail-label">Status</span>
                <strong>{nodeDetail.status}</strong>
              </div>
              <div>
                <span className="detail-label">Date &amp; time</span>
                <strong>
                  {formatDate(nodeDetail.date)} · {formatTime(nodeDetail.time)}
                </strong>
              </div>
              <div>
                <span className="detail-label">Patient</span>
                <strong>{nodeDetail.patientName}</strong>
              </div>
            </div>
            <div className="node-detail-metrics">
              <div>
                <span>Height</span>
                <strong>{nodeDetail.height}</strong>
              </div>
              <div>
                <span>Balance factor</span>
                <strong className={Math.abs(nodeDetail.balanceFactor) > 1 ? 'metric-bad' : 'metric-ok'}>
                  {nodeDetail.balanceFactor > 0 ? `+${nodeDetail.balanceFactor}` : nodeDetail.balanceFactor}
                </strong>
              </div>
              <div>
                <span>Left child</span>
                <code>{nodeDetail.left?.key || 'null'}</code>
              </div>
              <div>
                <span>Right child</span>
                <code>{nodeDetail.right?.key || 'null'}</code>
              </div>
            </div>
            <div className="viz-compare-hint">
              <GitBranch size={15} />
              <p>
                Balance factor = height(left subtree) − height(right subtree). A legal AVL node stays within
                −1, 0 or +1; otherwise a rotation is applied during the unwind.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
