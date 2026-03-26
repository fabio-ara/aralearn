import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadBrowserModule } from "../helpers/load-browser-module.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(__dirname, "../../modules/code-input.js");

test("code input normaliza variantes preservando regex e linhas vazias durante a autoria", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnCodeInput;

  const variants = helpers.normalizeVariants([
    { id: "alt-1", value: "print(4/2)", regex: false },
    { value: "", regex: true }
  ]);

  assert.equal(JSON.stringify(variants), JSON.stringify([
    { id: "alt-1", value: "print(4/2)", regex: false },
    { id: "variant-1", value: "", regex: true }
  ]));
});

test("code input valida lacunas digitadas com normalização genérica de espaços", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnCodeInput;

  const result = helpers.validateTypedAttempt({
    slots: ["4 / 2"],
    matchersBySlot: [[{ value: "4/2", regex: false }]]
  });

  assert.equal(result.status, "correct");
});

test("code input aceita variantes literais por lacuna", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnCodeInput;

  const result = helpers.validateTypedAttempt({
    slots: ["1 + 1"],
    matchersBySlot: [[
      { value: "4/2", regex: false },
      { value: "1 + 1", regex: false }
    ]]
  });

  assert.equal(result.status, "correct");
});

test("code input aceita regex por lacuna quando a regra explicita isso", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnCodeInput;

  const result = helpers.validateTypedAttempt({
    slots: ["4 / 2"],
    matchersBySlot: [[{ value: "4\\s*/\\s*2", regex: true }]]
  });

  assert.equal(result.status, "correct");
});

test("code input marca como incompleto quando ainda falta digitação", async () => {
  const browserModule = await loadBrowserModule(modulePath);
  const helpers = browserModule.AraLearnCodeInput;

  const result = helpers.validateTypedAttempt({
    slots: [""],
    matchersBySlot: [[{ value: "4/2", regex: false }]]
  });

  assert.equal(result.status, "incomplete");
});
