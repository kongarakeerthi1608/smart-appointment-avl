package com.smartclinic.appointments.avl;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class AvlTreeTest {

    private AvlTree<Integer, String> tree() {
        return new AvlTree<>(Integer::compareTo);
    }

    @Test
    void triggersLlRotation() {
        AvlTree<Integer, String> tree = tree();

        tree.insert(30, "thirty");
        tree.insert(20, "twenty");
        AvlTree.InsertResult<Integer, String> result = tree.insert(10, "ten");

        assertThat(tree.rootKey()).isEqualTo(20);
        assertThat(result.rotations()).hasSize(1);
        assertThat(result.rotations().get(0).caseType()).isEqualTo(AvlTree.RotationType.LL);
        assertThat(tree.height()).isEqualTo(2);
        assertThat(tree.inOrder()).containsExactly("ten", "twenty", "thirty");
        assertThat(tree.validate().valid()).isTrue();
    }

    @Test
    void triggersRrRotation() {
        AvlTree<Integer, String> tree = tree();

        tree.insert(10, "ten");
        tree.insert(20, "twenty");
        AvlTree.InsertResult<Integer, String> result = tree.insert(30, "thirty");

        assertThat(tree.rootKey()).isEqualTo(20);
        assertThat(result.rotations()).hasSize(1);
        assertThat(result.rotations().get(0).caseType()).isEqualTo(AvlTree.RotationType.RR);
        assertThat(tree.height()).isEqualTo(2);
        assertThat(tree.inOrder()).containsExactly("ten", "twenty", "thirty");
        assertThat(tree.validate().valid()).isTrue();
    }

    @Test
    void triggersLrDoubleRotation() {
        AvlTree<Integer, String> tree = tree();

        tree.insert(30, "thirty");
        tree.insert(10, "ten");
        AvlTree.InsertResult<Integer, String> result = tree.insert(20, "twenty");

        assertThat(tree.rootKey()).isEqualTo(20);
        assertThat(result.rotations()).hasSize(2);
        assertThat(result.rotations()).allMatch(r -> r.caseType() == AvlTree.RotationType.LR);
        assertThat(tree.inOrder()).containsExactly("ten", "twenty", "thirty");
        assertThat(tree.validate().valid()).isTrue();
    }

    @Test
    void triggersRlDoubleRotation() {
        AvlTree<Integer, String> tree = tree();

        tree.insert(10, "ten");
        tree.insert(30, "thirty");
        AvlTree.InsertResult<Integer, String> result = tree.insert(20, "twenty");

        assertThat(tree.rootKey()).isEqualTo(20);
        assertThat(result.rotations()).hasSize(2);
        assertThat(result.rotations()).allMatch(r -> r.caseType() == AvlTree.RotationType.RL);
        assertThat(tree.inOrder()).containsExactly("ten", "twenty", "thirty");
        assertThat(tree.validate().valid()).isTrue();
    }

    @Test
    void searchesExistingAndMissingKeys() {
        AvlTree<Integer, String> tree = tree();
        for (int value : new int[]{50, 25, 75, 10, 35, 60, 90}) {
            tree.insert(value, "v" + value);
        }

        AvlTree.SearchResult<Integer, String> found = tree.search(35);
        assertThat(found.found()).isTrue();
        assertThat(found.value()).isEqualTo("v35");
        assertThat(found.path()).containsExactly(50, 25, 35);

        AvlTree.SearchResult<Integer, String> missing = tree.search(99);
        assertThat(missing.found()).isFalse();
        assertThat(missing.path()).containsExactly(50, 75, 90);
    }

    @Test
    void deletesNodesAndRebalances() {
        AvlTree<Integer, String> tree = tree();
        for (int value : new int[]{9, 5, 10, 0, 6, 11, -1, 1, 2}) {
            tree.insert(value, "v" + value);
        }

        AvlTree.DeleteResult<Integer, String> deleted = tree.delete(10);

        assertThat(deleted.deleted()).isTrue();
        assertThat(deleted.value()).isEqualTo("v10");
        assertThat(tree.search(10).found()).isFalse();
        assertThat(tree.validate().valid()).isTrue();
        assertThat(tree.size()).isEqualTo(8);
        assertThat(tree.inOrder()).doesNotContain("v10");
    }

    @Test
    void remainsValidAfterManyRandomInsertionsAndDeletions() {
        AvlTree<Integer, String> tree = tree();
        List<Integer> reference = new ArrayList<>();
        Random random = new Random(42);

        for (int i = 0; i < 300; i++) {
            int key = random.nextInt(2_000);
            if (reference.contains(key)) {
                continue;
            }
            tree.insert(key, "v" + key);
            reference.add(key);
            assertThat(tree.validate().valid()).isTrue();
        }

        assertThat(tree.size()).isEqualTo(reference.size());
        assertThat(tree.height()).isLessThanOrEqualTo(
                (int) Math.ceil(1.45 * (Math.log(reference.size() + 2) / Math.log(2)))
        );

        Collections.shuffle(reference, random);
        for (int i = 0; i < 120; i++) {
            int key = reference.remove(reference.size() - 1);
            assertThat(tree.delete(key).deleted()).isTrue();
            assertThat(tree.validate().valid()).isTrue();
        }

        List<Integer> expected = new ArrayList<>(reference);
        Collections.sort(expected);
        List<Integer> actualKeys = tree.inOrder().stream().map(value -> Integer.parseInt(value.substring(1))).toList();
        assertThat(actualKeys).containsExactlyElementsOf(expected);
        assertThat(tree.validate().valid()).isTrue();
    }

    @Test
    void rangeQueryUsesChronologicalOrder() {
        AvlTree<Integer, String> tree = tree();
        for (int value : new int[]{50, 25, 75, 10, 35, 60, 90}) {
            tree.insert(value, "v" + value);
        }

        assertThat(tree.valuesBetween(25, 61)).containsExactly("v25", "v35", "v50", "v60");
        assertThat(tree.ceilingKey(31)).isEqualTo(35);
        assertThat(tree.ceilingKey(91)).isNull();
    }

    @Test
    void duplicateInsertIsRejectedWithoutChangingTree() {
        AvlTree<Integer, String> tree = tree();
        tree.insert(10, "first");
        AvlTree.InsertResult<Integer, String> duplicate = tree.insert(10, "second");

        assertThat(duplicate.inserted()).isFalse();
        assertThat(tree.size()).isEqualTo(1);
        assertThat(tree.search(10).value()).isEqualTo("first");
        assertThat(tree.validate().valid()).isTrue();
    }
}
