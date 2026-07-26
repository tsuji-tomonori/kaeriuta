import fs from 'node:fs';
import { scenes } from '../src/data/scenario/index.js';

const manifest = JSON.parse(fs.readFileSync(new URL('../assets/manifest.json', import.meta.url), 'utf8'));
const missing = manifest.assets.filter((asset) => !fs.existsSync(new URL(`../${asset.file}`, import.meta.url)));
const endings = new Set();
const incoming = new Map();
for (const id of Object.keys(scenes)) incoming.set(id, 0);
function walk(nodes) { for (const node of nodes) { if (node.t === 'jump') incoming.set(node.scene, (incoming.get(node.scene) || 0) + 1); if (node.t === 'end') endings.add(node.endingId); if (node.t === 'if') { walk(node.then || []); walk(node.else || []); } } }
Object.values(scenes).forEach((scene) => walk(scene.nodes));
const unreachable = [...incoming].filter(([id, count]) => id !== 'prologue' && count === 0).map(([id]) => id);
const expected = ['a1_arrest','a2_escape','a3_puppet','a4_reversal','b1_true','b2_unfinished','b3_silenced'];
const absent = expected.filter((id) => !endings.has(id));
if (unreachable.length || absent.length) { console.error(`統合検証: 失敗\n到達不能: ${unreachable.join(', ') || 'なし'}\n未定義END: ${absent.join(', ') || 'なし'}`); process.exit(1); }
console.log(`統合検証: シーン${Object.keys(scenes).length}件・7END・遷移を確認`);
console.log(`アセット欠落 ${missing.length}件: プレースホルダで継続可能`);
missing.forEach((asset) => console.log(`- ${asset.id}`));
