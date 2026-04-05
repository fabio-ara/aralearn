import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ELK from "elkjs/lib/elk.bundled.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(__dirname, "../../modules/flowchart-layout.js");

const layoutConfig = {
  columns: 3,
  cellWidth: 104,
  cellHeight: 98,
  gapX: 12,
  gapY: 18,
  shapeWidth: 80,
  shapeHeight: 48,
  textWidth: 96,
  textHeight: 84,
  textTop: 56,
  boardPaddingX: 32,
  boardPaddingY: 24,
  routeStep: 10,
  routePortOffset: 18,
  routeTurnPenalty: 4,
  routeReusePenalty: 3
};

function normalizeFlowchartLink(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: String(raw.id || `${raw.fromNodeId}-${raw.toNodeId}-${raw.outputSlot || 0}`),
    fromNodeId: String(raw.fromNodeId || ""),
    toNodeId: String(raw.toNodeId || ""),
    outputSlot: raw.outputSlot === 1 ? 1 : 0,
    label: String(raw.label || "")
  };
}

function getFlowchartSortedNodes(nodes) {
  return Array.isArray(nodes) ? nodes.slice() : [];
}

function getFlowchartNodeMap(nodes) {
  return (Array.isArray(nodes) ? nodes : []).reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});
}

function getFlowchartNodeOutputLinks(links, nodeId) {
  const slots = [null, null];
  (Array.isArray(links) ? links : []).map(normalizeFlowchartLink).forEach((link) => {
    if (!link || link.fromNodeId !== nodeId || !link.toNodeId) return;
    if (!slots[link.outputSlot]) slots[link.outputSlot] = link;
  });
  return slots;
}

function normalizeFlowchartShapeKey(value) {
  const allowed = new Set([
    "terminal",
    "process",
    "input_output",
    "keyboard_input",
    "screen_output",
    "printed_output",
    "decision",
    "loop",
    "connector",
    "page_connector"
  ]);
  const key = String(value || "").toLowerCase();
  return allowed.has(key) ? key : "process";
}

function getFlowchartDefaultOutputLabel(node, slot) {
  return node && normalizeFlowchartShapeKey(node.shape) === "decision"
    ? (slot === 0 ? "Não" : slot === 1 ? "Sim" : "")
    : "";
}

async function createEngine() {
  globalThis.window = globalThis;
  globalThis.ELK = ELK;
  const code = await fs.readFile(modulePath, "utf8");
  vm.runInThisContext(code, { filename: modulePath });
  const browserModule = globalThis;
  return browserModule.AraLearnFlowchartLayout.createFlowchartLayoutEngine({
    layoutConfig,
    getFlowchartSortedNodes,
    getFlowchartNodeMap,
    normalizeFlowchartLink,
    isFlowchartLinkAllowed: (link, nodeMap) => !!(nodeMap[link.fromNodeId] && nodeMap[link.toNodeId] && link.fromNodeId !== link.toNodeId),
    getFlowchartNodeOutputLinks,
    normalizeFlowchartShapeKey,
    getFlowchartDefaultOutputLabel
  });
}

function getNodeEnvelope(pos) {
  return {
    left: Math.min(pos.shapeLeft, pos.textLeft),
    top: pos.shapeTop,
    right: Math.max(pos.shapeLeft + layoutConfig.shapeWidth, pos.textLeft + layoutConfig.textWidth),
    bottom: pos.textTop + layoutConfig.textHeight
  };
}

function segmentCrossesEnvelope(start, end, rect) {
  if (start[0] === end[0]) {
    const x = start[0];
    if (!(x > rect.left && x < rect.right)) return false;
    const minY = Math.min(start[1], end[1]);
    const maxY = Math.max(start[1], end[1]);
    return Math.max(minY, rect.top) < Math.min(maxY, rect.bottom);
  }

  if (start[1] === end[1]) {
    const y = start[1];
    if (!(y > rect.top && y < rect.bottom)) return false;
    const minX = Math.min(start[0], end[0]);
    const maxX = Math.max(start[0], end[0]);
    return Math.max(minX, rect.left) < Math.min(maxX, rect.right);
  }

  return true;
}

