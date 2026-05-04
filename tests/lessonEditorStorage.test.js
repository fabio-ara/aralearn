import test from "node:test";
import assert from "node:assert/strict";

import {
  readCommentStorage,
  readHistoryStorage,
  writeCommentStorage,
  writeHistoryStorage
} from "../src/ui/lessonEditorStorage.js";

function createMemoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    }
  };
}

test("lessonEditorStorage le e grava mapas auxiliares", () => {
  const storage = createMemoryStorage();

  writeHistoryStorage({ a: [{ id: "1" }] }, storage);
  writeCommentStorage({ b: "nota" }, storage);

  assert.deepEqual(readHistoryStorage(storage), { a: [{ id: "1" }] });
  assert.deepEqual(readCommentStorage(storage), { b: "nota" });
});

test("lessonEditorStorage tolera storage ausente ou JSON invalido", () => {
  assert.deepEqual(readHistoryStorage(null), {});
  assert.deepEqual(readCommentStorage({ getItem: () => "{" }), {});
});
