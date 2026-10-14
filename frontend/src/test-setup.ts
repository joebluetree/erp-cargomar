/**
 * Browser APIs that jsdom does not provide but the Spartan overlays use (the combobox list measures its anchor and
 * scrolls the active item into view). Tests only; no behavior is faked beyond "exists and does nothing".
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}
