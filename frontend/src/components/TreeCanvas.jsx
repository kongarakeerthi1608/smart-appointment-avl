import { useEffect, useMemo, useRef, useState } from 'react'
import { Focus, GitBranch, Minus, Plus } from 'lucide-react'

const NODE_W = 108
const NODE_H = 80
const STEP_X = 132
const STEP_Y = 108
const PAD_X = 72
const PAD_Y = 64

function shortDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date)
}

function buildLayout(root) {
  const nodes = []
  const edges = []
  let inorderIndex = 0
  let maxDepth = 0

  const walk = (node, depth, parent) => {
    if (!node) return
    if (node.left) walk(node.left, depth + 1, node)
    const x = PAD_X + inorderIndex * STEP_X
    const y = PAD_Y + depth * STEP_Y
    const laidOut = { ...node, x, y, depth }
    nodes.push(laidOut)
    if (parent) {
      edges.push({ id: `${parent.key}->${node.key}`, parentKey: parent.key, childKey: node.key })
    }
    inorderIndex += 1
    maxDepth = Math.max(maxDepth, depth)
    if (node.right) walk(node.right, depth + 1, node)
  }

  walk(root, 0, null)

  const byKey = new Map(nodes.map((node) => [node.key, node]))
  const positionedEdges = edges
    .map((edge) => ({ ...edge, parent: byKey.get(edge.parentKey), child: byKey.get(edge.childKey) }))
    .filter((edge) => edge.parent && edge.child)

  return {
    nodes,
    edges: positionedEdges,
    width: Math.max(320, PAD_X * 2 + Math.max(0, inorderIndex - 1) * STEP_X),
    height: Math.max(220, PAD_Y * 2 + maxDepth * STEP_Y),
  }
}

function edgePath(parent, child) {
  const x1 = parent.x
  const y1 = parent.y + NODE_H / 2
  const x2 = child.x
  const y2 = child.y - NODE_H / 2
  const midpoint = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midpoint}, ${x2} ${midpoint}, ${x2} ${y2}`
}

export default function TreeCanvas({
  tree,
  highlightKeys = [],
  tone = 'green',
  rotationType,
  onNodeClick,
}) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(900)
  const [autoFit, setAutoFit] = useState(true)
  const [manualZoom, setManualZoom] = useState(1)
  const layout = useMemo(() => buildLayout(tree?.root || null), [tree])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect?.width || 900)
    })
    observer.observe(element)
    setContainerWidth(element.clientWidth || 900)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setAutoFit(true)
  }, [tree?.root?.key, tree?.size])

  const fitZoom = Math.max(
    0.38,
    Math.min(1.06, (containerWidth - 38) / layout.width, 610 / layout.height),
  )
  const zoom = autoFit ? fitZoom : manualZoom
  const highlighted = useMemo(() => new Set(highlightKeys), [highlightKeys])
  const highlightedEdges = useMemo(() => {
    if (!highlighted.size) return new Set()
    return new Set(
      layout.edges
        .filter((edge) => highlighted.has(edge.parentKey) && highlighted.has(edge.childKey))
        .map((edge) => edge.id),
    )
  }, [highlighted, layout.edges])

  const toneClass =
    tone === 'amber' ? 'is-rotation' : tone === 'red' ? 'is-deleted' : tone === 'blue' ? 'is-path' : 'is-new'

  const adjustZoom = (amount) => {
    setAutoFit(false)
    setManualZoom((current) => Math.max(0.35, Math.min(1.4, (autoFit ? fitZoom : current) + amount)))
  }

  if (!tree?.root) {
    return (
      <div className="tree-canvas-wrap empty" ref={containerRef}>
        <div className="tree-empty">
          <div className="tree-empty-orbit">
            <GitBranch size={30} />
          </div>
          <h3>The backend tree is empty</h3>
          <p>Book an appointment or use “Insert sample” to create the root node.</p>
          <div className="tree-empty-code">
            <code>root = null</code>
            <span>height = 0 · size = 0 · balanced = true</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tree-canvas-wrap" ref={containerRef}>
      <div className="tree-scroll">
        <svg
          className="tree-svg"
          width={layout.width * zoom}
          height={layout.height * zoom}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label={`AVL tree with ${tree.size} nodes and height ${tree.height}`}
        >
          <defs>
            <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="180%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#1c4d86" floodOpacity="0.1" />
            </filter>
            <linearGradient id="nodeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fcff" />
            </linearGradient>
            <linearGradient id="nodeNewGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#effffb" />
              <stop offset="100%" stopColor="#d9fbf4" />
            </linearGradient>
            <linearGradient id="nodeRotationGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#fff0ce" />
            </linearGradient>
            <linearGradient id="nodeDeletedGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff7f9" />
              <stop offset="100%" stopColor="#ffe5ea" />
            </linearGradient>
          </defs>

          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              className={`tree-edge ${highlightedEdges.has(edge.id) ? 'highlighted' : ''}`}
              d={edgePath(edge.parent, edge.child)}
            />
          ))}

          {layout.nodes.map((node) => {
            const isHighlighted = highlighted.has(node.key)
            const isRoot = node.key === tree.rootKey
            return (
              <g
                key={node.key}
                className={`tree-node ${isHighlighted ? `highlighted ${toneClass}` : ''}`}
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                onClick={() => onNodeClick?.(node)}
                role={onNodeClick ? 'button' : undefined}
                tabIndex={onNodeClick ? 0 : undefined}
                onKeyDown={(event) => {
                  if (onNodeClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onNodeClick(node)
                  }
                }}
              >
                <foreignObject x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H}>
                  <div
                    className={`tree-node-card ${isHighlighted ? 'highlighted' : ''} ${
                      isRoot ? 'root-node' : ''
                    }`}
                  >
                    {isRoot && <span className="root-flag">ROOT</span>}
                    <div className="tree-node-id">{node.appointmentId}</div>
                    <div className="tree-node-date">
                      {shortDate(node.date)} <span>·</span> {node.time}
                    </div>
                    <div className="tree-node-name">{node.patientName?.split(' ')[0]}</div>
                    <div className="tree-node-metrics">
                      <span>
                        H<strong>{node.height}</strong>
                      </span>
                      <span className={Math.abs(node.balanceFactor) > 1 ? 'bad' : ''}>
                        BF<strong>{node.balanceFactor > 0 ? `+${node.balanceFactor}` : node.balanceFactor}</strong>
                      </span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="tree-zoom">
        <button onClick={() => adjustZoom(-0.1)} aria-label="Zoom out">
          <Minus size={14} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => adjustZoom(0.1)} aria-label="Zoom in">
          <Plus size={14} />
        </button>
        <button
          onClick={() => setAutoFit(true)}
          className={autoFit ? 'active' : ''}
          aria-label="Fit tree"
          title="Fit tree"
        >
          <Focus size={14} />
        </button>
      </div>

      {rotationType && (
        <span className={`rotation-flash rotation-${rotationType.toLowerCase()}`}>
          {rotationType} rotation
        </span>
      )}
    </div>
  )
}
