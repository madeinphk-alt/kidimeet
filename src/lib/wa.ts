// ── WhatsApp chooser utility ─────────────────────────────────────────────────
// Global callback registered by <WaChooser /> in layout

type WaTarget = { phone: string; message: string };

let _show: ((t: WaTarget) => void) | null = null;

export function registerWaChooser(fn: (t: WaTarget) => void): () => void {
  _show = fn;
  return () => { _show = null; };
}

/**
 * Call this everywhere instead of window.open('https://wa.me/...')
 * Shows a bottom-sheet letting the user pick WhatsApp or WhatsApp Business.
 * Falls back to direct link if the chooser isn't mounted yet.
 */
export function openWa(phone: string, message = ''): void {
  if (_show) {
    _show({ phone, message });
  } else {
    const url = message
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${phone}`;
    window.open(url, '_blank');
  }
}
