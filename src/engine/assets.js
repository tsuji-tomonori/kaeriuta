let manifest = null;
const available = new Set();
const placeholders = new Map();
export async function loadManifest() {
  if (manifest) return manifest;
  try {
    manifest = await (await fetch('assets/manifest.json')).json();
    await Promise.all(manifest.assets.map(async (asset) => { try { if ((await fetch(asset.file, { method: 'HEAD' })).ok) available.add(asset.id); } catch {} }));
  } catch { manifest = { assets: [] }; }
  return manifest;
}
export function assetInfo(id) { return manifest?.assets?.find((a) => a.id === id) ?? { id, 用途: '未定義アセット', size: '1280x720' }; }
export function placeholder(id, usage = '未生成アセット') {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  const c = canvas.getContext('2d'); const g = c.createLinearGradient(0, 0, 1280, 720);
  g.addColorStop(0, '#18232c'); g.addColorStop(1, '#4a3034'); c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
  c.strokeStyle = '#c9b77c'; c.lineWidth = 3; c.strokeRect(36, 36, 1208, 648);
  c.fillStyle = '#f5efd8'; c.textAlign = 'center'; c.font = '42px serif'; c.fillText('ASSET PLACEHOLDER', 640, 310);
  c.font = '30px serif'; c.fillText(id, 640, 370); c.font = '22px serif'; c.fillText(usage, 640, 412);
  return canvas.toDataURL('image/png');
}
export function resolveAsset(id) {
  const info = assetInfo(id);
  // 音声は読み込み可否の事前確認を待たず、Audio に実ファイルを委ねる。
  // 失敗時は AudioManager 側が安全に無音へフォールバックする。
  if (info.kind === 'bgm' || info.kind === 'se') return { ...info, src: info.file };
  if (available.has(id)) return { ...info, src: info.file };
  if (!placeholders.has(id)) placeholders.set(id, placeholder(id, info.用途));
  return { ...info, src: placeholders.get(id) };
}
