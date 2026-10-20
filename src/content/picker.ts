import { getSiteKey } from '../shared/domain';
import { buildSelector } from './selector';

const win = window as Window & { __elementPickerStop?: () => void };
win.__elementPickerStop?.();
const site = getSiteKey(location.href);
if (site) {
  const outline = document.createElement('div');
  outline.id = '__element-picker-outline';
  Object.assign(outline.style, { position: 'fixed', pointerEvents: 'none', zIndex: '2147483647', border: '2px solid #4f46e5', boxSizing: 'border-box', display: 'none' });
  document.documentElement.appendChild(outline);
  const move = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const rect = event.target.getBoundingClientRect();
    Object.assign(outline.style, { display: 'block', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  };
  const cleanup = () => {
    document.removeEventListener('mousemove', move, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('keydown', key, true);
    outline.remove();
    if (win.__elementPickerStop === cleanup) delete win.__elementPickerStop;
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cleanup(); }
  };
  const click = (event: MouseEvent) => {
    event.preventDefault(); event.stopImmediatePropagation();
    if (!(event.target instanceof HTMLElement || event.target instanceof SVGElement)) { cleanup(); return; }
    const target = event.target;
    try {
      const selector = buildSelector(target);
      const display = target.style.getPropertyValue('display');
      const priority = target.style.getPropertyPriority('display');
      target.style.setProperty('display', 'none', 'important');
      void chrome.runtime.sendMessage({ type: 'picker:save', site, selector }).then((result) => {
        if (result?.error) throw new Error(result.error);
      }).catch((error: unknown) => {
        if (display) target.style.setProperty('display', display, priority); else target.style.removeProperty('display');
        console.warn('Element hide was not saved', error);
      });
    } finally { cleanup(); }
  };
  win.__elementPickerStop = cleanup;
  document.addEventListener('mousemove', move, true);
  document.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
}
