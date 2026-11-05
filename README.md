# Smart Appointment Booking System Using AVL Tree

A complete college PBL project that uses a **hand-written AVL tree** as the live scheduling index behind a real appointment booking application. The app pairs a Spring Boot + H2 backend with a React dashboard, a working booking and management workflow, and a visualizer that renders the actual backend tree with rotation replays.

> Core rule of the project: no `TreeMap`, no `PriorityQueue`, and no library-balanced tree. Every insertion, search, deletion, height update, balance factor and rotation is implemented manually in `AvlTree.java`.

---

## Table of contents

1. [Project highlights](#project-highlights)
2. [Screens](#screens)
3. [Architecture](#architecture)
4. [The composite AVL key](#the-composite-avl-key)
5. [AVL tree implementation](#avl-tree-implementation)
6. [Rotations explained](#rotations-explained)
7. [Deletion and the in-order successor](#deletion-and-the-in-order-successor)
8. [Duplicate prevention and next available slot](#duplicate-prevention-and-next-available-slot)
9. [Complexity analysis](#complexity-analysis)
10. [AvlTree.java code walkthrough](#avltreejava-code-walkthrough)
11. [REST API](#rest-api)
12. [Project structure](#project-structure)
13. [Running the project](#running-the-project)
14. [Testing](#testing)
15. [Design decisions and limitations](#design-decisions-and-limitations)

---

## Project highlights

- **Manual AVL implementation** — generic `AvlTree<K, V>` with insertion, search, deletion, in-order/pre-order/post-order traversal, range queries, ceiling lookup, snapshots and a full structural validator.
- **Two AVL indexes** — a chronological schedule tree keyed by `AppointmentKey(date, time, id)` and an auxiliary appointment-ID tree keyed by `String`.
- **H2 persistence** — file-based H2 database, no external MySQL server required.
- **Startup rebuild** — on every boot the backend clears both trees and rebuilds them from all `BOOKED` database rows.
- **Real duplicate prevention** — an AVL ceiling search rejects a second booking for the same date and time; the unique ID suffix still guarantees distinct keys.
- **Correct next-slot logic** — scans the clinic policy calendar and probes the tree for each slot, so it never returns an occupied slot just because it is the smallest key.
- **Live visualizer** — node keys, heights and balance factors, search paths, insert/delete highlighting, operation steps, frame replay, before/after rotation views, traversals and reset.
- **Automated tests** — 9 AVL unit tests and 5 API integration tests. All 14 pass.

---

## Screens

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | Dashboard | Total, available slots, booked and cancelled counts, weekly flow, next free slot, upcoming visits and tree health. |
| `/book` | Book Appointment | Validated patient form, real availability grid, duplicate errors and a confirmation receipt. |
| `/manage` | Manage Appointments | Searchable registry, status filters, details modal, cancellation and CSV export. |
| `/visualizer` | AVL Tree Visualizer | Live backend tree, insert sample, delete, search, reset, traversals and rotation replay. |
| `/analysis` | Algorithm Analysis | O(log n) reasoning, balance factor rules, rotation diagrams, BST vs AVL comparison and code excerpt. |
| `/about` | About Project | Problem statement, architecture, modules, API map, test scenarios and structure. |

The sidebar contains exactly the required sections: **Dashboard**, **Book Appointment**, **Manage Appointments**, **AVL Tree Visualizer**, **Algorithm Analysis** and **About Project**.

---

## Architecture

```text
React (Vite)
   │  fetch /api/*
   ▼
Spring Boot REST controllers
   │
   ▼
AppointmentService  ──────────────┐
   │                             │
   ├── AvlTree<AppointmentKey, Appointment>   (schedule index)
   ├── AvlTree<String, Appointment>           (ID index)
   └── AppointmentRepository → H2 file database
```

### Source of truth

H2 is the durable source of truth. The in-memory AVL trees are an index over the active records:

1. On startup, `rebuildTreeFromDatabase()` clears both trees.
2. Every `BOOKED` appointment is inserted into the schedule tree and the ID tree.
3. The sequence generator scans persisted IDs so `APT-0001` is never reused after a restart.
4. Booking writes to H2, then inserts into both trees. If the tree insert fails, the database row is removed.
5. Cancellation removes the node from both trees, marks the row `CANCELLED`, and re-inserts on a persistence failure.
6. Reset clears H2, clears both trees and resets the sequence.

This keeps the dashboard, registry and visualizer from ever showing different data.

---

## The composite AVL key

```text
20261105-0930-APT-0001
└──────┘ └──┘ └──────┘
  date   time   unique ID
```

`AppointmentKey` stores three fields and orders by:

1. appointment date,
2. appointment time,
3. appointment ID (case-insensitive) as the tie-breaker.

Why this matters:

- **Chronological ordering.** An in-order traversal is automatically the clinic schedule.
- **Duplicate detection.** Two bookings on the same date and time are adjacent keys, so a ceiling lookup finds the conflict in O(log n).
- **Availability windows.** `dayStart(date)` and `dayEnd(date)` produce a key range for one day.
- **Uniqueness.** The ID suffix guarantees that even two identical date/time values produce different keys, while the service still rejects the duplicate at the business layer.

The key's `compareTo` first compares dates, then times, then IDs. `displayKey()` renders the compact form used by the UI.

---

## AVL tree implementation

Each node stores:

```java
private static final class Node<K, V> {
    private K key;
    private V value;
    private Node<K, V> left;
    private Node<K, V> right;
    private int height;   // leaf height = 0
}
```

The AVL invariant is maintained at every node:

```text
|height(left) − height(right)| ≤ 1
```

For a node:

```text
height(node) = 1 + max(height(left), height(right))
BF(node)     = height(left) − height(right)
```

Legal balance factors are **−1, 0 and +1**. A factor of +2 or −2 triggers rebalancing while the recursion unwinds.

### Insertion

1. Descend like a normal BST and record the comparison path.
2. Insert the new leaf with height `0`.
3. On the way back up, call `update(node)` to refresh height.
4. Compute the balance factor and apply the matching rotation.
5. Return a snapshot and rotation trace to the service.

### Search

1. Compare at each node and collect the visited keys.
2. Return a `SearchResult` with `found`, `value`, `comparisons` and the path.
3. Primary-tree search by composite key is also used after the ID index resolves an appointment.

### Deletion

1. Find the node by key.
2. Leaf → remove directly.
3. One child → replace with that child.
4. Two children → find the in-order successor (minimum of the right subtree), copy its key/value into the current node, then delete the successor from the right subtree.
5. Update heights and rebalance while unwinding.

Deletion may require multiple rotations on the path back to the root, unlike insertion which needs at most one rotation chain.

### Snapshots and tracing

`snapshot()` deep-copies the tree into immutable `Snapshot` records. The service converts snapshots into `TreeView` JSON, so the visualizer always displays the real backend structure. Rotations additionally record their own `before` and `after` snapshots, which power the before/after modal.

### Validation

`validate()` checks:

- BST ordering under the comparator,
- correct stored heights,
- balance factors within `[-1, 1]`,
- no cycles and no duplicate keys,
- node count consistency.

The dashboard and visualizer expose this result as the **AVL property verified** card.

---

## Rotations explained

Let `z` be the first unbalanced node, `y` its taller child and `x` the new node.

| Case | Condition | Fix |
| --- | --- | --- |
| **LL** | BF(z) > +1 and key < y.key | Single right rotation at z |
| **RR** | BF(z) < −1 and key > y.key | Single left rotation at z |
| **LR** | BF(z) > +1 and key > y.key | Left rotation at y, then right rotation at z |
| **RL** | BF(z) < −1 and key < y.key | Right rotation at y, then left rotation at z |

### LL — single right rotation

```text
        z                        y
       / \                      / \
      y   C        →           x   z
     / \                          / \
    x   B                        B   C
```

`rotateRight(z)` makes `y` the new subtree root, attaches `B` as `z`'s left child, then updates `z` and `y`.

### RR — single left rotation

```text
      z                            y
     / \                          / \
    A   y          →             z   x
       / \                      / \
      B   x                    A   B
```

`rotateLeft(z)` is the mirror image.

### LR — left then right

```text
      z            z              x
     / \          / \            / \
    y   C   →    x   C    →     y   z
   / \          / \            / \ / \
  A   x        y   B          A  B B' C
     / \      / \
    B'  B    A   B'
```

First rotate left at `y` to turn the zig-zag into an LL shape, then rotate right at `z`.

### RL — right then left

Mirror of LR: rotate right at `y`, then left at `z`.

Each rotation in the UI is clickable and opens a modal containing the **actual before and after tree snapshots** returned by the backend, not a hand-drawn approximation.

---

## Deletion and the in-order successor

The two-child deletion case is the most interesting one for evaluation:

1. Find the target node.
2. Locate the minimum node in its right subtree — this is the in-order successor.
3. Copy the successor's key and value into the target node. (The appointment record itself is the same object; the key is rebuilt from the record.)
4. Delete the successor node from the right subtree.
5. Unwind, updating heights and applying rotations.

The visualizer's delete trace highlights the search path, the deletion frame and every rotation that follows. The service creates the schedule key from the appointment before deleting, which keeps the UI and tree consistent.

---

## Duplicate prevention and next available slot

### Duplicate date/time

```java
AppointmentKey ceiling = scheduleTree.ceilingKey(AppointmentKey.slotStart(date, time));
boolean booked = ceiling != null
        && ceiling.date().equals(date)
        && ceiling.time().equals(time);
```

`ceilingKey` returns the smallest key greater than or equal to the requested slot. If that key has the same date and time, the slot is occupied. Complexity: **O(log n)**.

### Correct next available slot

A naive implementation might return the smallest key greater than "now", which can be a slot that is already booked. This project instead:

1. Starts at today and iterates up to 60 days (the booking horizon).
2. Skips Sundays.
3. Iterates the clinic's real 30-minute slots from 09:00 through 16:30.
4. Rejects past slots.
5. Calls `isSlotBooked(date, time)` for each candidate and returns the first genuinely free slot.

This is `O(k log n)` where `k` is the number of slots examined, and it is shared by the dashboard, booking page and availability endpoint.

---

## Complexity analysis

| Operation | Average | Worst | Notes |
| --- | --- | --- | --- |
| Insert | O(log n) | O(log n) | One descent + at most one rebalance chain |
| Search | O(log n) | O(log n) | Balanced height ≤ 1.44 log₂(n + 2) − 0.33 |
| Delete | O(log n) | O(log n) | May rotate at several ancestors |
| Duplicate check | O(log n) | O(log n) | Ceiling lookup |
| Next slot | O(k log n) | O(k log n) | k = slots scanned |
| In-order traversal | O(n) | O(n) | Already chronological |
| Reset | O(n) | O(n) | Clear both trees + delete all rows |

### Height bound

For an AVL tree with `n` nodes:

```text
h < 1.4405 · log₂(n + 2) − 0.3277
```

So even in the worst case, search remains logarithmic. A plain BST can degenerate into a linked list with height `n` and O(n) operations when keys arrive in sorted order — exactly what happens when appointments are booked chronologically. The AVL tree prevents that.

### BST vs AVL

| Property | Plain BST | AVL tree |
| --- | --- | --- |
| Sorted insertion | Degenerates to a chain | Stays balanced |
| Worst-case search | O(n) | O(log n) |
| Extra storage | One pointer pair | Height integer per node |
| Insert cost | O(h) | O(h) + rotations |
| Delete cost | O(h) | O(h) + rotations |
| Schedule traversal | O(n) | O(n), ordered |

The dashboard's weekly chart uses the tree's range query, and the management table reads from H2, so the project demonstrates both index-backed and record-backed views of the same data.

---

## AvlTree.java code walkthrough

### Node and metrics

```java
private void update(Node<K, V> node) {
    node.height = 1 + Math.max(height(node.left), height(node.right));
}

private int balanceFactor(Node<K, V> node) {
    return node == null ? 0 : height(node.left) - height(node.right);
}
```

### Insertion and rebalancing

```java
private Node<K, V> insert(Node<K, V> node, K key, V value,
                          List<K> path, List<Rotation<K, V>> rotations) {
    if (node == null) return new Node<>(key, value);
    path.add(node.key);
    int cmp = comparator.compare(key, node.key);
    if (cmp < 0) {
        node.left = insert(node.left, key, value, path, rotations);
    } else if (cmp > 0) {
        node.right = insert(node.right, key, value, path, rotations);
    } else {
        return node; // duplicate key: no structural change
    }
    return rebalance(node, rotations);
}
```

`rebalance` checks the four cases:

```java
int balance = balanceFactor(node);

if (balance > 1 && balanceFactor(node.left) >= 0) return rotateRight(node, rotations); // LL
if (balance < -1 && balanceFactor(node.right) <= 0) return rotateLeft(node, rotations); // RR
if (balance > 1 && balanceFactor(node.left) < 0) {                                      // LR
    node.left = rotateLeft(node.left, rotations);
    return rotateRight(node, rotations);
}
if (balance < -1 && balanceFactor(node.right) > 0) {                                    // RL
    node.right = rotateRight(node.right, rotations);
    return rotateLeft(node, rotations);
}
return node;
```

### Rotation with trace

```java
private Node<K, V> rotateRight(Node<K, V> z, List<Rotation<K, V>> rotations) {
    Snapshot<K, V> before = snapshot(z);      // captured for the UI
    Node<K, V> y = z.left;
    Node<K, V> b = y.right;

    y.right = z;
    z.left = b;

    update(z);
    update(y);

    Snapshot<K, V> after = snapshot(y);
    rotations.add(new Rotation<>(RotationType.LL, z.key, y.key,
            "Right rotation at " + z.key + " lifts " + y.key, before, after));
    return y;
}
```

The actual implementation records the correct rotation type for double rotations and uses helper overloads so each snapshot is rooted at the affected subtree where appropriate.

---

## REST API

Base URL: `http://localhost:8080`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Counts, weekly flow, next slot and tree health |
| `GET` | `/api/appointments?query=&status=` | List persisted records |
| `GET` | `/api/appointments/{id}` | Fetch one persisted record |
| `POST` | `/api/appointments` | Create a booking and insert it into the AVL tree |
| `POST` | `/api/appointments/{id}/cancel` | Cancel in H2 and delete both AVL nodes |
| `GET` | `/api/appointments/availability?date=yyyy-MM-dd` | Slot-by-slot availability |
| `GET` | `/api/appointments/next-available` | First genuinely open future slot |
| `GET` | `/api/avl/tree` | Full tree snapshot with keys, heights and balance factors |
| `GET` | `/api/avl/health` | Validate ordering, heights, balance factors and structure |
| `GET` | `/api/avl/traversals` | In-order, pre-order and post-order node lists |
| `POST` | `/api/avl/search` | ID-index lookup plus primary-tree comparison path |
| `POST` | `/api/avl/sample` | Insert a real sample appointment with trace |
| `DELETE` | `/api/avl/appointments/{id}` | Delete one node with rotation frames |
| `POST` | `/api/avl/reset` | Clear H2 and both AVL trees |
| `GET` | `/api/health` | Application heartbeat |

### Booking request

```json
{
  "patientName": "Ananya Iyer",
  "email": "ananya@example.com",
  "phone": "+91 98765 43210",
  "appointmentDate": "2026-11-05",
  "appointmentTime": "09:30",
  "description": "Routine follow-up consultation."
}
```

### Operation trace shape

Insert, delete, search and reset return:

```json
{
  "operation": "INSERT",
  "success": true,
  "message": "APT-0012 inserted with 2 rotation(s).",
  "appointment": { "...": "..." },
  "highlightedKey": "20261105-0930-APT-0012",
  "searchPath": ["..."],
  "steps": [{ "number": 1, "title": "...", "detail": "...", "type": "COMPARE" }],
  "frames": [{ "title": "...", "detail": "...", "rotationType": "LR", "highlightKeys": ["..."], "tree": { "...": "..." } }],
  "rotations": [{ "caseType": "LR", "before": {}, "after": {} }],
  "beforeTree": {},
  "tree": {}
}
```

The visualizer replays these frames one by one, including the intermediate tree snapshots captured around rotations.

---

## Project structure

```text
ads_pbl/
├── README.md
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/smartclinic/appointments/
│       │   │   ├── SmartAppointmentApplication.java
│       │   │   ├── avl/
│       │   │   │   ├── AvlTree.java
│       │   │   │   └── AppointmentKey.java
│       │   │   ├── config/CorsConfig.java
│       │   │   ├── controller/
│       │   │   │   ├── AppointmentController.java
│       │   │   │   ├── AvlController.java
│       │   │   │   ├── DashboardController.java
│       │   │   │   └── SystemController.java
│       │   │   ├── dto/            API records and views
│       │   │   ├── exception/      central error handling
│       │   │   ├── model/          Appointment, AppointmentStatus
│       │   │   ├── repository/     Spring Data JPA repository
│       │   │   └── service/
│       │   │       ├── AppointmentService.java
│       │   │       ├── DemoDataInitializer.java
│       │   │       ├── SlotPolicy.java
│       │   │       └── TreeViewMapper.java
│       │   └── resources/application.properties
│       └── test/java/com/smartclinic/appointments/
│           ├── avl/AvlTreeTest.java
│           └── service/AppointmentApiIntegrationTest.java
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/   Layout, TreeCanvas, Modal, ConfirmDialog, ToastProvider, StatusBadge
        ├── lib/          api.js, format.js
        ├── pages/        Dashboard, Book, Manage, Visualizer, Algorithm, About, NotFound
        └── styles/       global.css, pages.css
```

---

## Running the project

### Prerequisites

- Java 17 or newer
- Maven 3.9+
- Node.js 20+ and npm

The project compiles with `--release 17` and has been tested with Java 26, Maven 3.9.9 and Node 22.14.0.

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

The API starts on **http://localhost:8080**.

Useful URLs:

- API root: `http://localhost:8080/api/health`
- Tree snapshot: `http://localhost:8080/api/avl/tree`
- H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:file:./data/smart_appointments`, user `sa`, blank password)
- OpenAPI is not enabled; the endpoint table above is the reference.

The H2 file is created under `backend/data/`. Demo data is inserted only when the database is empty. To start without demo data:

```properties
app.seed-demo-data=false
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to `http://localhost:8080`.

### 3. Production build

```bash
cd frontend
npm run build
npm run preview
```

The production bundle is written to `frontend/dist/`.

### 4. Tests

```bash
cd backend
mvn test
```

Expected: **14 tests, 0 failures, 0 errors**.

---

## Testing

### Automated

`AvlTreeTest` (9 tests):

1. LL rotation.
2. RR rotation.
3. LR double rotation.
4. RL double rotation.
5. Search for present and missing keys.
6. Leaf, one-child and two-child deletion.
7. In-order successor replacement.
8. Height and balance factor checks after every mutation.
9. Structural validation (ordering, heights, BF, cycles, duplicates).

`AppointmentApiIntegrationTest` (5 tests):

1. Book an appointment and read the updated tree.
2. Reject a duplicate date/time booking.
3. Cancel and confirm removal from both indexes.
4. Availability and next-available behaviour.
5. Validation failures for Sunday, past, bad slot and horizon.

### Manual evaluation scenarios

Use the visualizer and management screens to demonstrate:

1. **Insert sample appointment** — watch the tree grow; a rotation may fire depending on the selected slot.
2. **Search appointment** — enter an `APT-####` ID and inspect the ID-index result plus the chronological comparison path.
3. **Delete appointment** — delete a leaf, a one-child node and a two-child node; open the rotation cards to compare before/after snapshots.
4. **Reset tree** — verify that the canvas empties, the dashboard counts reset and the next booking starts at `APT-0001`.
5. **Traversals** — open Inorder, Preorder and Postorder; the in-order list is chronological.
6. **Duplicate booking** — attempt the same date/time twice; the API returns **409** and the UI points to the availability grid.
7. **Next slot** — book the earliest free slot and refresh the dashboard; the next-slot card must advance to the next genuinely free slot.
8. **Restart persistence** — stop and start the backend; `BOOKED` rows are rebuilt into the tree and cancelled rows stay out.
9. **Invalid input** — Sunday, past date, non-standard time or more than 60 days ahead is rejected.
10. **Balance factors** — every node badge must stay within `−1..+1`; health must read **AVL property verified**.

---

## Design decisions and limitations

- **H2 file database** was chosen over MySQL so the project runs with zero external services. The JPA layer can be pointed at MySQL by changing the datasource properties.
- **Two AVL trees** demonstrate that the structure is genuinely used as an index rather than a decorative demo. The schedule tree answers chronological questions; the ID tree answers user-facing lookups.
- **Synchronized service methods** keep the two trees and H2 consistent for this single-instance academic project. A production system would need a database transaction boundary around both indexes, or a rebuild/outbox strategy.
- **In-memory indexes** are rebuilt from H2 at startup. If the process were scaled horizontally, each instance would need its own index or a shared cache invalidation strategy.
- **The visualizer replays real server snapshots.** It does not simulate rotations in JavaScript; it renders the frame list returned by Spring Boot.
- **Clinic policy** is fixed to Monday–Saturday, 09:00–16:30 in 30-minute slots and a 60-day booking horizon. These values live in `SlotPolicy` and can be changed in one place.
- **Cancellation is soft** — the row remains in H2 with `CANCELLED` status for auditability, while the AVL nodes are removed so the slot becomes bookable again.

---

## Author and context

Academic PBL project for **Advanced Data Structures**.

**Smart Appointment Booking System Using AVL Tree**  
Java · Spring Boot · REST · React · H2 · Manual AVL implementation
