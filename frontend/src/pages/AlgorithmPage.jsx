import {
  ArrowDownUp,
  ArrowRight,
  Binary,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  Gauge,
  GitBranch,
  Layers3,
  ListOrdered,
  Repeat2,
  RotateCcw,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  Workflow,
} from 'lucide-react'

const COMPLEXITY = [
  {
    operation: 'Insert appointment',
    structure: 'Composite-key AVL',
    best: 'O(log n)',
    worst: 'O(log n)',
    icon: ArrowDownUp,
    tone: 'blue',
    note: 'BST descent + height updates + at most one rebalance chain',
  },
  {
    operation: 'Search by appointment ID',
    structure: 'ID-index AVL',
    best: 'O(log n)',
    worst: 'O(log n)',
    icon: Search,
    tone: 'mint',
    note: 'Then one more O(log n) descent in the chronological tree',
  },
  {
    operation: 'Delete / cancel',
    structure: 'Both AVL indexes',
    best: 'O(log n)',
    worst: 'O(log n)',
    icon: Trash2,
    tone: 'rose',
    note: 'In-order successor replacement + rotations while unwinding',
  },
  {
    operation: 'Duplicate slot check',
    structure: 'ceilingKey(date,time)',
    best: 'O(log n)',
    worst: 'O(log n)',
    icon: ShieldCheck,
    tone: 'amber',
    note: 'First key ≥ requested slot; same date and time means occupied',
  },
  {
    operation: 'Inorder traversal',
    structure: 'Schedule AVL',
    best: 'O(n)',
    worst: 'O(n)',
    icon: ListOrdered,
    tone: 'violet',
    note: 'Every node visited once, output already chronological',
  },
  {
    operation: 'Next available slot',
    structure: 'AVL range lookups',
    best: 'O(k log n)',
    worst: 'O(k log n)',
    icon: CalendarClock,
    tone: 'cyan',
    note: 'Scans clinic slots in order and probes the tree for each slot',
  },
]

const ROTATIONS = [
  {
    type: 'LL',
    title: 'Left-Left',
    condition: 'BF(z) > +1 and key < y.key',
    action: 'Single right rotation at z',
    explanation:
      'The new node lands in the left subtree of the left child. Rotating right lifts y, pushes z down to the right, and restores the height.',
    before: { z: [152, 34], y: [96, 84], x: [45, 134] },
    after: { y: [110, 34], x: [48, 120], z: [174, 120] },
  },
  {
    type: 'RR',
    title: 'Right-Right',
    condition: 'BF(z) < −1 and key > y.key',
    action: 'Single left rotation at z',
    explanation:
      'The new node lands in the right subtree of the right child. Rotating left lifts y, pushes z down to the left, and flattens the spine.',
    before: { z: [62, 34], y: [118, 84], x: [170, 134] },
    after: { y: [110, 34], z: [46, 120], x: [174, 120] },
  },
  {
    type: 'LR',
    title: 'Left-Right',
    condition: 'BF(z) > +1 and key > y.key',
    action: 'Left rotation at y, then right rotation at z',
    explanation:
      'The key sits on the inner side of the left child. The first rotation converts the zig-zag into a left-left case; the second rotation balances it.',
    before: { z: [152, 34], y: [88, 84], x: [148, 134] },
    after: { x: [110, 34], y: [48, 120], z: [174, 120] },
  },
  {
    type: 'RL',
    title: 'Right-Left',
    condition: 'BF(z) < −1 and key < y.key',
    action: 'Right rotation at y, then left rotation at z',
    explanation:
      'The key sits on the inner side of the right child. The first rotation creates a right-right shape; the second rotation restores balance.',
    before: { z: [62, 34], y: [126, 84], x: [66, 134] },
    after: { x: [110, 34], z: [46, 120], y: [174, 120] },
  },
]

const HEIGHT_TABLE = [
  { nodes: '10', bst: '9', avl: '4', search: '4' },
  { nodes: '100', bst: '99', avl: '7', search: '7' },
  { nodes: '1,000', bst: '999', avl: '10', search: '10' },
  { nodes: '1,000,000', bst: '999,999', avl: '20', search: '20' },
]

