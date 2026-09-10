/**
 * Pointer tracking for the chart's hover readout. It lives in an action rather
 * than on the element so the container stays a plain, roleless box: the hover
 * tooltip is an enhancement, and everything it shows is also reachable from the
 * month buttons, the month detail panel and the table.
 */
export interface PointerTracking {
  move: (event: PointerEvent) => void;
  leave: () => void;
}

export function trackPointer(node: HTMLElement, handlers: PointerTracking) {
  let current = handlers;
  const onMove = (event: PointerEvent): void => current.move(event);
  const onLeave = (): void => current.leave();

  node.addEventListener('pointermove', onMove);
  node.addEventListener('pointerleave', onLeave);

  return {
    update(next: PointerTracking) {
      current = next;
    },
    destroy() {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    }
  };
}