function assertRoutesAvoidNonEndpointNodes(routedLinks, layout) {
  routedLinks.forEach((route) => {
    Object.keys(layout.positions).forEach((nodeId) => {
      if (nodeId === route.link.fromNodeId || nodeId === route.link.toNodeId) return;
      const rect = getNodeEnvelope(layout.positions[nodeId]);
      for (let index = 1; index < route.points.length; index += 1) {
        assert.ok(
          !segmentCrossesEnvelope(route.points[index - 1], route.points[index], rect),
          `rota ${route.link.id} passou pelo envelope de ${nodeId}`
        );
      }
    });
  });
}

test("layout mantém todos os segmentos ortogonais em um fluxo com decisão e convergência", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "decision", shape: "decision" },
    { id: "left", shape: "process" },
    { id: "right", shape: "process" },
    { id: "end", shape: "terminal" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "decision", outputSlot: 0 },
    { id: "l2", fromNodeId: "decision", toNodeId: "left", outputSlot: 0, label: "Não" },
    { id: "l3", fromNodeId: "decision", toNodeId: "right", outputSlot: 1, label: "Sim" },
    { id: "l4", fromNodeId: "left", toNodeId: "end", outputSlot: 0 },
    { id: "l5", fromNodeId: "right", toNodeId: "end", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);

  routedLinks.forEach((route) => {
    for (let index = 1; index < route.points.length; index += 1) {
      const prev = route.points[index - 1];
      const current = route.points[index];
      assert.ok(
        prev[0] === current[0] || prev[1] === current[1],
        `segmento diagonal encontrado em ${route.link.id}: ${JSON.stringify(prev)} -> ${JSON.stringify(current)}`
      );
    }
  });
});

test("saídas laterais simples de decisão usam caminho ortogonal direto quando não há obstáculo", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "decision", shape: "decision" },
    { id: "left", shape: "process" },
    { id: "right", shape: "process" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "decision", outputSlot: 0 },
    { id: "l2", fromNodeId: "decision", toNodeId: "left", outputSlot: 0, label: "Não" },
    { id: "l3", fromNodeId: "decision", toNodeId: "right", outputSlot: 1, label: "Sim" }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);
  const branchRoutes = routedLinks.filter((route) => route.link.fromNodeId === "decision");

  assert.equal(branchRoutes.length, 2);
  branchRoutes.forEach((route) => {
    assert.ok(
      route.points.length <= 3,
      `rota ${route.link.id} criou dobras extras desnecessárias: ${JSON.stringify(route.points)}`
    );
  });
});

test("duas saídas de retorno do mesmo bloco partem por lados diferentes", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "n1", shape: "terminal" },
    { id: "n2", shape: "process" },
    { id: "n3", shape: "decision" }
  ];
  const links = [
    { id: "l1", fromNodeId: "n1", toNodeId: "n2", outputSlot: 0 },
    { id: "l2", fromNodeId: "n2", toNodeId: "n3", outputSlot: 0 },
    { id: "l3", fromNodeId: "n3", toNodeId: "n1", outputSlot: 0, label: "Não" },
    { id: "l4", fromNodeId: "n3", toNodeId: "n2", outputSlot: 1, label: "Sim" }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);
  const backEdges = routedLinks.filter((route) => route.link.fromNodeId === "n3" && route.link.toNodeId !== "n3");

  assert.equal(backEdges.length, 2);
  assert.notEqual(backEdges[0].points[1][0], backEdges[1].points[1][0], "os retornos saíram pelo mesmo lado");
});

