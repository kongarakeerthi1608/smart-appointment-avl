package com.smartclinic.appointments.avl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;

/**
 * A manually implemented AVL tree (no TreeMap/PriorityQueue).
 *
 * <p>Every node stores its key, value, left/right child, parent pointer,
 * height and balance factor. The parent pointer exists so that rotation
 * snapshots remain structurally accurate at every step of an operation.</p>
 *
 * <p>The class is deliberately single-threaded. The service layer guards all
 * mutations with a lock.</p>
 */
public final class AvlTree<K, V> {

    public enum RotationType { LL, RR, LR, RL }

    public record NodeData<K, V>(
            K key,
            V value,
            int height,
            int balanceFactor,
            NodeData<K, V> left,
            NodeData<K, V> right
    ) {
    }

    public record Snapshot<K, V>(
            NodeData<K, V> root,
            int size,
            int height,
            boolean balanced
    ) {
        public static <K, V> Snapshot<K, V> empty() {
            return new Snapshot<>(null, 0, 0, true);
        }
    }

    public record Rotation<K, V>(
            RotationType caseType,
            String action,
            String phase,
            K pivotKey,
            K childKey,
            String explanation,
            Snapshot<K, V> before,
            Snapshot<K, V> after
    ) {
    }

    public record SearchResult<K, V>(
            boolean found,
            K key,
            V value,
            List<K> path,
            int comparisons
    ) {
    }

    public record InsertResult<K, V>(
            boolean inserted,
            K key,
            V value,
            List<K> path,
            List<Rotation<K, V>> rotations,
            Snapshot<K, V> finalSnapshot
    ) {
    }

    public record DeleteResult<K, V>(
            boolean deleted,
            K key,
            V value,
            List<K> path,
            List<Rotation<K, V>> rotations,
            Snapshot<K, V> finalSnapshot
    ) {
    }

    public record ValidationResult(boolean valid, int nodesChecked, List<String> errors) {
    }

    private static final class Node<K, V> {
        private K key;
        private V value;
        private Node<K, V> left;
        private Node<K, V> right;
        private Node<K, V> parent;
        private int height = 1;
        private int balanceFactor = 0;

        private Node(K key, V value, Node<K, V> parent) {
            this.key = key;
            this.value = value;
            this.parent = parent;
        }
    }

    private final Comparator<? super K> comparator;
    private Node<K, V> root;
    private int size;

    public AvlTree(Comparator<? super K> comparator) {
        this.comparator = Objects.requireNonNull(comparator, "comparator");
    }

    public int size() {
        return size;
    }

    public boolean isEmpty() {
        return size == 0;
    }

    public int height() {
        return height(root);
    }

    public K rootKey() {
        return root == null ? null : root.key;
    }

    public V getRootValue() {
        return root == null ? null : root.value;
    }

    // ------------------------------------------------------------------
    // INSERTION
    // ------------------------------------------------------------------

    public InsertResult<K, V> insert(K key, V value) {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(value, "value");
        List<K> path = new ArrayList<>();
        List<Rotation<K, V>> rotations = new ArrayList<>();
        int sizeBefore = size;

        root = insert(root, key, value, null, path, rotations);

        if (sizeBefore == size) {
            return new InsertResult<>(
                    false, key, null, List.copyOf(path), List.copyOf(rotations), snapshot()
            );
        }
        return new InsertResult<>(
                true, key, value, List.copyOf(path), List.copyOf(rotations), snapshot()
        );
    }

    private Node<K, V> insert(
            Node<K, V> node,
            K key,
            V value,
            Node<K, V> parent,
            List<K> path,
            List<Rotation<K, V>> rotations
    ) {
        if (node == null) {
            size++;
            return new Node<>(key, value, parent);
        }

        path.add(node.key);
        int comparison = comparator.compare(key, node.key);
        if (comparison < 0) {
            node.left = insert(node.left, key, value, node, path, rotations);
        } else if (comparison > 0) {
            node.right = insert(node.right, key, value, node, path, rotations);
        } else {
            return node; // Duplicate key is rejected.
        }

        update(node);
        return rebalance(node, rotations);
    }

