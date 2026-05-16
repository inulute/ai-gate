export type WebviewZoomAction = 'in' | 'out' | 'reset';

export const WEBVIEW_ZOOM_EVENT = 'ai-gate-webview-zoom';

const WEBVIEW_ZOOM_FACTORS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** Returns the next browser-style zoom factor for a webview. */
export const getNextWebviewZoomFactor = (currentZoom: number, action: WebviewZoomAction) => {
  if (action === 'reset') return 1;

  const nearestIndex = WEBVIEW_ZOOM_FACTORS.reduce((nearest, factor, index) => (
    Math.abs(factor - currentZoom) < Math.abs(WEBVIEW_ZOOM_FACTORS[nearest] - currentZoom) ? index : nearest
  ), 0);
  const nextIndex = action === 'in'
    ? Math.min(nearestIndex + 1, WEBVIEW_ZOOM_FACTORS.length - 1)
    : Math.max(nearestIndex - 1, 0);

  return WEBVIEW_ZOOM_FACTORS[nextIndex];
};
