const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

type CreateSpecialIconGradientFilterParams = {
  filterId: string;
  gradientId: string;
  startColor: string;
  endColor: string;
};

export function createSpecialIconGradientFilter({
  filterId,
  gradientId,
  startColor,
  endColor,
}: CreateSpecialIconGradientFilterParams): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, 'defs');

  const gradient = document.createElementNS(SVG_NS, 'linearGradient');
  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '100%');

  const startStop = document.createElementNS(SVG_NS, 'stop');
  startStop.setAttribute('offset', '0%');
  startStop.setAttribute('stop-color', startColor);

  const endStop = document.createElementNS(SVG_NS, 'stop');
  endStop.setAttribute('offset', '100%');
  endStop.setAttribute('stop-color', endColor);

  gradient.appendChild(startStop);
  gradient.appendChild(endStop);

  const swatchId = `${gradientId}-swatch`;
  const swatch = document.createElementNS(SVG_NS, 'rect');
  swatch.setAttribute('id', swatchId);
  swatch.setAttribute('x', '0');
  swatch.setAttribute('y', '0');
  swatch.setAttribute('width', '100%');
  swatch.setAttribute('height', '100%');
  swatch.setAttribute('fill', `url(#${gradientId})`);

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', filterId);
  filter.setAttribute('x', '-50%');
  filter.setAttribute('y', '-50%');
  filter.setAttribute('width', '200%');
  filter.setAttribute('height', '200%');

  const gradientImage = document.createElementNS(SVG_NS, 'feImage');
  gradientImage.setAttribute('href', `#${swatchId}`);
  gradientImage.setAttributeNS(XLINK_NS, 'xlink:href', `#${swatchId}`);
  gradientImage.setAttribute('x', '-50%');
  gradientImage.setAttribute('y', '-50%');
  gradientImage.setAttribute('width', '200%');
  gradientImage.setAttribute('height', '200%');
  gradientImage.setAttribute('result', 'gradient-fill');

  const gradientOverlay = document.createElementNS(SVG_NS, 'feComposite');
  gradientOverlay.setAttribute('in', 'gradient-fill');
  gradientOverlay.setAttribute('in2', 'SourceGraphic');
  gradientOverlay.setAttribute('operator', 'in');
  gradientOverlay.setAttribute('result', 'tinted-icon');

  filter.appendChild(gradientImage);
  filter.appendChild(gradientOverlay);

  defs.appendChild(gradient);
  defs.appendChild(swatch);
  defs.appendChild(filter);

  return defs;
}