    // ------------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------------

    public SearchResult<K, V> search(K key) {
        Objects.requireNonNull(key, "key");
        List<K> path = new ArrayList<>();
        Node<K, V> current = root;
        int comparisons = 0;

        while (current != null) {
            path.add(current.key);
            comparisons++;
            int comparison = comparator.compare(key, current.key);
            if (comparison == 0) {
                return new SearchResult<>(true, current.key, current.value, List.copyOf(path), comparisons);
            }
            current = comparison < 0 ? current.left : current.right;
        }
        return new SearchResult<>(false, key, null, List.copyOf(path), comparisons);
    }

    public K ceilingKey(K key) {
        Objects.requireNonNull(key, "key");
        Node<K, V> current = root;
        K candidate = null;
        while (current != null) {
            if (comparator.compare(current.key, key) >= 0) {
                candidate = current.key;
                current = current.left;
            } else {
                current = current.right;
            }
        }
        return candidate;
    }

    public List<V> valuesBetween(K fromInclusive, K toExclusive) {
        List<V> result = new ArrayList<>();
        collectRange(root, fromInclusive, toExclusive, result);
        return result;
    }

    private void collectRange(Node<K, V> node, K from, K to, List<V> result) {
        if (node == null) {
            return;
        }
        if (comparator.compare(node.key, from) > 0) {
            collectRange(node.left, from, to, result);
        }
        if (comparator.compare(node.key, from) >= 0 && comparator.compare(node.key, to) < 0) {
            result.add(node.value);
        }
        if (comparator.compare(node.key, to) < 0) {
            collectRange(node.right, from, to, result);
        }
    }

    /** Returns the first value matching the predicate using an in-order walk. */
    public V findFirst(Predicate<V> predicate) {
        return findFirst(root, predicate);
    }

    private V findFirst(Node<K, V> node, Predicate<V> predicate) {
        if (node == null) {
            return null;
        }
        V fromLeft = findFirst(node.left, predicate);
        if (fromLeft != null) {
            return fromLeft;
        }
        if (predicate.test(node.value)) {
            return node.value;
        }
        return findFirst(node.right, predicate);
    }

    // ------------------------------------------------------------------
    // DELETION
    // ------------------------------------------------------------------

    public DeleteResult<K, V> delete(K key) {
        Objects.requireNonNull(key, "key");
        SearchResult<K, V> found = search(key);
        if (!found.found()) {
            return new DeleteResult<>(
                    false, key, null, found.path(), List.of(), snapshot()
            );
        }

        List<Rotation<K, V>> rotations = new ArrayList<>();
        root = deleteNode(root, key, rotations);
        return new DeleteResult<>(
                true, key, found.value(), found.path(), List.copyOf(rotations), snapshot()
        );
    }

    private Node<K, V> deleteNode(Node<K, V> node, K key, List<Rotation<K, V>> rotations) {
        if (node == null) {
            return null;
        }

        int comparison = comparator.compare(key, node.key);
        if (comparison < 0) {
            node.left = deleteNode(node.left, key, rotations);
            if (node.left != null) {
                node.left.parent = node;
            }
        } else if (comparison > 0) {
            node.right = deleteNode(node.right, key, rotations);
            if (node.right != null) {
                node.right.parent = node;
            }
        } else {
            if (node.left == null || node.right == null) {
                Node<K, V> child = node.left != null ? node.left : node.right;
                if (child != null) {
                    child.parent = node.parent;
                }
                size--;
                return child;
            }

            // Two children: copy the in-order successor into this node.
            // The successor is then physically removed from the right subtree.
            Node<K, V> successor = minimum(node.right);
            node.key = successor.key;
            node.value = successor.value;
            node.right = deleteNode(node.right, successor.key, rotations);
            if (node.right != null) {
                node.right.parent = node;
            }
        }

        update(node);
        return rebalance(node, rotations);
    }

