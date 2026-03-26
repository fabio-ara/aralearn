(function (global) {
  "use strict";

  function createFlowchartLayoutEngine(deps) {
    const FLOWCHART_LAYOUT = deps.layoutConfig;
    const getFlowchartSortedNodes = deps.getFlowchartSortedNodes;
    const getFlowchartNodeMap = deps.getFlowchartNodeMap;
    const normalizeFlowchartLink = deps.normalizeFlowchartLink;
    const isFlowchartLinkAllowed = deps.isFlowchartLinkAllowed;
    const getFlowchartNodeOutputLinks = deps.getFlowchartNodeOutputLinks;
    const normalizeFlowchartShapeKey = deps.normalizeFlowchartShapeKey;
    const getFlowchartDefaultOutputLabel = deps.getFlowchartDefaultOutputLabel;
    const ElkConstructor = global.ELK || null;

    let elk = null;
    if (typeof ElkConstructor === "function") {
      try {
        elk = new ElkConstructor();
      } catch (error) {
        elk = null;
      }
    }

    function snapRouteValue(value) {
      const step = Math.max(1, Number(FLOWCHART_LAYOUT.routeStep) || 1);
      return Math.round(Number(value || 0) / step) * step;
    }

    function simplifyFlowchartPolyline(points) {
      const compact = [];

      (Array.isArray(points) ? points : []).forEach(function (point) {
        if (!point) return;
        const x = snapRouteValue(point[0]);
        const y = snapRouteValue(point[1]);
        const last = compact[compact.length - 1];
        if (last && last[0] === x && last[1] === y) return;
        compact.push([x, y]);
      });

      if (compact.length < 3) return compact;

      const simplified = [compact[0]];
      for (let index = 1; index < compact.length - 1; index += 1) {
        const prev = simplified[simplified.length - 1];
        const current = compact[index];
        const next = compact[index + 1];
        const sameX = prev[0] === current[0] && current[0] === next[0];
        const sameY = prev[1] === current[1] && current[1] === next[1];
        if (!sameX && !sameY) simplified.push(current);
      }
      simplified.push(compact[compact.length - 1]);
      return simplified;
    }

    function cloneRoutePoints(points) {
      return (Array.isArray(points) ? points : []).map(function (point) {
        return [Number(point[0] || 0), Number(point[1] || 0)];
      });
    }

    function cloneFlowchartRoute(route) {
      return {
        link: route.link,
        points: cloneRoutePoints(route.points),
        label: route.label,
        labelPos: route.labelPos
          ? {
              x: route.labelPos.x,
              y: route.labelPos.y,
              anchor: route.labelPos.anchor
            }
          : null
      };
    }

    function shiftFlowchartRoute(route, shiftX, shiftY) {
      route.points = route.points.map(function (point) {
        return [point[0] + shiftX, point[1] + shiftY];
      });
      if (route.labelPos) {
        route.labelPos.x += shiftX;
        route.labelPos.y += shiftY;
      }
      return route;
    }

    function getFlowchartLinkLabelPosition(route) {
      if (!route || !Array.isArray(route.points) || route.points.length < 2) return null;

      const start = route.points[0];
      const next = route.points[1];
      const horizontal = start[1] === next[1];
      const midX = Math.round((start[0] + next[0]) / 2);
      const midY = Math.round((start[1] + next[1]) / 2);

      if (route.isBackEdge) {
        const offset = route.startSide === "right" ? 18 : -18;
        return {
          x: start[0] + offset,
          y: start[1] - 12,
          anchor: route.startSide === "right" ? "start" : "end"
        };
      }

      if (horizontal) {
        return {
          x: midX,
          y: midY - 8,
          anchor: "middle"
        };
      }

      if (route.startSide === "left" || route.startSide === "right") {
        return {
          x: route.startSide === "right" ? start[0] + 10 : start[0] - 10,
          y: midY,
          anchor: route.startSide === "right" ? "start" : "end"
        };
      }

      return {
        x: midX,
        y: midY - 8,
        anchor: "middle"
      };
    }

    function getFlowchartNodeIndexMap(nodes) {
      return (Array.isArray(nodes) ? nodes : []).reduce(function (acc, node, index) {
        acc[node.id] = index;
        return acc;
      }, {});
    }

    function getFlowchartGraph(nodes, links) {
      const list = getFlowchartSortedNodes(nodes);
      const nodeMap = getFlowchartNodeMap(list);
      const nodeIndexMap = getFlowchartNodeIndexMap(list);
      const linkList = (Array.isArray(links) ? links : [])
        .map(normalizeFlowchartLink)
        .filter(function (link) {
          return link && isFlowchartLinkAllowed(link, nodeMap);
        })
        .sort(function (a, b) {
          const fromDiff = (nodeIndexMap[a.fromNodeId] || 0) - (nodeIndexMap[b.fromNodeId] || 0);
          if (fromDiff) return fromDiff;
          const slotDiff = (a.outputSlot || 0) - (b.outputSlot || 0);
          if (slotDiff) return slotDiff;
          return (nodeIndexMap[a.toNodeId] || 0) - (nodeIndexMap[b.toNodeId] || 0);
        });
      const outgoingByNode = {};
      const incomingByNode = {};
      const backEdgeIds = {};
      const primaryParentLinkByNode = {};

      list.forEach(function (node) {
        outgoingByNode[node.id] = [];
        incomingByNode[node.id] = [];
      });

      linkList.forEach(function (link) {
        outgoingByNode[link.fromNodeId].push(link);
        incomingByNode[link.toNodeId].push(link);
      });

      const roots = list.filter(function (node) {
        return !(incomingByNode[node.id] || []).length;
      }).map(function (node) {
        return node.id;
      });
      if (!roots.length && list.length) roots.push(list[0].id);

      const visited = {};
      const onStack = {};

      function dfs(nodeId) {
        visited[nodeId] = true;
        onStack[nodeId] = true;

        (outgoingByNode[nodeId] || []).forEach(function (link) {
          const targetId = link.toNodeId;
          if (!visited[targetId]) {
            if (!primaryParentLinkByNode[targetId]) primaryParentLinkByNode[targetId] = link;
            dfs(targetId);
            return;
          }

          if (onStack[targetId]) {
            backEdgeIds[link.id] = true;
            return;
          }

          if (!primaryParentLinkByNode[targetId]) {
            primaryParentLinkByNode[targetId] = link;
          }
        });

        onStack[nodeId] = false;
      }

      roots.forEach(function (rootId) {
        if (!visited[rootId]) dfs(rootId);
      });
      list.forEach(function (node) {
        if (!visited[node.id]) dfs(node.id);
      });

      const nonBackLinks = linkList.filter(function (link) {
        return !backEdgeIds[link.id];
      });
      const ranks = {};
      list.forEach(function (node) {
        ranks[node.id] = 0;
      });

      let changed = true;
      let guard = 0;
      while (changed && guard < list.length * Math.max(nonBackLinks.length, 1) + 5) {
        changed = false;
        guard += 1;
        nonBackLinks.forEach(function (link) {
          const nextRank = (ranks[link.fromNodeId] || 0) + 1;
          if (nextRank > (ranks[link.toNodeId] || 0)) {
            ranks[link.toNodeId] = nextRank;
            changed = true;
          }
        });
      }

      const childrenByNode = {};
      list.forEach(function (node) {
        childrenByNode[node.id] = [];
      });
      Object.keys(primaryParentLinkByNode).forEach(function (targetId) {
        const link = primaryParentLinkByNode[targetId];
        if (!link || backEdgeIds[link.id]) return;
        childrenByNode[link.fromNodeId].push(link);
      });
      Object.keys(childrenByNode).forEach(function (nodeId) {
        childrenByNode[nodeId].sort(function (a, b) {
          const slotDiff = (a.outputSlot || 0) - (b.outputSlot || 0);
          if (slotDiff) return slotDiff;
          return (nodeIndexMap[a.toNodeId] || 0) - (nodeIndexMap[b.toNodeId] || 0);
        });
      });

      const treeRoots = list.filter(function (node) {
        return !primaryParentLinkByNode[node.id] || backEdgeIds[primaryParentLinkByNode[node.id].id];
      }).map(function (node) {
        return node.id;
      });
      if (!treeRoots.length && list.length) treeRoots.push(list[0].id);

      return {
        nodes: list,
        nodeMap: nodeMap,
        nodeIndexMap: nodeIndexMap,
        linkList: linkList,
        outgoingByNode: outgoingByNode,
        incomingByNode: incomingByNode,
        backEdgeIds: backEdgeIds,
        nonBackLinks: nonBackLinks,
        ranks: ranks,
        primaryParentLinkByNode: primaryParentLinkByNode,
        childrenByNode: childrenByNode,
        roots: roots,
        treeRoots: treeRoots
      };
    }

    function getGraphChildren(graph, nodeId) {
      return (graph.childrenByNode[nodeId] || []).slice().sort(function (a, b) {
        const slotDiff = (a.outputSlot || 0) - (b.outputSlot || 0);
        if (slotDiff) return slotDiff;
        return (graph.nodeIndexMap[a.toNodeId] || 0) - (graph.nodeIndexMap[b.toNodeId] || 0);
      });
    }

    function normalizeFlowchartSlots(slots) {
      const values = Object.keys(slots).map(function (nodeId) {
        return Number(slots[nodeId] || 0);
      });
      const min = values.length ? Math.min.apply(null, values) : 0;
      Object.keys(slots).forEach(function (nodeId) {
        slots[nodeId] = Number(slots[nodeId] || 0) - min;
      });
      return slots;
    }

    function enforceFlowchartRankSeparation(graph, slots) {
      const byRank = {};
      graph.nodes.forEach(function (node) {
        const rank = graph.ranks[node.id] || 0;
        if (!byRank[rank]) byRank[rank] = [];
        byRank[rank].push(node.id);
      });

      Object.keys(byRank).forEach(function (rankKey) {
        const ids = byRank[rankKey].sort(function (a, b) {
          if (slots[a] !== slots[b]) return slots[a] - slots[b];
          return (graph.nodeIndexMap[a] || 0) - (graph.nodeIndexMap[b] || 0);
        });
        let previousSlot = null;
        ids.forEach(function (id) {
          if (previousSlot === null) {
            previousSlot = slots[id];
            return;
          }
          if (slots[id] < previousSlot + 1) slots[id] = previousSlot + 1;
          previousSlot = slots[id];
        });
      });

      return normalizeFlowchartSlots(slots);
    }

    function relaxFlowchartSlots(graph, baseSlots) {
      const slots = Object.assign({}, baseSlots);
      const orderedByRank = graph.nodes.slice().sort(function (a, b) {
        const rankDiff = (graph.ranks[a.id] || 0) - (graph.ranks[b.id] || 0);
        if (rankDiff) return rankDiff;
        return (graph.nodeIndexMap[a.id] || 0) - (graph.nodeIndexMap[b.id] || 0);
      });
      const reverseByRank = orderedByRank.slice().reverse();

      for (let iteration = 0; iteration < 6; iteration += 1) {
        orderedByRank.forEach(function (node) {
          const incoming = (graph.incomingByNode[node.id] || []).filter(function (link) {
            return !graph.backEdgeIds[link.id];
          });
          if (incoming.length < 2) return;
          const desired = incoming.reduce(function (sum, link) {
            return sum + Number(slots[link.fromNodeId] || 0);
          }, 0) / incoming.length;
          slots[node.id] = desired;
        });

        reverseByRank.forEach(function (node) {
          const children = getGraphChildren(graph, node.id);
          if (!children.length) return;
          const isDecision = normalizeFlowchartShapeKey(node.shape) === "decision";
          if (isDecision && children.length === 2) {
            slots[node.id] = (Number(slots[children[0].toNodeId] || 0) + Number(slots[children[1].toNodeId] || 0)) / 2;
            return;
          }
          if (children.length === 1) {
            const childIncoming = (graph.incomingByNode[children[0].toNodeId] || []).filter(function (link) {
              return !graph.backEdgeIds[link.id];
            });
            if (childIncoming.length <= 1) slots[node.id] = Number(slots[children[0].toNodeId] || 0);
          }
        });

        enforceFlowchartRankSeparation(graph, slots);
      }

      return slots;
    }

    function getFlowchartAutoSlots(graph) {
      const slots = {};
      const widths = {};
      const placed = {};
      const slotGap = 1;

      function getStructuredWidth(nodeId) {
        if (Object.prototype.hasOwnProperty.call(widths, nodeId)) return widths[nodeId];

        const node = graph.nodeMap[nodeId];
        const children = getGraphChildren(graph, nodeId);
        if (!children.length) {
          widths[nodeId] = 1;
          return widths[nodeId];
        }

        const isDecision = node && normalizeFlowchartShapeKey(node.shape) === "decision";
        if (isDecision && children.length === 2) {
          widths[nodeId] =
            getStructuredWidth(children[0].toNodeId) +
            getStructuredWidth(children[1].toNodeId) +
            slotGap;
          return widths[nodeId];
        }

        if (children.length === 1) {
          widths[nodeId] = Math.max(1, getStructuredWidth(children[0].toNodeId));
          return widths[nodeId];
        }

        widths[nodeId] = children.reduce(function (sum, link, index) {
          return sum + getStructuredWidth(link.toNodeId) + (index ? slotGap : 0);
        }, 0);
        return widths[nodeId];
      }

      function placeNode(nodeId, leftEdge) {
        if (placed[nodeId]) return;
        placed[nodeId] = true;

        const node = graph.nodeMap[nodeId];
        const children = getGraphChildren(graph, nodeId);
        if (!children.length) {
          slots[nodeId] = leftEdge;
          return;
        }

        const isDecision = node && normalizeFlowchartShapeKey(node.shape) === "decision";
        if (isDecision && children.length === 2) {
          const leftLink = children[0];
          const rightLink = children[1];
          const leftWidth = getStructuredWidth(leftLink.toNodeId);

          placeNode(leftLink.toNodeId, leftEdge);
          placeNode(rightLink.toNodeId, leftEdge + leftWidth + slotGap);

          slots[nodeId] = (Number(slots[leftLink.toNodeId] || 0) + Number(slots[rightLink.toNodeId] || 0)) / 2;
          return;
        }

        if (children.length === 1) {
          placeNode(children[0].toNodeId, leftEdge);
          slots[nodeId] = slots[children[0].toNodeId];
          return;
        }

        let cursor = leftEdge;
        const childCenters = [];
        children.forEach(function (link, index) {
          if (index > 0) cursor += slotGap;
          placeNode(link.toNodeId, cursor);
          childCenters.push(Number(slots[link.toNodeId] || 0));
          cursor += getStructuredWidth(link.toNodeId);
        });
        slots[nodeId] = childCenters.reduce(function (sum, value) {
          return sum + value;
        }, 0) / childCenters.length;
      }

      let cursor = 0;
      graph.treeRoots.forEach(function (rootId, index) {
        if (index > 0) cursor += slotGap;
        placeNode(rootId, cursor);
        cursor += getStructuredWidth(rootId);
      });

      graph.nodes.forEach(function (node) {
        if (!Object.prototype.hasOwnProperty.call(slots, node.id)) {
          placeNode(node.id, cursor);
          cursor += getStructuredWidth(node.id) + slotGap;
        }
      });

      return relaxFlowchartSlots(graph, enforceFlowchartRankSeparation(graph, slots));
    }

    function getNodeGeometry() {
      const nodeWidth = Number(FLOWCHART_LAYOUT.cellWidth) || 88;
      const shapeWidth = Number(FLOWCHART_LAYOUT.shapeWidth) || 80;
      const shapeHeight = Number(FLOWCHART_LAYOUT.shapeHeight) || 48;
      const textWidth = Number(FLOWCHART_LAYOUT.textWidth) || 80;
      const textHeight = Number(FLOWCHART_LAYOUT.textHeight) || 42;
      const textTop = Number(FLOWCHART_LAYOUT.textTop) || 55;
      const shapeLeft = Math.round((nodeWidth - shapeWidth) / 2);
      const textLeft = Math.round((nodeWidth - textWidth) / 2);

      return {
        nodeWidth: nodeWidth,
        nodeHeight: Math.max(textTop + textHeight, shapeHeight),
        shapeWidth: shapeWidth,
        shapeHeight: shapeHeight,
        textWidth: textWidth,
        textHeight: textHeight,
        textTop: textTop,
        shapeLeft: shapeLeft,
        textLeft: textLeft
      };
    }

    function getNodeConnectors(pos) {
      const geometry = getNodeGeometry();
      return {
        top: [pos.left + Math.round(geometry.nodeWidth / 2), pos.shapeTop],
        bottom: [pos.left + Math.round(geometry.nodeWidth / 2), pos.shapeTop + geometry.shapeHeight],
        left: [pos.shapeLeft, pos.shapeTop + Math.round(geometry.shapeHeight / 2)],
        right: [pos.shapeLeft + geometry.shapeWidth, pos.shapeTop + Math.round(geometry.shapeHeight / 2)]
      };
    }

    function buildFallbackRoute(link, layout) {
      const graph = layout.graph;
      const fromPos = layout.positions[link.fromNodeId];
      const toPos = layout.positions[link.toNodeId];
      const fromNode = graph.nodeMap[link.fromNodeId];
      const outgoing = (graph.outgoingByNode[link.fromNodeId] || []).filter(function (item) {
        return !graph.backEdgeIds[item.id];
      });
      const connectorsFrom = getNodeConnectors(fromPos);
      const connectorsTo = getNodeConnectors(toPos);
      const isDecision = normalizeFlowchartShapeKey(fromNode.shape) === "decision";
      const startSide =
        graph.backEdgeIds[link.id]
          ? (link.outputSlot === 1 ? "right" : "left")
          : isDecision || outgoing.length > 1
            ? (link.outputSlot === 1 ? "right" : "left")
            : "bottom";

      if (graph.backEdgeIds[link.id]) {
        const side = startSide === "right" ? "right" : "left";
        const laneX =
          side === "right"
            ? Math.max(fromPos.left, toPos.left) + getNodeGeometry().nodeWidth + 34
            : Math.min(fromPos.left, toPos.left) - 34;
        const start = connectorsFrom[startSide];
        const end = connectorsTo[side];
        return {
          points: simplifyFlowchartPolyline([
            start,
            [laneX, start[1]],
            [laneX, end[1]],
            end
          ]),
          startSide: startSide,
          isBackEdge: true
        };
      }

      const start = connectorsFrom[startSide];
      const end = connectorsTo.top;
      const midY = Math.round((start[1] + end[1]) / 2);

      return {
        points: simplifyFlowchartPolyline([
          start,
          startSide === "bottom" ? [start[0], midY] : [end[0], start[1]],
          end
        ]),
        startSide: startSide,
        isBackEdge: false
      };
    }

    function buildFlowchartLinkRenderData(links, nodeMap, layout) {
      if (layout && Array.isArray(layout.routedLinks) && layout.routedLinks.length) {
        return layout.routedLinks.map(cloneFlowchartRoute);
      }

      const graph = layout && layout.graph ? layout.graph : getFlowchartGraph(Object.keys(nodeMap || {}).map(function (id) {
        return nodeMap[id];
      }), links);

      return graph.linkList.map(function (link) {
        const fromNode = graph.nodeMap[link.fromNodeId];
        const route = buildFallbackRoute(link, layout);
        const text = String(link.label || "").trim() || getFlowchartDefaultOutputLabel(fromNode, link.outputSlot, graph.linkList);
        return {
          link: link,
          points: route.points,
          label: text,
          labelPos: text ? getFlowchartLinkLabelPosition(route) : null
        };
      });
    }

    function cloneFlowchartPositions(positions) {
      return Object.keys(positions || {}).reduce(function (acc, nodeId) {
        const pos = positions[nodeId];
        acc[nodeId] = Object.assign({}, pos);
        return acc;
      }, {});
    }

    function getStructuredFlowchartPositions(graph) {
      const geometry = getNodeGeometry();
      const slots = getFlowchartAutoSlots(graph);
      const slotStepX = geometry.nodeWidth + 46;
      const rankStepY = geometry.nodeHeight + 44;
      const positions = {};

      graph.nodes.forEach(function (node) {
        const slot = Number(slots[node.id] || 0);
        const rank = graph.ranks[node.id] || 0;
        const left = Math.round((Number(FLOWCHART_LAYOUT.boardPaddingX) || 32) + slot * slotStepX);
        const top = Math.round((Number(FLOWCHART_LAYOUT.boardPaddingY) || 24) + rank * rankStepY);
        positions[node.id] = {
          left: left,
          top: top,
          slot: slot,
          rank: rank,
          shapeLeft: left + geometry.shapeLeft,
          shapeTop: top,
          textLeft: left + geometry.textLeft,
          textTop: top + geometry.textTop,
          centerX: left + Math.round(geometry.nodeWidth / 2),
          centerY: top + Math.round(geometry.shapeHeight / 2)
        };
      });

      return positions;
    }

    function getFlowchartLayoutCandidate(graph, positions, source) {
      const geometry = getNodeGeometry();
      const candidatePositions = cloneFlowchartPositions(positions);
      const routedLinks = [];
      const bundles = getForwardTargetBundles(graph, candidatePositions);

      graph.nonBackLinks.forEach(function (link) {
        const fromNode = graph.nodeMap[link.fromNodeId];
        const route = buildForwardRoute(link, graph, candidatePositions, bundles);
        const label = String(link.label || "").trim() || getFlowchartDefaultOutputLabel(fromNode, link.outputSlot, graph.linkList);
        routedLinks.push({
          link: link,
          points: route.points,
          label: label,
          labelPos: label ? getFlowchartLinkLabelPosition(route) : null
        });
      });

      const nodeBounds = getLayoutBoundsFromPositions(candidatePositions);
      const laneUsage = { left: 0, right: 0 };
      graph.linkList.forEach(function (link) {
        if (!graph.backEdgeIds[link.id]) return;
        const fromNode = graph.nodeMap[link.fromNodeId];
        const route = buildBackEdgeRoute(link, graph, candidatePositions, nodeBounds, laneUsage);
        const label = String(link.label || "").trim() || getFlowchartDefaultOutputLabel(fromNode, link.outputSlot, graph.linkList);
        routedLinks.push({
          link: link,
          points: route.points,
          label: label,
          labelPos: label ? getFlowchartLinkLabelPosition(route) : null
        });
      });

      const bounds = {
        minX: nodeBounds.minX,
        minY: nodeBounds.minY,
        maxX: nodeBounds.maxX,
        maxY: nodeBounds.maxY
      };
      routedLinks.forEach(function (route) {
        route.points.forEach(function (point) {
          bounds.minX = Math.min(bounds.minX, point[0]);
          bounds.minY = Math.min(bounds.minY, point[1]);
          bounds.maxX = Math.max(bounds.maxX, point[0]);
          bounds.maxY = Math.max(bounds.maxY, point[1]);
        });
        if (route.labelPos) {
          bounds.minX = Math.min(bounds.minX, route.labelPos.x - 44);
          bounds.minY = Math.min(bounds.minY, route.labelPos.y - 18);
          bounds.maxX = Math.max(bounds.maxX, route.labelPos.x + 44);
          bounds.maxY = Math.max(bounds.maxY, route.labelPos.y + 18);
        }
      });

      const framePaddingX = 28;
      const framePaddingY = 28;
      const shiftX = framePaddingX - bounds.minX;
      const shiftY = framePaddingY - bounds.minY;

      Object.keys(candidatePositions).forEach(function (nodeId) {
        const pos = candidatePositions[nodeId];
        pos.left += shiftX;
        pos.top += shiftY;
        pos.shapeLeft += shiftX;
        pos.shapeTop += shiftY;
        pos.textLeft += shiftX;
        pos.textTop += shiftY;
        pos.centerX += shiftX;
        pos.centerY += shiftY;
      });
      routedLinks.forEach(function (route) {
        shiftFlowchartRoute(route, shiftX, shiftY);
      });

      return {
        width: Math.max(
          Math.round(bounds.maxX - bounds.minX + framePaddingX * 2),
          geometry.nodeWidth + framePaddingX * 2
        ),
        height: Math.max(
          Math.round(bounds.maxY - bounds.minY + framePaddingY * 2),
          geometry.nodeHeight + framePaddingY * 2
        ),
        positions: candidatePositions,
        graph: graph,
        routedLinks: routedLinks.map(cloneFlowchartRoute),
        source: source || "structured"
      };
    }

    function getFlowchartBoardLayout(nodes, links) {
      const graph = getFlowchartGraph(nodes, links);
      return getFlowchartLayoutCandidate(graph, getStructuredFlowchartPositions(graph), "structured");
    }

    function getElkPortId(nodeId, side) {
      return String(nodeId || "") + "__" + String(side || "top");
    }

    function getElkPortDefs(nodeId) {
      const geometry = getNodeGeometry();
      const halfPort = 2;
      return [
        { id: getElkPortId(nodeId, "top"), width: 4, height: 4, x: Math.round(geometry.nodeWidth / 2) - halfPort, y: -halfPort },
        { id: getElkPortId(nodeId, "left"), width: 4, height: 4, x: geometry.shapeLeft - halfPort, y: Math.round(geometry.shapeHeight / 2) - halfPort },
        { id: getElkPortId(nodeId, "bottom"), width: 4, height: 4, x: Math.round(geometry.nodeWidth / 2) - halfPort, y: geometry.shapeHeight - halfPort },
        { id: getElkPortId(nodeId, "right"), width: 4, height: 4, x: geometry.shapeLeft + geometry.shapeWidth - halfPort, y: Math.round(geometry.shapeHeight / 2) - halfPort }
      ];
    }

    function getElkSourcePortSide(graph, link) {
      const fromNode = graph.nodeMap[link.fromNodeId];
      if (!fromNode) return "bottom";
      const outgoing = (graph.outgoingByNode[fromNode.id] || []).filter(function (item) {
        return !graph.backEdgeIds[item.id];
      });
      const isDecision = normalizeFlowchartShapeKey(fromNode.shape) === "decision";

      if (isDecision || outgoing.length > 1) {
        return link.outputSlot === 1 ? "right" : "left";
      }

      return "bottom";
    }

    function buildElkGraph(graph) {
      const geometry = getNodeGeometry();

      return {
        id: "root",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.edgeRouting": "ORTHOGONAL",
          "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
          "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
          "elk.layered.mergeEdges": "true",
          "elk.layered.unnecessaryBendpoints": "false",
          "elk.layered.feedbackEdges": "true",
          "elk.layered.spacing.nodeNodeBetweenLayers": String(Math.max(28, Math.round(geometry.nodeHeight * 0.48))),
          "elk.spacing.nodeNode": "36"
        },
        children: graph.nodes.map(function (node) {
          return {
            id: node.id,
            width: geometry.nodeWidth,
            height: geometry.nodeHeight,
            layoutOptions: {
              "elk.portConstraints": "FIXED_POS"
            },
            ports: getElkPortDefs(node.id)
          };
        }),
        edges: graph.nonBackLinks.map(function (link) {
          return {
            id: link.id,
            sources: [getElkPortId(link.fromNodeId, getElkSourcePortSide(graph, link))],
            targets: [getElkPortId(link.toNodeId, "top")]
          };
        })
      };
    }

    function getNodeEnvelope(pos) {
      const geometry = getNodeGeometry();
      return {
        left: pos.shapeLeft - 8,
        top: pos.shapeTop - 8,
        right: Math.max(pos.shapeLeft + geometry.shapeWidth, pos.textLeft + geometry.textWidth) + 8,
        bottom: pos.textTop + geometry.textHeight + 8
      };
    }

    function segmentIntersectsRect(start, end, rect) {
      if (!start || !end || !rect) return false;

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

    function routeHitsObstacles(points, obstacles) {
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        const start = points[pointIndex - 1];
        const end = points[pointIndex];
        for (let obstacleIndex = 0; obstacleIndex < obstacles.length; obstacleIndex += 1) {
          if (segmentIntersectsRect(start, end, obstacles[obstacleIndex])) return true;
        }
      }
      return false;
    }

    function buildRouteObstacles(positions, excludedNodeIds) {
      const excluded = excludedNodeIds || {};
      return Object.keys(positions).filter(function (nodeId) {
        return !excluded[nodeId];
      }).map(function (nodeId) {
        return getNodeEnvelope(positions[nodeId]);
      });
    }

    function getForwardTargetBundles(graph, positions) {
      const bundles = {};

      graph.nodes.forEach(function (node) {
        const incoming = (graph.incomingByNode[node.id] || []).filter(function (link) {
          return !graph.backEdgeIds[link.id];
        });
        if (incoming.length < 2) return;
        const pos = positions[node.id];
        if (!pos) return;
        bundles[node.id] = {
          joinX: pos.centerX,
          joinY: pos.shapeTop - 22
        };
      });

      return bundles;
    }

    function findClearLaneCoordinate(baseValue, step, attempts, pointsBuilder, obstacles) {
      const values = [snapRouteValue(baseValue)];
      for (let index = 1; index <= attempts; index += 1) {
        values.push(snapRouteValue(baseValue - index * step));
        values.push(snapRouteValue(baseValue + index * step));
      }

      for (let index = 0; index < values.length; index += 1) {
        const points = simplifyFlowchartPolyline(pointsBuilder(values[index]));
        if (!routeHitsObstacles(points, obstacles)) return values[index];
      }

      return snapRouteValue(baseValue);
    }

    function buildForwardRoute(link, graph, positions, bundles) {
      const fromNode = graph.nodeMap[link.fromNodeId];
      const fromPos = positions[link.fromNodeId];
      const toPos = positions[link.toNodeId];
      const startSide = getElkSourcePortSide(graph, link);
      const connectorsFrom = getNodeConnectors(fromPos);
      const connectorsTo = getNodeConnectors(toPos);
      const start = connectorsFrom[startSide];
      const end = connectorsTo.top;
      const bundle = bundles[link.toNodeId] || null;
      const obstacles = buildRouteObstacles(positions, {
        [link.fromNodeId]: true,
        [link.toNodeId]: true
      });
      const laneStep = 20;

      if (startSide === "bottom") {
        const preferredY = bundle ? bundle.joinY : Math.round((start[1] + end[1]) / 2);
        const laneY = findClearLaneCoordinate(
          preferredY,
          laneStep,
          12,
          function (value) {
            return [
              start,
              [start[0], value],
              [bundle ? bundle.joinX : end[0], value],
              end
            ];
          },
          obstacles
        );
        const points = [
          start,
          [start[0], laneY],
          [bundle ? bundle.joinX : end[0], laneY],
          end
        ];
        return {
          points: simplifyFlowchartPolyline(points),
          startSide: startSide,
          isBackEdge: false
        };
      }

      if (!bundle) {
        const directSideRoute = simplifyFlowchartPolyline([
          start,
          [end[0], start[1]],
          end
        ]);
        if (!routeHitsObstacles(directSideRoute, obstacles)) {
          return {
            points: directSideRoute,
            startSide: startSide,
            isBackEdge: false
          };
        }
      }

      const preferredExitX = start[0] + (startSide === "right" ? 20 : -20);
      const exitX = findClearLaneCoordinate(
        preferredExitX,
        laneStep,
        10,
        function (value) {
          const midY = bundle ? bundle.joinY : Math.round((start[1] + end[1]) / 2);
          return [
            start,
            [value, start[1]],
            [value, midY],
            [bundle ? bundle.joinX : end[0], midY],
            end
          ];
        },
        obstacles
      );
      const preferredY = bundle ? bundle.joinY : Math.round((start[1] + end[1]) / 2);
      const laneY = findClearLaneCoordinate(
        preferredY,
        laneStep,
        12,
        function (value) {
          return [
            start,
            [exitX, start[1]],
            [exitX, value],
            [bundle ? bundle.joinX : end[0], value],
            end
          ];
        },
        obstacles
      );
      const points = [
        start,
        [exitX, start[1]],
        [exitX, laneY],
        [bundle ? bundle.joinX : end[0], laneY],
        end
      ];

      return {
        points: simplifyFlowchartPolyline(points),
        startSide: startSide,
        isBackEdge: false
      };
    }

    function getLayoutBoundsFromPositions(positions) {
      const geometry = getNodeGeometry();
      const bounds = {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY
      };

      Object.keys(positions).forEach(function (nodeId) {
        const pos = positions[nodeId];
        if (!pos) return;
        bounds.minX = Math.min(bounds.minX, pos.shapeLeft - 18, pos.textLeft - 12);
        bounds.minY = Math.min(bounds.minY, pos.shapeTop - 18);
        bounds.maxX = Math.max(bounds.maxX, pos.shapeLeft + geometry.shapeWidth + 18, pos.textLeft + geometry.textWidth + 12);
        bounds.maxY = Math.max(bounds.maxY, pos.textTop + geometry.textHeight + 18);
      });

      if (!Number.isFinite(bounds.minX)) bounds.minX = 0;
      if (!Number.isFinite(bounds.minY)) bounds.minY = 0;
      if (!Number.isFinite(bounds.maxX)) bounds.maxX = geometry.nodeWidth;
      if (!Number.isFinite(bounds.maxY)) bounds.maxY = geometry.nodeHeight;
      return bounds;
    }

    function getBackEdgeSides(graph, link, positions) {
      const fromNode = graph.nodeMap[link.fromNodeId];
      const toNode = graph.nodeMap[link.toNodeId];
      const fromPos = positions[link.fromNodeId];
      const toPos = positions[link.toNodeId];
      const outgoing = (graph.outgoingByNode[link.fromNodeId] || []);
      const isDecision = fromNode && normalizeFlowchartShapeKey(fromNode.shape) === "decision";
      const targetIsDecision = toNode && normalizeFlowchartShapeKey(toNode.shape) === "decision";
      const targetIsAbove = fromPos && toPos && fromPos.top > toPos.top + 20;

      if (targetIsDecision && targetIsAbove && fromPos && toPos) {
        return {
          startSide:
            Math.abs(fromPos.centerX - toPos.centerX) <= 36
              ? "bottom"
              : fromPos.centerX < toPos.centerX
                ? "left"
                : "right",
          targetSide: "top",
          laneSide: fromPos.centerX <= toPos.centerX ? "left" : "right"
        };
      }

      let startSide = "bottom";
      if (isDecision || outgoing.length > 1) {
        startSide = link.outputSlot === 1 ? "right" : "left";
      } else if (fromPos && toPos && fromPos.centerX > toPos.centerX + 12) {
        startSide = "left";
      } else if (fromPos && toPos && fromPos.centerX < toPos.centerX - 12) {
        startSide = "right";
      }

      let targetSide = startSide === "right" ? "right" : "left";
      if (fromPos && toPos && Math.abs(fromPos.centerX - toPos.centerX) > 42) {
        targetSide = fromPos.centerX >= toPos.centerX ? "right" : "left";
      }

      return {
        startSide: startSide,
        targetSide: targetSide,
        laneSide: targetSide === "right" ? "right" : "left"
      };
    }

    function buildBackEdgeRoute(link, graph, positions, bounds, laneUsage) {
      const connectorsFrom = getNodeConnectors(positions[link.fromNodeId]);
      const connectorsTo = getNodeConnectors(positions[link.toNodeId]);
      const sides = getBackEdgeSides(graph, link, positions);
      const laneSide = sides.laneSide || (sides.startSide === "right" || sides.targetSide === "right" ? "right" : "left");
      const laneIndex = (laneUsage[laneSide] || 0) + 1;
      const laneSpacing = 30;
      const laneX =
        laneSide === "right"
          ? bounds.maxX + laneIndex * laneSpacing
          : bounds.minX - laneIndex * laneSpacing;
      const start = connectorsFrom[sides.startSide];
      const end = connectorsTo[sides.targetSide];
      const escapeOffset = 18 + (laneIndex - 1) * 4;
      const exitPoint =
        sides.startSide === "bottom"
          ? [start[0], start[1] + escapeOffset]
          : sides.startSide === "top"
            ? [start[0], start[1] - escapeOffset]
          : [start[0] + (laneSide === "right" ? escapeOffset : -escapeOffset), start[1]];
      const laneEntry = [laneX, exitPoint[1]];
      const reentryOffset = 24 + (laneIndex - 1) * 6;

      laneUsage[laneSide] = laneIndex;

      if (sides.targetSide === "top") {
        const approachY = end[1] - reentryOffset;
        return {
          points: simplifyFlowchartPolyline([
            start,
            exitPoint,
            laneEntry,
            [laneX, approachY],
            [end[0], approachY],
            end
          ]),
          startSide: sides.startSide,
          isBackEdge: true
        };
      }

      return {
        points: simplifyFlowchartPolyline([
          start,
          exitPoint,
          laneEntry,
          [laneX, end[1]],
          end
        ]),
        startSide: sides.startSide,
        isBackEdge: true
      };
    }

    function getRouteSegments(route) {
      const segments = [];
      for (let index = 1; index < (route.points || []).length; index += 1) {
        segments.push({
          start: route.points[index - 1],
          end: route.points[index]
        });
      }
      return segments;
    }

    function pointEquals(a, b) {
      return !!a && !!b && a[0] === b[0] && a[1] === b[1];
    }

    function isPointSegmentEndpoint(point, segment) {
      return pointEquals(point, segment.start) || pointEquals(point, segment.end);
    }

    function countFlowchartRouteCrossings(routedLinks) {
      let crossings = 0;

      for (let routeIndex = 0; routeIndex < routedLinks.length; routeIndex += 1) {
        const routeA = routedLinks[routeIndex];
        const segmentsA = getRouteSegments(routeA);
        for (let otherIndex = routeIndex + 1; otherIndex < routedLinks.length; otherIndex += 1) {
          const routeB = routedLinks[otherIndex];
          if (routeA.link.toNodeId === routeB.link.toNodeId) continue;
          const segmentsB = getRouteSegments(routeB);

          for (let segmentIndexA = 0; segmentIndexA < segmentsA.length; segmentIndexA += 1) {
            const segmentA = segmentsA[segmentIndexA];
            const aVertical = segmentA.start[0] === segmentA.end[0];
            const aHorizontal = segmentA.start[1] === segmentA.end[1];
            if (!aVertical && !aHorizontal) continue;

            for (let segmentIndexB = 0; segmentIndexB < segmentsB.length; segmentIndexB += 1) {
              const segmentB = segmentsB[segmentIndexB];
              const bVertical = segmentB.start[0] === segmentB.end[0];
              const bHorizontal = segmentB.start[1] === segmentB.end[1];
              if (!(aVertical && bHorizontal) && !(aHorizontal && bVertical)) continue;

              const vertical = aVertical ? segmentA : segmentB;
              const horizontal = aHorizontal ? segmentA : segmentB;
              const x = vertical.start[0];
              const y = horizontal.start[1];
              const verticalMinY = Math.min(vertical.start[1], vertical.end[1]);
              const verticalMaxY = Math.max(vertical.start[1], vertical.end[1]);
              const horizontalMinX = Math.min(horizontal.start[0], horizontal.end[0]);
              const horizontalMaxX = Math.max(horizontal.start[0], horizontal.end[0]);
              if (!(x > horizontalMinX && x < horizontalMaxX && y > verticalMinY && y < verticalMaxY)) continue;
              const point = [x, y];
              if (isPointSegmentEndpoint(point, segmentA) || isPointSegmentEndpoint(point, segmentB)) continue;
              crossings += 1;
            }
          }
        }
      }

      return crossings;
    }

    function countFlowchartObstacleHits(layout) {
      let hits = 0;
      (layout.routedLinks || []).forEach(function (route) {
        const obstacles = buildRouteObstacles(layout.positions, {
          [route.link.fromNodeId]: true,
          [route.link.toNodeId]: true
        });
        if (routeHitsObstacles(route.points, obstacles)) hits += 1;
      });
      return hits;
    }

    function getDecisionBranchPenalty(layout) {
      const graph = layout.graph;
      let penalty = 0;

      graph.nodes.forEach(function (node) {
        if (normalizeFlowchartShapeKey(node.shape) !== "decision") return;
        const children = getGraphChildren(graph, node.id);
        if (children.length !== 2) return;
        const leftPos = layout.positions[children[0].toNodeId];
        const rightPos = layout.positions[children[1].toNodeId];
        const nodePos = layout.positions[node.id];
        if (!leftPos || !rightPos || !nodePos) return;
        if (leftPos.centerX >= rightPos.centerX) penalty += 1200;
        if (leftPos.centerX > nodePos.centerX + 8) penalty += 240;
        if (rightPos.centerX < nodePos.centerX - 8) penalty += 240;
      });

      return penalty;
    }

    function getMergeAlignmentPenalty(layout) {
      const graph = layout.graph;
      let penalty = 0;

      graph.nodes.forEach(function (node) {
        const incoming = (graph.incomingByNode[node.id] || []).filter(function (link) {
          return !graph.backEdgeIds[link.id];
        });
        if (incoming.length < 2) return;
        const targetPos = layout.positions[node.id];
        if (!targetPos) return;
        const desiredCenter = incoming.reduce(function (sum, link) {
          const fromPos = layout.positions[link.fromNodeId];
          return sum + (fromPos ? fromPos.centerX : targetPos.centerX);
        }, 0) / incoming.length;
        penalty += Math.abs(targetPos.centerX - desiredCenter);
      });

      return penalty;
    }

    function scoreFlowchartLayout(layout) {
      if (!layout) return Number.POSITIVE_INFINITY;
      const crossingPenalty = countFlowchartRouteCrossings(layout.routedLinks || []) * 1400;
      const obstaclePenalty = countFlowchartObstacleHits(layout) * 2400;
      const decisionPenalty = getDecisionBranchPenalty(layout);
      const mergePenalty = getMergeAlignmentPenalty(layout) * 4;
      const areaPenalty = Math.round((Number(layout.width || 0) * Number(layout.height || 0)) / 1800);
      return crossingPenalty + obstaclePenalty + decisionPenalty + mergePenalty + areaPenalty;
    }

    function computeElkLayoutCandidate(graph) {
      if (!elk) return Promise.resolve(null);

      const geometry = getNodeGeometry();
      const elkGraph = buildElkGraph(graph);

      return elk.layout(elkGraph).then(function (result) {
        const positions = {};

        (Array.isArray(result.children) ? result.children : []).forEach(function (node) {
          const left = snapRouteValue(node.x);
          const top = snapRouteValue(node.y);
          positions[node.id] = {
            left: left,
            top: top,
            shapeLeft: left + geometry.shapeLeft,
            shapeTop: top,
            textLeft: left + geometry.textLeft,
            textTop: top + geometry.textTop,
            centerX: left + Math.round(geometry.nodeWidth / 2),
            centerY: top + Math.round(geometry.shapeHeight / 2)
          };
        });

        return getFlowchartLayoutCandidate(graph, positions, "elk");
      });
    }

    function computeFlowchartBoardLayout(nodes, links) {
      const graph = getFlowchartGraph(nodes, links);
      const structured = getFlowchartLayoutCandidate(graph, getStructuredFlowchartPositions(graph), "structured");
      if (!elk) return Promise.resolve(structured);

      return computeElkLayoutCandidate(graph).then(function (elkCandidate) {
        if (!elkCandidate) return structured;
        return scoreFlowchartLayout(elkCandidate) < scoreFlowchartLayout(structured)
          ? elkCandidate
          : structured;
      }).catch(function (error) {
        structured.layoutError = error && error.message ? String(error.message) : String(error || "Erro no ELK.");
        return structured;
      });
    }

    return {
      getFlowchartGraph: getFlowchartGraph,
      getFlowchartAutoSlots: getFlowchartAutoSlots,
      buildFlowchartLinkRenderData: buildFlowchartLinkRenderData,
      getFlowchartBoardLayout: getFlowchartBoardLayout,
      computeFlowchartBoardLayout: computeFlowchartBoardLayout
    };
  }

  global.AraLearnFlowchartLayout = {
    createFlowchartLayoutEngine: createFlowchartLayoutEngine
  };
})(window);
