(function (global) {
  "use strict";

  function createRenderStateTools() {
    const trackedSelectors = [
      ".screen-content",
      ".editor-sheet",
      ".editor-step-strip",
      ".canvas-col",
      ".flowchart-scroll"
    ];

    function getPageScroller() {
      return global.document.scrollingElement || global.document.documentElement || global.document.body || null;
    }

    function cssEsc(value) {
      if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(String(value));
      return String(value).replace(/(["\\.#:[\]])/g, "\\$1");
    }

    function getElementPath(root, node) {
      if (!root || !node || node === root) return [];
      const path = [];
      let current = node;

      while (current && current !== root) {
        const parent = current.parentElement;
        if (!parent) return null;
        path.push(Array.prototype.indexOf.call(parent.children, current));
        current = parent;
      }

      if (current !== root) return null;
      return path.reverse();
    }

    function getElementByPath(root, path) {
      if (!root || !Array.isArray(path)) return null;
      let current = root;

      for (let index = 0; index < path.length; index += 1) {
        const childIndex = path[index];
        if (!current.children || childIndex < 0 || childIndex >= current.children.length) return null;
        current = current.children[childIndex];
      }

      return current;
    }

    function buildIdentityQuery(identity) {
      if (!identity || !identity.tagName) return "";
      let query = identity.tagName;

      if (identity.name) query += '[name="' + cssEsc(identity.name) + '"]';
      if (identity.type) query += '[type="' + cssEsc(identity.type) + '"]';
      (identity.dataAttrs || []).forEach(function (item) {
        query += "[" + item.name + '="' + cssEsc(item.value) + '"]';
      });
      return query;
    }

    function captureFocusedIdentity(root, node) {
      if (!root || !node || !root.contains(node)) return null;

      const identity = {
        id: node.id || "",
        tagName: node.tagName ? node.tagName.toLowerCase() : "",
        name: node.getAttribute ? String(node.getAttribute("name") || "") : "",
        type: node.getAttribute ? String(node.getAttribute("type") || "") : "",
        dataAttrs: [],
        scopeBlockId: "",
        scopeFlowNodeId: "",
        matchIndex: 0
      };

      Array.from(node.attributes || []).forEach(function (attr) {
        if (!attr || !/^data-/.test(attr.name)) return;
        identity.dataAttrs.push({
          name: attr.name,
          value: String(attr.value || "")
        });
      });

      const blockScope = node.closest && node.closest("[data-block-id]");
      if (blockScope && root.contains(blockScope)) {
        identity.scopeBlockId = String(blockScope.getAttribute("data-block-id") || "");
      }

      const flowNodeScope = node.closest && node.closest("[data-flowchart-node-id]");
      if (flowNodeScope && root.contains(flowNodeScope)) {
        identity.scopeFlowNodeId = String(flowNodeScope.getAttribute("data-flowchart-node-id") || "");
      }

      const query = buildIdentityQuery(identity);
      if (!query) return identity;

      let scope = root;
      if (identity.scopeBlockId) {
        scope = root.querySelector('[data-block-id="' + cssEsc(identity.scopeBlockId) + '"]') || scope;
      }
      if (identity.scopeFlowNodeId) {
        scope =
          scope.querySelector('[data-flowchart-node-id="' + cssEsc(identity.scopeFlowNodeId) + '"]') || scope;
      }

      const matches = Array.from(scope.querySelectorAll(query));
      const index = matches.indexOf(node);
      identity.matchIndex = index > -1 ? index : 0;
      return identity;
    }

    function resolveFocusedElementByIdentity(root, identity) {
      if (!root || !identity) return null;
      if (identity.id) {
        const byId = global.document.getElementById(identity.id);
        if (byId && root.contains(byId)) return byId;
      }

      const query = buildIdentityQuery(identity);
      if (!query) return null;

      let scope = root;
      if (identity.scopeBlockId) {
        scope = root.querySelector('[data-block-id="' + cssEsc(identity.scopeBlockId) + '"]') || scope;
      }
      if (identity.scopeFlowNodeId) {
        scope =
          scope.querySelector('[data-flowchart-node-id="' + cssEsc(identity.scopeFlowNodeId) + '"]') || scope;
      }

      const matches = scope.querySelectorAll(query);
      return matches && matches[identity.matchIndex || 0] ? matches[identity.matchIndex || 0] : matches[0] || null;
    }

    function getContentEditableOffset(root, container, offset) {
      if (!root || !container) return null;
      const range = global.document.createRange();

      try {
        range.setStart(root, 0);
        range.setEnd(container, offset);
      } catch (_error) {
        return null;
      }

      return range.toString().length;
    }

    function captureContentEditableSelection(target) {
      const selection = global.getSelection ? global.getSelection() : null;
      if (!target || !selection || !selection.rangeCount) return null;

      const range = selection.getRangeAt(0);
      if (!target.contains(range.startContainer) || !target.contains(range.endContainer)) return null;

      const start = getContentEditableOffset(target, range.startContainer, range.startOffset);
      const end = getContentEditableOffset(target, range.endContainer, range.endOffset);
      if (start === null || end === null) return null;

      return {
        start: Math.min(start, end),
        end: Math.max(start, end)
      };
    }

    function resolveContentEditablePosition(root, wantedOffset) {
      const walker = global.document.createTreeWalker(root, global.NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      let consumed = 0;

      while (current) {
        const length = String(current.textContent || "").length;
        if (wantedOffset <= consumed + length) {
          return {
            node: current,
            offset: Math.max(0, wantedOffset - consumed)
          };
        }
        consumed += length;
        current = walker.nextNode();
      }

      if (root.lastChild && root.lastChild.nodeType === 3) {
        return {
          node: root.lastChild,
          offset: String(root.lastChild.textContent || "").length
        };
      }

      return {
        node: root,
        offset: root.childNodes ? root.childNodes.length : 0
      };
    }

    function restoreContentEditableSelection(target, snapshot) {
      if (!target || !snapshot) return;
      const selection = global.getSelection ? global.getSelection() : null;
      if (!selection) return;

      const start = resolveContentEditablePosition(target, Math.max(0, snapshot.start || 0));
      const end = resolveContentEditablePosition(target, Math.max(0, snapshot.end || 0));
      const range = global.document.createRange();

      try {
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
      } catch (_error) {
        return;
      }

      selection.removeAllRanges();
      selection.addRange(range);
    }

    function captureFocusedElement(root) {
      const active = global.document.activeElement;
      if (!active || !root || !root.contains(active)) return null;
      if (!active.matches("input, textarea, select, button, [tabindex], [contenteditable='true']")) return null;

      return {
        path: getElementPath(root, active),
        identity: captureFocusedIdentity(root, active),
        selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : null,
        selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
        contentEditableSelection: active.isContentEditable ? captureContentEditableSelection(active) : null
      };
    }

    function restoreFocusedElement(root, snapshot) {
      if (!root || !snapshot) return;
      const target =
        resolveFocusedElementByIdentity(root, snapshot.identity) ||
        (Array.isArray(snapshot.path) ? getElementByPath(root, snapshot.path) : null);
      if (!target || typeof target.focus !== "function") return;

      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        target.focus();
      }

      if (
        typeof snapshot.selectionStart === "number" &&
        typeof snapshot.selectionEnd === "number" &&
        typeof target.setSelectionRange === "function"
      ) {
        target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
      } else if (target.isContentEditable && snapshot.contentEditableSelection) {
        restoreContentEditableSelection(target, snapshot.contentEditableSelection);
      }
    }

    function captureRenderState(root) {
      if (!root) return { scrollables: [], pageScroll: null, focused: null };

      const scrollables = [];
      trackedSelectors.forEach(function (selector) {
        Array.from(root.querySelectorAll(selector)).forEach(function (node, index) {
          scrollables.push({
            selector: selector,
            index: index,
            top: node.scrollTop,
            left: node.scrollLeft
          });
        });
      });

      const pageScroller = getPageScroller();
      return {
        scrollables: scrollables,
        pageScroll: pageScroller
          ? { top: pageScroller.scrollTop, left: pageScroller.scrollLeft }
          : null,
        focused: captureFocusedElement(root)
      };
    }

    function restoreRenderState(root, snapshot) {
      if (!root || !snapshot || !Array.isArray(snapshot.scrollables)) return;

      snapshot.scrollables.forEach(function (item) {
        const nodes = root.querySelectorAll(item.selector);
        const target = nodes && nodes[item.index];
        if (!target) return;
        target.scrollTop = item.top;
        target.scrollLeft = item.left;
      });

      if (snapshot.pageScroll) {
        const pageScroller = getPageScroller();
        if (pageScroller) {
          pageScroller.scrollTop = snapshot.pageScroll.top;
          pageScroller.scrollLeft = snapshot.pageScroll.left;
        }
      }

      global.requestAnimationFrame(function () {
        if (snapshot.pageScroll) {
          const pageScroller = getPageScroller();
          if (pageScroller) {
            pageScroller.scrollTop = snapshot.pageScroll.top;
            pageScroller.scrollLeft = snapshot.pageScroll.left;
          }
        }
        restoreFocusedElement(root, snapshot.focused);
      });
    }

    return {
      captureRenderState: captureRenderState,
      restoreRenderState: restoreRenderState
    };
  }

  global.AraLearnRenderState = {
    createRenderStateTools: createRenderStateTools
  };
})(window);
