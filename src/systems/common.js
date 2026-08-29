export function ensurePartsCss() {
  if (typeof document === 'undefined' || document.querySelector('link[data-kaeriuta-parts]')) return;
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('../styles/parts.css', import.meta.url).href; link.dataset.kaeriutaParts = '1'; document.head.append(link);
}
// Panel data is authored in several scenario files.  Keep missing display
// metadata from leaking into the UI as the literal strings "undefined",
// "null", or "NaN".
export function displayText(value, fallback = '') {
  return value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value)) ? fallback : String(value);
}
export function stateOf(ctx) { return ctx?.state || ctx || { params:{}, flags:{past:[],plan:[],alive:[]}, items:[], logs:{} }; }
export function has(ctx, id) { const s=stateOf(ctx); return (s.items||[]).includes(id) || Object.values(s.flags||{}).some((a)=>a.includes?.(id)); }
export function condition(ctx, cond) { if (!cond) return true; if (cond.flag || cond.item) return has(ctx, cond.flag||cond.item); if (cond.param) { const v=stateOf(ctx).params?.[cond.param]||0; return (cond.gte===undefined||v>=cond.gte)&&(cond.lte===undefined||v<=cond.lte); } if(cond.and)return cond.and.every(x=>condition(ctx,x)); if(cond.or)return cond.or.some(x=>condition(ctx,x)); if(cond.not)return !condition(ctx,cond.not); return false; }
export function modal(ctx, title) { ensurePartsCss(); const root=document.createElement('section'); root.className='parts-modal'; root.innerHTML=`<div class="parts-panel"><header><span>${displayText(title)}</span><button class="parts-close" aria-label="閉じる">×</button></header><main></main></div>`; (ctx?.mount||document.body).append(root); return {root, main:root.querySelector('main'), close:root.querySelector('.parts-close')}; }
// 反論・自由行動・手毬唄ボード再設計版の共通の土台。フルブリードの下辺親指圏レイアウトを使うパート専用。
export function screenRoot(ctx) { ensurePartsCss(); const root=document.createElement('section'); root.className='ku-screen'; root.innerHTML='<div class="ku-stage"></div>'; (ctx?.mount||document.body).append(root); return {root, stage:root.querySelector('.ku-stage')}; }
export function finish(root, resolve, result) { root.remove(); resolve(result); }
export function effectParam(key, delta) { return {t:'param',key,delta}; }
export function cardName(id) { return id.replaceAll('_',' '); }
