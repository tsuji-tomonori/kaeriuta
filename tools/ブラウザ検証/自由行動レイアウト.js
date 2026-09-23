// ブラウザは起動しない。実プレイ時にDevTools等から呼ぶ表示領域の検査。
// 例: (await import('/tools/ブラウザ検証/自由行動レイアウト.js')).checkFreeActionLayout()
export function checkFreeActionLayout(root = document.querySelector('.fa-screen')) {
  if (!root) throw new Error('自由行動画面を開いてください');
  const width = innerWidth, height = innerHeight;
  const inside = (r, clip = {left:0, top:0, right:width, bottom:height}) => r.left >= clip.left && r.right <= clip.right && r.top >= clip.top && r.bottom <= clip.bottom;
  const list = root.querySelector('.fa-list');
  let visibleNames = 0;
  if (list) {
    const panel = root.querySelector('.fa-body').getBoundingClientRect();
    const clip = {left:Math.max(0, panel.left),right:Math.min(width, panel.right),top:Math.max(0, panel.top),bottom:Math.min(height, panel.bottom)};
    visibleNames = [...list.querySelectorAll('.fa-row .ku-card-name')].filter(el => inside(el.getBoundingClientRect(), clip)).length;
    if (width === 1280 && height === 720 && list.children.length >= 4 && visibleNames < 4) throw new Error(`行動名は${visibleNames}件しか見えません`);
    if (width === 844 && height === 390 && list.children.length >= 3 && visibleNames < 3) throw new Error(`行動名は${visibleNames}件しか見えません`);
    for (const el of list.querySelectorAll('.ku-card-name')) if (el.scrollWidth > el.clientWidth) throw new Error('行動名が横にはみ出しています');
  }
  const buttons = [...root.querySelectorAll('.ku-thumbzone button')];
  for (const button of buttons) if (!inside(button.getBoundingClientRect())) throw new Error(`操作が画面外: ${button.textContent}`);
  const reading = root.querySelector('.fa-narrative');
  if (reading && buttons.length && reading.getBoundingClientRect().bottom > Math.min(...buttons.map(b => b.getBoundingClientRect().top))) throw new Error('本文と操作ボタンが重なっています');
  const takeaway = root.querySelector(width <= 900 || height <= 520 ? '.fa-result-summary' : '.fa-takeaway');
  if (root.dataset.phase === 'reading') {
    if (!takeaway || !inside(takeaway.getBoundingClientRect())) throw new Error('獲得物の要約が画面外です');
    if (takeaway.scrollHeight > takeaway.clientHeight + 2) throw new Error('獲得物が領域からあふれています');
    if (reading.getBoundingClientRect().bottom > takeaway.getBoundingClientRect().top && width <= 900) throw new Error('本文と要約が重なっています');
  }
  return {width, height, visibleNames, fixedButtons:buttons.length};
}