    private Node<K, V> minimum(Node<K, V> node) {
        while (node.left != null) {
            node = node.left;
        }
        return node;
    }

    // ------------------------------------------------------------------
    // ROTATIONS
    // ------------------------------------------------------------------

    private Node<K, V> rebalance(Node<K, V> node, List<Rotation<K, V>> rotations) {
        update(node);
        int balance = node.balanceFactor;

        if (balance > 1) {
            if (node.left.balanceFactor < 0) {
                rotateLeft(
                        node.left,
                        RotationType.LR,
                        "LR step 1: left rotation on left child",
                        "The left child is right-heavy, so rotate it left first.",
                        rotations
                );
                return rotateRight(
                        node,
                        RotationType.LR,
                        "LR step 2: right rotation on pivot",
                        "Now the pivot is left-heavy; rotate it right to restore balance.",
                        rotations
                );
            }
            return rotateRight(
                    node,
                    RotationType.LL,
                    "LL case: single right rotation",
                    "The left-left grandchild caused the imbalance; one right rotation fixes it.",
                    rotations
            );
        }

        if (balance < -1) {
            if (node.right.balanceFactor > 0) {
                rotateRight(
                        node.right,
                        RotationType.RL,
                        "RL step 1: right rotation on right child",
                        "The right child is left-heavy, so rotate it right first.",
                        rotations
                );
                return rotateLeft(
                        node,
                        RotationType.RL,
                        "RL step 2: left rotation on pivot",
                        "Now the pivot is right-heavy; rotate it left to restore balance.",
                        rotations
                );
            }
            return rotateLeft(
                    node,
                    RotationType.RR,
                    "RR case: single left rotation",
                    "The right-right grandchild caused the imbalance; one left rotation fixes it.",
                    rotations
            );
        }

        return node;
    }

    private Node<K, V> rotateRight(
            Node<K, V> pivot,
            RotationType caseType,
            String action,
            String explanation,
            List<Rotation<K, V>> rotations
    ) {
        Snapshot<K, V> before = snapshot();
        Node<K, V> newRoot = pivot.left;
        Node<K, V> movedSubtree = newRoot.right;
        Node<K, V> oldParent = pivot.parent;

        pivot.left = movedSubtree;
        if (movedSubtree != null) {
            movedSubtree.parent = pivot;
        }
        newRoot.right = pivot;
        pivot.parent = newRoot;
        newRoot.parent = oldParent;

        if (oldParent == null) {
            root = newRoot;
        } else if (oldParent.left == pivot) {
            oldParent.left = newRoot;
        } else {
            oldParent.right = newRoot;
        }

        update(pivot);
        update(newRoot);
        rotations.add(new Rotation<>(
                caseType,
                action,
                "BEFORE_AFTER",
                pivot.key,
                newRoot.key,
                explanation,
                before,
                snapshot()
        ));
        return newRoot;
    }

    private Node<K, V> rotateLeft(
            Node<K, V> pivot,
            RotationType caseType,
            String action,
            String explanation,
            List<Rotation<K, V>> rotations
    ) {
        Snapshot<K, V> before = snapshot();
        Node<K, V> newRoot = pivot.right;
        Node<K, V> movedSubtree = newRoot.left;
        Node<K, V> oldParent = pivot.parent;

        pivot.right = movedSubtree;
        if (movedSubtree != null) {
            movedSubtree.parent = pivot;
        }
        newRoot.left = pivot;
        pivot.parent = newRoot;
        newRoot.parent = oldParent;

        if (oldParent == null) {
            root = newRoot;
        } else if (oldParent.left == pivot) {
            oldParent.left = newRoot;
        } else {
            oldParent.right = newRoot;
        }

        update(pivot);
        update(newRoot);
        rotations.add(new Rotation<>(
                caseType,
                action,
                "BEFORE_AFTER",
                pivot.key,
                newRoot.key,
                explanation,
                before,
                snapshot()
        ));
        return newRoot;
    }

