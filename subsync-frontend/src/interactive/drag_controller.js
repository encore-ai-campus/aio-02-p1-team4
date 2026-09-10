// 플로팅 UI 공통 드래그 컨트롤러
(function () {
  const SubSync = (window.__SubSync = window.__SubSync || {});

  const DEFAULT_MARGIN = 8;
  const DEFAULT_THRESHOLD = 4;
  const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, option, [data-no-drag]";

  function isInteractiveTarget(target) {
    return Boolean(target && target.closest && target.closest(INTERACTIVE_SELECTOR));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function viewportSize() {
    return {
      width: Number(window.innerWidth) || document.documentElement?.clientWidth || 0,
      height: Number(window.innerHeight) || document.documentElement?.clientHeight || 0
    };
  }

  function getDragBounds(element) {
    const offsetParent = element.offsetParent;
    if (offsetParent && offsetParent.getBoundingClientRect) {
      const rect = offsetParent.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right ?? rect.left + rect.width,
        bottom: rect.bottom ?? rect.top + rect.height,
        offsetLeft: rect.left,
        offsetTop: rect.top
      };
    }

    const viewport = viewportSize();
    return {
      left: 0,
      top: 0,
      right: viewport.width,
      bottom: viewport.height,
      offsetLeft: 0,
      offsetTop: 0
    };
  }

  SubSync.drag = {
    attach(element, handle = element, options = {}) {
      if (!element || !handle) return () => {};
      if (handle.__subsyncDragAttached) return handle.__subsyncDragDetach || (() => {});

      const margin = Number.isFinite(options.margin) ? options.margin : DEFAULT_MARGIN;
      const threshold = Number.isFinite(options.threshold)
        ? options.threshold
        : DEFAULT_THRESHOLD;
      const preserveCenterX = options.preserveCenterX === true;
      const state = {
        active: false,
        dragging: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        originViewportLeft: 0,
        originViewportCenterX: 0,
        originViewportTop: 0,
        boundsLeft: 0,
        boundsTop: 0,
        boundsRight: 0,
        boundsBottom: 0,
        containingBlockLeft: 0,
        containingBlockTop: 0,
        width: 0,
        height: 0,
        previousUserSelect: "",
        suppressClick: false
      };

      function resetBodySelection() {
        if (document.body && document.body.style) {
          document.body.style.userSelect = state.previousUserSelect;
        }
      }

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

        if (handle.releasePointerCapture && state.pointerId !== null) {
          try {
            handle.releasePointerCapture(state.pointerId);
          } catch (_) {}
        }
        document.removeEventListener("pointermove", move, true);
        document.removeEventListener("pointerup", finish, true);
        document.removeEventListener("pointercancel", finish, true);
        state.suppressClick = state.dragging;
        state.active = false;
        state.pointerId = null;
        if (state.dragging) element.classList.remove("subsync-dragging");
        state.dragging = false;
        resetBodySelection();
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
        if (!state.dragging && Math.hypot(deltaX, deltaY) < threshold) return;

        if (!state.dragging) {
          state.dragging = true;
          element.classList.add("subsync-dragging");
          if (document.body && document.body.style) {
            state.previousUserSelect = document.body.style.userSelect || "";
            document.body.style.userSelect = "none";
          }
        }

        const minViewportLeft = state.boundsLeft + margin;
        const minViewportTop = state.boundsTop + margin;
        const maxViewportLeft = Math.max(
          minViewportLeft,
          state.boundsRight - state.width - margin
        );
        const maxViewportTop = Math.max(
          minViewportTop,
          state.boundsBottom - state.height - margin
        );
        const minViewportCenterX = state.boundsLeft + margin + state.width / 2;
        const maxViewportCenterX = Math.max(
          minViewportCenterX,
          state.boundsRight - margin - state.width / 2
        );
        const horizontalAnchor = preserveCenterX
          ? clamp(
              state.originViewportCenterX + deltaX,
              minViewportCenterX,
              maxViewportCenterX
            )
          : clamp(
              state.originViewportLeft + deltaX,
              minViewportLeft,
              maxViewportLeft
            );
        const viewportLeft = preserveCenterX
          ? horizontalAnchor - state.width / 2
          : horizontalAnchor;
        const viewportTop = clamp(
          state.originViewportTop + deltaY,
          minViewportTop,
          maxViewportTop
        );
        const left = preserveCenterX
          ? horizontalAnchor - state.containingBlockLeft
          : viewportLeft - state.containingBlockLeft;
        const top = viewportTop - state.containingBlockTop;

        event.preventDefault();
        element.style.left = `${Math.round(left)}px`;
        element.style.top = `${Math.round(top)}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        element.style.transform = preserveCenterX ? "translateX(-50%)" : "none";
      }

      function start(event) {
        if (event.button !== undefined && event.button !== 0) return;
        if (isInteractiveTarget(event.target)) return;

        const rect = element.getBoundingClientRect();
        state.active = true;
        state.dragging = false;
        state.suppressClick = false;
        state.pointerId = event.pointerId ?? null;
        state.startX = event.clientX;
        state.startY = event.clientY;
        const bounds = getDragBounds(element);
        state.originViewportLeft = rect.left;
        state.width = rect.width || element.offsetWidth || 0;
        state.height = rect.height || element.offsetHeight || 0;
        state.originViewportCenterX = rect.left + state.width / 2;
        state.originViewportTop = rect.top;
        state.boundsLeft = bounds.left;
        state.boundsTop = bounds.top;
        state.boundsRight = bounds.right;
        state.boundsBottom = bounds.bottom;
        state.containingBlockLeft = bounds.offsetLeft;
        state.containingBlockTop = bounds.offsetTop;

        if (handle.setPointerCapture && state.pointerId !== null) {
          try {
            handle.setPointerCapture(state.pointerId);
          } catch (_) {}
        }
        document.addEventListener("pointermove", move, true);
        document.addEventListener("pointerup", finish, true);
        document.addEventListener("pointercancel", finish, true);
      }

      function suppressClick(event) {
        if (!state.suppressClick) return;
        state.suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
      }

      handle.addEventListener("pointerdown", start);
      element.addEventListener("click", suppressClick, true);
      handle.__subsyncDragAttached = true;
      handle.__subsyncDragDetach = () => {
        finish();
        handle.removeEventListener("pointerdown", start);
        element.removeEventListener("click", suppressClick, true);
        delete handle.__subsyncDragAttached;
        delete handle.__subsyncDragDetach;
      };

      return handle.__subsyncDragDetach;
    }
  };
})();
