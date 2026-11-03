"use client";

import { type PointerEvent, useRef } from "react";
import { Drag } from "./drag";

type Gesture = { pointer: number; y: number; time: number; dragging: boolean };

/**
 * Drag-to-dismiss for the bottom sheet. Spread `handlers` on the sheet and
 * attach `body` (its scroller) and `backdrop`. The offset goes to `--drag` on
 * the sheet and the backdrop fades with it, without re-rendering. A drag that
 * starts inside a scrolled body is left to the scroller.
 */
export function useSheetDrag(onDismiss: () => void) {
  const body = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  function release(sheet: HTMLElement) {
    delete sheet.dataset.dragging;
    sheet.style.removeProperty("--drag");
    backdrop.current?.style.removeProperty("opacity");
    backdrop.current?.style.removeProperty("transition");
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      // A mouse drags by the grabber and header only, leaving text free to select.
      if (
        event.pointerType === "mouse" &&
        (event.button !== 0 ||
          !(event.target instanceof Element) ||
          event.target.closest("[data-sheet-grip]") === null)
      )
        return;
      gesture.current = {
        pointer: event.pointerId,
        y: event.clientY,
        time: event.timeStamp,
        dragging: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const state = gesture.current;
      const sheet = event.currentTarget;
      if (!state || state.pointer !== event.pointerId) return;
      const dy = event.clientY - state.y;
      if (!state.dragging) {
        if (Math.abs(dy) < 4) return;
        const scroller = body.current;
        const inScroller =
          scroller !== null &&
          event.target instanceof Node &&
          scroller.contains(event.target);
        if (
          inScroller &&
          scroller.scrollHeight > scroller.clientHeight &&
          (dy < 0 || scroller.scrollTop > 0)
        ) {
          gesture.current = null;
          return;
        }
        state.dragging = true;
        // Capturing on the sheet also keeps the drag from clicking whatever it started on.
        sheet.setPointerCapture(event.pointerId);
        sheet.dataset.dragging = "";
      }
      const offset = Drag.offset(dy);
      sheet.style.setProperty("--drag", `${offset}px`);
      if (backdrop.current) {
        backdrop.current.style.transition = "none";
        backdrop.current.style.opacity = String(
          1 - Math.max(offset, 0) / sheet.offsetHeight,
        );
      }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const state = gesture.current;
      gesture.current = null;
      if (!state?.dragging) return;
      const dismiss = Drag.shouldDismiss({
        distance: event.clientY - state.y,
        elapsed: event.timeStamp - state.time,
        height: event.currentTarget.offsetHeight,
      });
      release(event.currentTarget);
      if (dismiss) onDismiss();
    },
    onPointerCancel(event: PointerEvent<HTMLElement>) {
      gesture.current = null;
      release(event.currentTarget);
    },
  };

  return { body, backdrop, handlers };
}
