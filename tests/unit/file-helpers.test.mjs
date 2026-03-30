import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import { loadBrowserModule } from "../helpers/load-browser-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(__dirname, "../../modules/file-helpers.js");
const vendorPath = path.resolve(__dirname, "../../modules/vendor/fflate.js");

test("file helpers create and parse ZIP archives without losing UTF-8 content", async () => {
  const browserModule = await loadBrowserModule(modulePath, [vendorPath]);
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

test("file helpers parse ZIP archives compressed with DEFLATE", async () => {
  const browserModule = await loadBrowserModule(modulePath, [vendorPath]);
  const helpers = browserModule.AraLearnFileHelpers.createFileHelpers();

  const svgText =
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\">" +
    "<rect width=\"8\" height=\"8\" fill=\"#f5c96a\"/>" +
    "</svg>";
  const projectText = JSON.stringify({
    packageMeta: {
      format: "aralearn-package-v3",
      scope: "course",
      exportedAt: "2026-03-29T00:00:00.000Z",
      appTitle: "AraLearn"
    },
    course: {
      id: "curso-deflate",
      title: "Curso deflate",
      description: "",
      modules: []
    },
    progress: { lessons: [] },
    assets: ["assets/images/hero.svg"]
  });

  const zipBytes = zipSync({
    "project.json": strToU8(projectText),
    "assets/images/hero.svg": strToU8(svgText)
  }, { level: 6 });

  const entries = helpers.parseZip(zipBytes);
  const byPath = Object.fromEntries(entries.map((entry) => [entry.path, entry]));

  assert.ok(byPath["project.json"]);
  assert.equal(helpers.utf8Decode(byPath["project.json"].bytes), projectText);
  assert.equal(helpers.utf8Decode(byPath["assets/images/hero.svg"].bytes), svgText);
});

test("file helpers preserve multiline editor payloads exactly through project.json ZIP round-trip", async () => {
  const browserModule = await loadBrowserModule(modulePath, [vendorPath]);
  const helpers = browserModule.AraLearnFileHelpers.createFileHelpers();

  const caseA = "<header>\n  <h1>Comandos Linux</h1>\n</header>\n<main id=\"app\"></main>";
  const caseB = "function saudacao() {\n\n  console.log(\"Olá\");\n}";
  const caseC = "<header>\n  [[<h1>Comandos Linux</h1>]]\n</header>\n<main id=\"app\"></main>";
  const payload = {
    lesson: {
      id: "lesson-multiline-contract",
      title: "Contrato multiline",
      subtitle: "",
      steps: [
        {
          id: "step-multiline-contract",
          type: "content",
          title: "Contrato multiline",
          blocks: [
            { id: "editor-a", kind: "editor", value: caseA, options: [], interactionMode: "choice" },
            { id: "editor-b", kind: "editor", value: caseB, options: [], interactionMode: "choice" },
            {
              id: "editor-c",
              kind: "editor",
              value: caseC,
              interactionMode: "choice",
              options: [
                {
                  id: "opt-editor-c",
                  value: "<h1>Comandos Linux</h1>",
                  enabled: true,
                  displayOrder: 0,
                  slotOrder: 0
                }
              ]
            },
            { id: "button-final", kind: "button", popupEnabled: false, popupBlocks: [] }
          ]
        }
      ]
    },
    progress: { lessons: [] },
    assets: [],
    packageMeta: {
      format: "aralearn-package-v3",
      scope: "lesson",
      exportedAt: "2026-03-29T00:00:00.000Z",
      appTitle: "AraLearn"
    }
  };
  const originalText = JSON.stringify(payload, null, 2);

  const zipBytes = helpers.createZip([
    { path: "project.json", bytes: helpers.utf8Encode(originalText) }
  ]);

  const entries = helpers.parseZip(zipBytes);
  const projectEntry = entries.find((entry) => entry.path === "project.json");
  assert.ok(projectEntry);

  const roundTrippedText = helpers.utf8Decode(projectEntry.bytes);
  assert.equal(roundTrippedText, originalText);

  const parsedPayload = JSON.parse(roundTrippedText);
  const blocks = parsedPayload.lesson.steps[0].blocks;
  assert.equal(blocks.find((block) => block.id === "editor-a").value, caseA);
  assert.equal(blocks.find((block) => block.id === "editor-b").value, caseB);
  assert.equal(blocks.find((block) => block.id === "editor-c").value, caseC);
  assert.equal(blocks.find((block) => block.id === "editor-c").options[0].value, "<h1>Comandos Linux</h1>");
});

test("file helpers convert SVG data URLs with ;utf8 metadata into bytes", async () => {
  const browserModule = await loadBrowserModule(modulePath, [vendorPath]);
  const helpers = browserModule.AraLearnFileHelpers.createFileHelpers();

  const dataUrl =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'>" +
    "<rect width='8' height='8' fill='%23f5c96a'/></svg>";

  const parsed = helpers.dataUrlToBytes(dataUrl);
  assert.ok(parsed);
  assert.equal(parsed.mime, "image/svg+xml");
  assert.equal(helpers.utf8Decode(parsed.bytes), "<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><rect width='8' height='8' fill='#f5c96a'/></svg>");
});