const STEPS = [
  {
    icon: Search,
    title: '01 · Compare from the root',
    detail:
      'The composite key 20261105-0930-APT-0001 is compared with each node. Smaller keys move left, larger keys move right. This is the normal BST descent.',
  },
  {
    icon: CircleDot,
    title: '02 · Insert as a leaf',
    detail:
      'The new node is attached at the null child where the search stopped. Its height starts at 1 and its balance factor is 0.',
  },
  {
    icon: Repeat2,
    title: '03 · Unwind the path',
    detail:
      'On the way back to the root, every visited node recomputes height = 1 + max(height(left), height(right)) and BF = height(left) − height(right).',
  },
  {
    icon: RotateCw,
    title: '04 · Detect and rotate',
    detail:
      'The first node whose balance factor becomes +2 or −2 is the pivot. Its child and grandchild decide LL, RR, LR or RL. One or two rotations restore the invariant.',
  },
  {
    icon: ShieldCheck,
    title: '05 · Verify O(log n) height',
    detail:
      'After the rotation chain, every balance factor is back inside −1..+1. The backend validator checks heights, ordering and parent pointers across all nodes.',
  },
]

function RotationFigure({ rotation }) {
  const before = rotation.before
  const after = rotation.after
  const renderNode = (label, point, className) => {
    if (!point) return null
    const [x, y] = point
    return (
      <g key={`${label}-${x}-${y}`}>
        <circle cx={x} cy={y} r="15" className={`rot-node ${className}`} />
        <text x={x} y={y + 4} className="rot-node-label">
          {label}
        </text>
      </g>
    )
  }
  const renderEdge = (from, to) =>
    from && to ? (
      <line
        key={`${from.join('-')}-${to.join('-')}`}
        x1={from[0]}
        y1={from[1]}
        x2={to[0]}
        y2={to[1]}
        className="rot-edge"
      />
    ) : null

  return (
    <div className="rot-figure">
      <div className="rot-frame">
        <span>Before</span>
        <svg viewBox="0 0 220 160" role="img" aria-label={`${rotation.type} unbalanced tree`}>
          {renderEdge(before.z, before.y)}
          {renderEdge(before.y, before.x)}
          {renderNode('z', before.z, 'is-pivot')}
          {renderNode('y', before.y, 'is-child')}
          {renderNode('x', before.x, 'is-new')}
        </svg>
      </div>
      <span className="rot-figure-arrow">
        <ArrowRight size={18} />
        <em>{rotation.type}</em>
      </span>
      <div className="rot-frame is-after">
        <span>After</span>
        <svg viewBox="0 0 220 160" role="img" aria-label={`${rotation.type} balanced tree`}>
          {Object.keys(after).map((label) =>
            ['x', 'y', 'z']
              .filter((other) => other !== label)
              .map((other) => renderEdge(after[label], after[other])),
          )}
          {renderNode('x', after.x, 'is-new')}
          {renderNode('y', after.y, 'is-child')}
          {renderNode('z', after.z, 'is-pivot')}
        </svg>
      </div>
    </div>
  )
}

