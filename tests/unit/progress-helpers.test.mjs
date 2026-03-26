import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrowserModule } from "../helpers/load-browser-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(__dirname, "../../modules/progress-helpers.js");

test("progress helpers preserve zero-based index hints from imported arrays", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnProgressHelpers.createProgressHelpers({
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
  });

  const imported = helpers.normalizeImportedProgress({
    lessons: [
      {
        courseId: "curso-1",
        moduleId: "mod-1",
        lessonId: "licao-1",
        currentStepId: "step-b",
        currentIndexHint: 1,
        furthestStepId: "step-c",
        furthestIndexHint: 2,
        updatedAt: "2026-03-19T00:00:00.000Z"
      }
    ]
  });

  const record = imported.lessons["curso-1::mod-1::licao-1"];
  assert.ok(record);
  assert.equal(record.currentIndexHint, 1);
  assert.equal(record.furthestIndexHint, 2);
});

test("resolveProgressIndex uses zero-based hints when the step id no longer exists", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnProgressHelpers.createProgressHelpers({
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
  });

  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const index = helpers.resolveProgressIndex(steps, "missing-step", 1, 0);
  assert.equal(index, 1);
});
