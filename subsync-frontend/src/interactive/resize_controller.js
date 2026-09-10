// 플로팅 패널 공통 8방향 리사이즈 컨트롤러
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  const DIRECTIONS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  const DEFAULT_MIN_WIDTH = 320;
  const DEFAULT_MIN_HEIGHT = 260;
  const DEFAULT_MARGIN = 8;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function viewportSize() {
    return {
      width: Number(window.innerWidth) || document.documentElement?.clientWidth || 0,
      height: Number(window.innerHeight) || document.documentElement?.clientHeight || 0
    };
  }

  function removeNode(node, parent) {
    if (node.remove) {
      node.remove();
    } else if (parent && parent.removeChild) {
      parent.removeChild(node);
    }
  }

  SubSync.resize = {
    attach(element, options = {}) {
      if (!element) return () => {};
      if (element.__subsyncResizeAttached) {
        return element.__subsyncResizeDetach || (() => {});
      }

      const minWidth = Number.isFinite(options.minWidth)
        ? options.minWidth
        : DEFAULT_MIN_WIDTH;
      const minHeight = Number.isFinite(options.minHeight)
        ? options.minHeight
        : DEFAULT_MIN_HEIGHT;
      const margin = Number.isFinite(options.margin) ? options.margin : DEFAULT_MARGIN;
      const state = {
        active: false,
        pointerId: null,
        direction: "",
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startRight: 0,
        startBottom: 0,
        startWidth: 0,
        startHeight: 0
      };
      const handles = [];

      function finish(event) {
        if (!state.active) return;
        if (
          state.pointerId !== null &&
          event &&
          event.pointerId !== undefined &&
          event.pointerId !== state.pointerId
        ) {
          return;
        }

        const handle = handles.find((item) => item.dataset.direction === state.direction);
        if (handle && handle.releasePointerCapture && state.pointerId !== null) {
          try {
            handle.releasePointerCapture(state.pointerId);
          } catch (_) {}
        }
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", finish, true);
        document.removeEventListener("pointercancel", finish, true);
        state.active = false;
        state.pointerId = null;
        element.classList.remove("subsync-resizing");
      }

      function move(event) {
        if (!state.active) return;
        if (
          state.pointerId !== null &&
          event.pointerId !== undefined &&
          event.pointerId !== state.pointerId
        ) {
          return;
        }

        const deltaX = event.clientX - state.startX;
        const deltaY = event.clientY - state.startY;
        const viewport = viewportSize();
        const hasWest = state.direction.includes("w");
        const hasEast = state.direction.includes("e");
        const hasNorth = state.direction.includes("n");
        const hasSouth = state.direction.includes("s");

        let left = state.startLeft;
        let top = state.startTop;
        let width = state.startWidth;
        let height = state.startHeight;

        if (hasWest) {
          left = clamp(
            state.startLeft + deltaX,
            margin,
            state.startRight - minWidth
          );
          width = state.startRight - left;
        } else if (hasEast) {
          const right = clamp(
            state.startRight + deltaX,
            state.startLeft + minWidth,
            viewport.width - margin
          );
          width = right - state.startLeft;
        }

        if (hasNorth) {
          top = clamp(
            state.startTop + deltaY,
            margin,
            state.startBottom - minHeight
          );
          height = state.startBottom - top;
        } else if (hasSouth) {
          const bottom = clamp(
            state.startBottom + deltaY,
            state.startTop + minHeight,
            viewport.height - margin
          );
          height = bottom - state.startTop;
        }

        if (!state.direction.includes("w") && !state.direction.includes("e")) {
          width = state.startWidth;
        }
        if (!state.direction.includes("n") && !state.direction.includes("s")) {
          height = state.startHeight;
        }

        event.preventDefault();
        element.style.left = `${Math.round(left)}px`;
        element.style.top = `${Math.round(top)}px`;
        element.style.width = `${Math.round(width)}px`;
        element.style.height = `${Math.round(height)}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        element.style.transform = "none";
      }

      function start(event) {
        if (event.button !== undefined && event.button !== 0) return;
        const direction = event.currentTarget?.dataset?.direction;
        if (!direction) return;

        const rect = element.getBoundingClientRect();
        state.active = true;
        state.pointerId = event.pointerId ?? null;
        state.direction = direction;
        state.startX = event.clientX;
        state.startY = event.clientY;
        state.startLeft = rect.left;
        state.startTop = rect.top;
        state.startRight = rect.right ?? rect.left + rect.width;
        state.startBottom = rect.bottom ?? rect.top + rect.height;
        state.startWidth = rect.width || element.offsetWidth || 0;
        state.startHeight = rect.height || element.offsetHeight || 0;
        element.classList.add("subsync-resizing");
        event.preventDefault();

        if (event.currentTarget.setPointerCapture && state.pointerId !== null) {
          try {
            event.currentTarget.setPointerCapture(state.pointerId);
          } catch (_) {}
        }
        document.addEventListener("pointermove", move, true);
        document.addEventListener("pointerup", finish, true);
        document.addEventListener("pointercancel", finish, true);
      }

      for (const direction of DIRECTIONS) {
        const handle = document.createElement("div");
        handle.className = `subsync-resize-handle subsync-resize-${direction}`;
        handle.dataset.direction = direction;
        handle.setAttribute("aria-hidden", "true");
        handle.addEventListener("pointerdown", start);
        element.appendChild(handle);
        handles.push(handle);
      }

      element.__subsyncResizeAttached = true;
      element.__subsyncResizeDetach = () => {
        finish();
        handles.forEach((handle) => {
          handle.removeEventListener("pointerdown", start);
          removeNode(handle, element);
        });
        delete element.__subsyncResizeAttached;
        delete element.__subsyncResizeDetach;
      };

      return element.__subsyncResizeDetach;
    }
  };
})();