test("convergência para o mesmo destino compartilha tronco final", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "decision", shape: "decision" },
    { id: "left", shape: "process" },
    { id: "right", shape: "process" },
    { id: "merge", shape: "process" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "decision", outputSlot: 0 },
    { id: "l2", fromNodeId: "decision", toNodeId: "left", outputSlot: 0 },
    { id: "l3", fromNodeId: "decision", toNodeId: "right", outputSlot: 1 },
    { id: "l4", fromNodeId: "left", toNodeId: "merge", outputSlot: 0 },
    { id: "l5", fromNodeId: "right", toNodeId: "merge", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);
  const incoming = routedLinks.filter((route) => route.link.toNodeId === "merge");

  assert.equal(incoming.length, 2);
  assert.deepEqual(
    incoming[0].points[incoming[0].points.length - 2],
    incoming[1].points[incoming[1].points.length - 2],
    "as rotas não convergiram no mesmo tronco imediatamente antes do destino"
  );
});

test("rotas desviam dos envelopes de blocos intermediários", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "decision", shape: "decision" },
    { id: "left", shape: "process" },
    { id: "right", shape: "process" },
    { id: "merge", shape: "process" },
    { id: "end", shape: "terminal" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "decision", outputSlot: 0 },
    { id: "l2", fromNodeId: "decision", toNodeId: "left", outputSlot: 0, label: "Não" },
    { id: "l3", fromNodeId: "decision", toNodeId: "right", outputSlot: 1, label: "Sim" },
    { id: "l4", fromNodeId: "left", toNodeId: "merge", outputSlot: 0 },
    { id: "l5", fromNodeId: "right", toNodeId: "merge", outputSlot: 0 },
    { id: "l6", fromNodeId: "merge", toNodeId: "end", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);

  assertRoutesAvoidNonEndpointNodes(routedLinks, layout);
});

test("convergência de pais em níveis diferentes ainda compartilha um barramento comum", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "left", shape: "process" },
    { id: "mid", shape: "process" },
    { id: "right", shape: "process" },
    { id: "merge", shape: "process" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "left", outputSlot: 0 },
    { id: "l2", fromNodeId: "left", toNodeId: "mid", outputSlot: 0 },
    { id: "l3", fromNodeId: "start", toNodeId: "right", outputSlot: 0 },
    { id: "l4", fromNodeId: "mid", toNodeId: "merge", outputSlot: 0 },
    { id: "l5", fromNodeId: "right", toNodeId: "merge", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);
  const incoming = routedLinks.filter((route) => route.link.toNodeId === "merge");

  assert.equal(incoming.length, 2);
  const sharedVerticalX = incoming.map((route) => route.points[route.points.length - 1][0]);
  assert.equal(sharedVerticalX[0], sharedVerticalX[1]);
  assert.ok(
    incoming.every((route) => route.points.some((point) => point[0] === sharedVerticalX[0])),
    "as rotas não utilizaram o mesmo barramento vertical para convergir"
  );
});

test("laço de repetição contorna os blocos por fora da coluna principal", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "read", shape: "keyboard_input" },
    { id: "check", shape: "decision" },
    { id: "process", shape: "process" },
    { id: "end", shape: "terminal" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "read", outputSlot: 0 },
    { id: "l2", fromNodeId: "read", toNodeId: "check", outputSlot: 0 },
    { id: "l3", fromNodeId: "check", toNodeId: "process", outputSlot: 0, label: "Não" },
    { id: "l4", fromNodeId: "check", toNodeId: "end", outputSlot: 1, label: "Sim" },
    { id: "l5", fromNodeId: "process", toNodeId: "check", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const routedLinks = engine.buildFlowchartLinkRenderData(links, getFlowchartNodeMap(nodes), layout);
  const backRoute = routedLinks.find((route) => route.link.id === "l5");

  assert.ok(backRoute, "rota de laço não encontrada");
  const minShapeLeft = Math.min(
    layout.positions.start.shapeLeft,
    layout.positions.read.shapeLeft,
    layout.positions.check.shapeLeft,
    layout.positions.process.shapeLeft
  );
  const maxShapeRight = Math.max(
    layout.positions.start.shapeLeft + layoutConfig.shapeWidth,
    layout.positions.read.shapeLeft + layoutConfig.shapeWidth,
    layout.positions.check.shapeLeft + layoutConfig.shapeWidth,
    layout.positions.process.shapeLeft + layoutConfig.shapeWidth
  );

  const outerPoints = backRoute.points.slice(1, -1);
  assert.ok(
    outerPoints.some((point) => point[0] < minShapeLeft || point[0] > maxShapeRight),
    "o laço não saiu para fora da coluna principal"
  );
  const loopReentry = backRoute.points[backRoute.points.length - 1];
  assert.equal(loopReentry[1], layout.positions.check.shapeTop, "o retorno do laço não reentrou pelo topo da decisão");
  assert.ok(
    Math.abs(loopReentry[0] - layout.positions.check.centerX) <= 6,
    "o retorno do laço ficou deslocado demais ao reentrar pelo topo da decisão"
  );
});