    private void update(Node<K, V> node) {
        int leftHeight = height(node.left);
        int rightHeight = height(node.right);
        node.height = 1 + Math.max(leftHeight, rightHeight);
        node.balanceFactor = leftHeight - rightHeight;
    }

    private int height(Node<K, V> node) {
        return node == null ? 0 : node.height;
    }

    // ------------------------------------------------------------------
    // TRAVERSALS / SNAPSHOTS / VALIDATION
    // ------------------------------------------------------------------

    public List<V> inOrder() {
        List<V> result = new ArrayList<>(size);
        inOrder(root, result);
        return result;
    }

    private void inOrder(Node<K, V> node, List<V> result) {
        if (node == null) {
            return;
        }
        inOrder(node.left, result);
        result.add(node.value);
        inOrder(node.right, result);
    }

    public List<V> preOrder() {
        List<V> result = new ArrayList<>(size);
        preOrder(root, result);
        return result;
    }

    private void preOrder(Node<K, V> node, List<V> result) {
        if (node == null) {
            return;
        }
        result.add(node.value);
        preOrder(node.left, result);
        preOrder(node.right, result);
    }

    public List<V> postOrder() {
        List<V> result = new ArrayList<>(size);
        postOrder(root, result);
        return result;
    }

    private void postOrder(Node<K, V> node, List<V> result) {
        if (node == null) {
            return;
        }
        postOrder(node.left, result);
        postOrder(node.right, result);
        result.add(node.value);
    }

    public Snapshot<K, V> snapshot() {
        return new Snapshot<>(copy(root), size, height(root), validate().valid());
    }

    private NodeData<K, V> copy(Node<K, V> node) {
        if (node == null) {
            return null;
        }
        return new NodeData<>(
                node.key,
                node.value,
                node.height,
                node.balanceFactor,
                copy(node.left),
                copy(node.right)
        );
    }

    public ValidationResult validate() {
        List<String> errors = new ArrayList<>();
        int[] checked = {0};
        validateNode(root, null, null, errors, checked);
        if (root != null && root.parent != null) {
            errors.add("Root parent pointer must be null.");
        }
        return new ValidationResult(errors.isEmpty(), checked[0], List.copyOf(errors));
    }

    private int validateNode(
            Node<K, V> node,
            K lowerBound,
            K upperBound,
            List<String> errors,
            int[] checked
    ) {
        if (node == null) {
            return 0;
        }
        checked[0]++;

        if (lowerBound != null && comparator.compare(node.key, lowerBound) <= 0) {
            errors.add("BST violation at key " + node.key + " (lower bound).");
        }
        if (upperBound != null && comparator.compare(node.key, upperBound) >= 0) {
            errors.add("BST violation at key " + node.key + " (upper bound).");
        }
        if (node.left != null && node.left.parent != node) {
            errors.add("Broken parent pointer at left child of " + node.key + ".");
        }
        if (node.right != null && node.right.parent != node) {
            errors.add("Broken parent pointer at right child of " + node.key + ".");
        }

        int leftHeight = validateNode(node.left, lowerBound, node.key, errors, checked);
        int rightHeight = validateNode(node.right, node.key, upperBound, errors, checked);
        int expectedHeight = 1 + Math.max(leftHeight, rightHeight);
        int expectedBalance = leftHeight - rightHeight;

        if (node.height != expectedHeight) {
            errors.add("Incorrect height at key " + node.key + ".");
        }
        if (node.balanceFactor != expectedBalance) {
            errors.add("Incorrect balance factor at key " + node.key + ".");
        }
        if (Math.abs(expectedBalance) > 1) {
            errors.add("Balance factor outside [-1, 1] at key " + node.key + ".");
        }
        return expectedHeight;
    }

    public void clear() {
        root = null;
        size = 0;
    }
}