export default function AlgorithmPage() {
  return (
    <div className="analysis-page">
      <section className="analysis-hero fade-up">
        <div className="analysis-hero-copy">
          <span className="eyebrow-chip">
            <Binary size={12} /> AVL deep dive
          </span>
          <h2>
            A BST can degrade to a list.
            <br />
            An AVL tree refuses to.
          </h2>
          <p>
            Every appointment operation in MediSlot runs against a manually implemented AVL tree. The height
            difference between any node's two subtrees is kept within −1, +1, so search, insertion and deletion
            stay logarithmic even when keys arrive in sorted order.
          </p>
          <div className="analysis-hero-badges">
            <span>
              <ShieldCheck size={14} /> Height ≤ 1.44 log₂(n + 2)
            </span>
            <span>
              <Gauge size={14} /> Balance factor ∈ [−1, +1]
            </span>
            <span>
              <Workflow size={14} /> LL · RR · LR · RL rotations
            </span>
          </div>
        </div>
        <div className="complexity-orbit" aria-hidden="true">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <div className="complexity-big">
            <span>worst case</span>
            <strong>O(log n)</strong>
            <em>search · insert · delete</em>
          </div>
          <span className="orbit-chip chip-one">h ≈ log₂ n</span>
          <span className="orbit-chip chip-two">BF ≤ |1|</span>
          <span className="orbit-chip chip-three">n = nodes</span>
        </div>
      </section>

      <section className="complexity-grid">
        {COMPLEXITY.map((item) => {
          const Icon = item.icon
          return (
            <article className={`complexity-card tone-${item.tone}`} key={item.operation}>
              <div className="complexity-head">
                <span className="complexity-icon">
                  <Icon size={18} />
                </span>
                <span className="complexity-badge">AVL</span>
              </div>
              <h3>{item.operation}</h3>
              <p className="complexity-structure">{item.structure}</p>
              <div className="complexity-values">
                <span>
                  best <strong>{item.best}</strong>
                </span>
                <span>
                  worst <strong>{item.worst}</strong>
                </span>
              </div>
              <p className="complexity-note">{item.note}</p>
            </article>
          )
        })}
      </section>

      <section className="analysis-split">
        <article className="card analysis-card fade-up">
          <div className="section-title">
            <div>
              <h2>Balance factor, precisely</h2>
              <p>The single number that keeps the tree honest</p>
            </div>
            <span className="analysis-pill">core invariant</span>
          </div>
          <div className="formula-block">
            <code>BF(node) = height(node.left) − height(node.right)</code>
          </div>
          <div className="bf-scale">
            <div className="bf-step ok">
              <strong>+1</strong>
              <span>left-heavy but legal</span>
            </div>
            <div className="bf-step ok">
              <strong>0</strong>
              <span>perfectly even</span>
            </div>
            <div className="bf-step ok">
              <strong>−1</strong>
              <span>right-heavy but legal</span>
            </div>
            <div className="bf-step bad">
              <strong>±2</strong>
              <span>rotate immediately</span>
            </div>
          </div>
          <p className="analysis-copy">
            Height is measured in nodes (a leaf has height 1), so an empty subtree has height 0. During insertion
            and deletion the tree recomputes both values while unwinding the recursion. Only the first unbalanced
            node on that path needs attention for insertion; deletion may require several rotations further up.
          </p>
          <div className="analysis-callout">
            <CheckCircle2 size={16} />
            <span>
              The backend validator re-checks every node after each operation: BST ordering, stored height,
              balance factor, parent pointers and the absolute balance bound.
            </span>
          </div>
        </article>

        <article className="card analysis-card fade-up">
          <div className="section-title">
            <div>
              <h2>Height guarantee</h2>
              <p>Why the worst case never becomes O(n)</p>
            </div>
            <span className="analysis-pill mint">math</span>
          </div>
          <div className="formula-block mint">
            <code>h ≤ 1.44 · log₂(n + 2) − 0.328</code>
          </div>
          <p className="analysis-copy">
            An AVL tree of height <code>h</code> contains at least <code>F(h+2) − 1</code> nodes, where F is the
            Fibonacci sequence. That lower bound forces the height to grow logarithmically with the number of
            nodes, even in the worst possible insertion order.
          </p>
          <div className="height-table-wrap">
            <table className="height-table">
              <thead>
                <tr>
                  <th>Nodes</th>
                  <th>Skewed BST height</th>
                  <th>AVL height</th>
                  <th>Worst search</th>
                </tr>
              </thead>
              <tbody>
                {HEIGHT_TABLE.map((row) => (
                  <tr key={row.nodes}>
                    <td>{row.nodes}</td>
                    <td className="is-bad">{row.bst}</td>
                    <td className="is-good">{row.avl}</td>
                    <td>{row.search} comparisons</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="analysis-callout mint">
            <TrendingDown size={16} />
            <span>
              A sorted insertion stream would make a plain BST a linked list. The AVL rotations keep this project
              at roughly 20 comparisons even for a million appointments.
            </span>
          </div>
        </article>
      </section>

      <section className="card rotation-analysis-card fade-up">
        <div className="section-title">
          <div>
            <h2>The four rotations</h2>
            <p>Named by the path from the pivot to the newly inserted node</p>
          </div>
          <span className="analysis-pill amber">
            <RotateCcw size={12} /> rebalance
          </span>
        </div>
        <div className="rotation-analysis-grid">
          {ROTATIONS.map((rotation) => (
            <article className={`rotation-analysis-item case-${rotation.type.toLowerCase()}`} key={rotation.type}>
              <div className="rotation-analysis-head">
                <span className={`rotation-case case-${rotation.type.toLowerCase()}`}>{rotation.type}</span>
                <div>
                  <h3>{rotation.title}</h3>
                  <code>{rotation.condition}</code>
                </div>
              </div>
              <RotationFigure rotation={rotation} />
              <strong className="rotation-action">{rotation.action}</strong>
              <p>{rotation.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card comparison-card fade-up">
        <div className="section-title">
          <div>
            <h2>BST vs AVL in this project</h2>
            <p>Same interface, very different worst-case behaviour</p>
          </div>
          <span className="analysis-pill blue">comparison</span>
        </div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>
                  <GitBranch size={13} /> Plain BST
                </th>
                <th className="is-avl">
                  <ShieldCheck size={13} /> AVL tree (used here)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Height, worst case</td>
                <td className="is-bad">O(n) — sorted input creates a chain</td>
                <td className="is-good">O(log n) — rebalanced after every mutation</td>
              </tr>
              <tr>
                <td>Search</td>
                <td className="is-bad">O(n) worst, O(log n) average</td>
                <td className="is-good">O(log n) guaranteed</td>
              </tr>
              <tr>
                <td>Insert / delete</td>
                <td className="is-bad">O(n) worst, no repair work</td>
                <td className="is-good">O(log n) including rotations</td>
              </tr>
              <tr>
                <td>Balance factor</td>
                <td>Not tracked</td>
                <td className="is-good">Stored and verified at every node</td>
              </tr>
              <tr>
                <td>Rotations</td>
                <td>None</td>
                <td className="is-good">LL, RR, LR and RL implemented manually</td>
              </tr>
              <tr>
                <td>Extra memory</td>
                <td>One node pointer pair</td>
                <td>Height, BF and parent pointer per node</td>
              </tr>
              <tr>
                <td>Project role</td>
                <td>Reference point for the analysis</td>
                <td className="is-good">Real scheduling index for every booking</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="comparison-foot">
          <span>
            <Database size={14} /> H2 is the source of truth; the AVL tree is the in-memory index rebuilt on
            startup.
          </span>
          <span>
            <Layers3 size={14} /> Two AVL trees are maintained: chronological schedule + appointment-ID index.
          </span>
        </div>
      </section>

      <section className="analysis-split analysis-lower">
        <article className="card analysis-card fade-up">
          <div className="section-title">
            <div>
              <h2>Insertion, step by step</h2>
              <p>What the visualizer replays after every booking</p>
            </div>
          </div>
          <div className="analysis-steps">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div className="analysis-step" key={step.title}>
                  <span className="analysis-step-icon">
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <div className="analysis-side">
          <article className="card analysis-card code-card fade-up">
            <div className="section-title">
              <div>
                <h2>Right rotation, actual code</h2>
                <p>No TreeMap, no PriorityQueue — only pointer surgery</p>
              </div>
            </div>
            <pre className="code-block">
              <code>{`private Node rightRotate(Node z) {
  Node y = z.left;
  Node t2 = y.right;

  y.right = z;      // lift y
  z.left = t2;      // move inner subtree

  update(z);        // height + BF
  update(y);
  return y;         // new subtree root
}`}</code>
            </pre>
            <p className="code-caption">
              Left rotation mirrors the same three pointer changes. LR and RL are composed from these two
              primitives, which is why the visualizer can label each frame precisely.
            </p>
          </article>

          <article className="card analysis-card fade-up">
            <div className="section-title">
              <div>
                <h2>Project-specific algorithms</h2>
                <p>AVL operations that solve real scheduling problems</p>
              </div>
            </div>
            <div className="algorithm-list">
              <div>
                <span className="algorithm-icon blue">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <strong>Duplicate prevention</strong>
                  <p>
                    <code>ceilingKey(slotStart)</code> returns the first key at or after the requested date/time.
                    If its date and time match, the slot is already booked.
                  </p>
                </div>
              </div>
              <div>
                <span className="algorithm-icon mint">
                  <CalendarClock size={16} />
                </span>
                <div>
                  <strong>Next available slot</strong>
                  <p>
                    Walk clinic days and slots in chronological order, probing the AVL tree for occupancy. The
                    result is the smallest open future slot — not simply the smallest key.
                  </p>
                </div>
              </div>
              <div>
                <span className="algorithm-icon rose">
                  <Trash2 size={16} />
                </span>
                <div>
                  <strong>Cancellation</strong>
                  <p>
                    Mark the H2 record CANCELLED, remove the composite key from the schedule tree, and remove the
                    ID from the auxiliary index. Rotations repair the height on the way back up.
                  </p>
                </div>
              </div>
              <div>
                <span className="algorithm-icon amber">
                  <Clock3 size={16} />
                </span>
                <div>
                  <strong>Chronological ordering</strong>
                  <p>
                    The composite key <code>YYYYMMDD-HHmm-APT-ID</code> sorts by date, then time, then unique ID,
                    so an in-order walk is automatically a sorted schedule.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="analysis-verification card fade-up">
        <span className="verification-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <h2>Verified, not assumed</h2>
          <p>
            The backend test suite exercises LL, RR, LR and RL insertions, two-child deletion, duplicate keys,
            traversal order, balance factors, and the REST workflow. The live visualizer shows the same snapshots
            that the tests assert on.
          </p>
        </div>
        <div className="verification-stats">
          <div>
            <strong>4</strong>
            <span>rotation cases</span>
          </div>
          <div>
            <strong>±1</strong>
            <span>balance limit</span>
          </div>
          <div>
            <strong>O(log n)</strong>
            <span>guaranteed</span>
          </div>
        </div>
      </section>
    </div>
  )
}
