import fs from "node:fs/promises";
import vm from "node:vm";

function createBaseContext() {
  const atob = (value) => Buffer.from(String(value), "base64").toString("binary");
  const btoa = (value) => Buffer.from(String(value), "binary").toString("base64");

  const context = {
    console,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    DataView,
    Blob,
    atob,
    btoa,
    setTimeout,
    clearTimeout
  };

  context.window = context;
  context.self = context;
  context.globalThis = context;
  return context;
}

export async function loadBrowserModule(modulePath, preloadPaths = [], injectedGlobals = {}) {
  const context = createBaseContext();
  Object.assign(context, injectedGlobals);
  vm.createContext(context);

  for (const preloadPath of preloadPaths) {
    const preloadCode = await fs.readFile(preloadPath, "utf8");
    vm.runInContext(preloadCode, context, { filename: preloadPath });
  }

  const code = await fs.readFile(modulePath, "utf8");
  vm.runInContext(code, context, { filename: modulePath });
  return context.window;
}
