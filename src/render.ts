/**
 * render.ts - injects MetricsResult into the SVG template
 */
import type { MetricsResult } from './metrics.js';
import { cardTemplate } from './templates/card.js';

export function renderCard(metrics: MetricsResult, theme: string): string {
  // Currently only dark theme is implemented in v0.1.0.
  // theme parameter is reserved for future light theme.
  void theme;
  return cardTemplate(metrics);
}