test("cascata de decisões empurra a próxima decisão para o ramo lateral correto", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "read", shape: "keyboard_input" },
    { id: "check1", shape: "decision" },
    { id: "out1", shape: "screen_output" },
    { id: "check2", shape: "decision" },
    { id: "out2", shape: "screen_output" },
    { id: "out3", shape: "screen_output" },
    { id: "end", shape: "terminal" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "read", outputSlot: 0 },
    { id: "l2", fromNodeId: "read", toNodeId: "check1", outputSlot: 0 },
    { id: "l3", fromNodeId: "check1", toNodeId: "out1", outputSlot: 0, label: "Não" },
    { id: "l4", fromNodeId: "check1", toNodeId: "check2", outputSlot: 1, label: "Sim" },
    { id: "l5", fromNodeId: "out1", toNodeId: "end", outputSlot: 0 },
    { id: "l6", fromNodeId: "check2", toNodeId: "out2", outputSlot: 0, label: "Não" },
    { id: "l7", fromNodeId: "check2", toNodeId: "out3", outputSlot: 1, label: "Sim" },
    { id: "l8", fromNodeId: "out2", toNodeId: "end", outputSlot: 0 },
    { id: "l9", fromNodeId: "out3", toNodeId: "end", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);

  assert.ok(
    layout.positions.check2.centerX > layout.positions.check1.centerX + 40,
    "a segunda decisão não foi deslocada para o ramo lateral"
  );
  assert.ok(
    layout.positions.out1.centerX < layout.positions.check1.centerX,
    "o ramo negativo da primeira decisão não ficou à esquerda como esperado"
  );
});

test("convergência final fica aproximadamente centrada entre os ramos", async () => {
  const engine = await createEngine();
  const nodes = [
    { id: "start", shape: "terminal" },
    { id: "check", shape: "decision" },
    { id: "left", shape: "screen_output" },
    { id: "right", shape: "screen_output" },
    { id: "end", shape: "terminal" }
  ];
  const links = [
    { id: "l1", fromNodeId: "start", toNodeId: "check", outputSlot: 0 },
    { id: "l2", fromNodeId: "check", toNodeId: "left", outputSlot: 0, label: "Não" },
    { id: "l3", fromNodeId: "check", toNodeId: "right", outputSlot: 1, label: "Sim" },
    { id: "l4", fromNodeId: "left", toNodeId: "end", outputSlot: 0 },
    { id: "l5", fromNodeId: "right", toNodeId: "end", outputSlot: 0 }
  ];

  const layout = await engine.computeFlowchartBoardLayout(nodes, links);
  const desiredCenter = (layout.positions.left.centerX + layout.positions.right.centerX) / 2;

  assert.ok(
    Math.abs(layout.positions.end.centerX - desiredCenter) <= 48,
    "o nó de convergência ficou deslocado demais em relação aos ramos"
  );
});
