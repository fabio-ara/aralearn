import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrowserModule } from "../helpers/load-browser-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(__dirname, "../../modules/file-helpers.js");

test("file helpers create and parse ZIP archives without losing UTF-8 content", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnFileHelpers.createFileHelpers();

  const originalText = JSON.stringify({
    title: "Lição com acentuação",
    subtitle: "Módulo e curso"
  });

  const zipBytes = helpers.createZip([
    { path: "project.json", bytes: helpers.utf8Encode(originalText) },
    { path: "assets/images/icone.png", bytes: new Uint8Array([137, 80, 78, 71]) }
  ]);

  const entries = helpers.parseZip(zipBytes);
  const byPath = Object.fromEntries(entries.map((entry) => [entry.path, entry]));

  assert.ok(byPath["project.json"]);
  assert.equal(helpers.utf8Decode(byPath["project.json"].bytes), originalText);
  assert.deepEqual(Array.from(byPath["assets/images/icone.png"].bytes), [137, 80, 78, 71]);
});
