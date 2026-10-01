// Issue #15 / #16 の、明示的にレビューされた選択間だけを測る。
// bg / chapterTitle は出来事境界の候補であり、意味ある行動とは見なさない。
export const pacingRanges = [
  { id:'prologue_gap', issue:15, name:'散会後から第一章の受け答え',
    start:{ scene:'prologue', prompt:'散会後、どうする？' },
    end:{ scene:'chapter1', prompt:'厨房にいた理由をどう答える？' }, passSeconds:160, failAboveSeconds:240 },
  { id:'chapter3_fork', issue:16, name:'蘭子への返答から最大分岐',
    start:{ scene:'chapter3', prompt:'蘭子の言葉に答える' },
    end:{ scene:'chapter3', prompt:'左へ――凶器を取る　／　右へ――少年の部屋の扉を叩く' }, passSeconds:240, failAboveSeconds:320 },
];
const isChoice = (node, state, anchor) => node.t === 'choice' && state.sceneId === anchor.scene && node.prompt === anchor.prompt;
const characters = text => Array.from(text).length;
export function visibleNarrativeText(node) {
  if (node.t === 'stage') return `【${String(node.text).replace(/^【\s*|\s*】$/g, '')}】`;
  return ['say','mono'].includes(node.t) ? String(node.text) : null;
}
export function estimatedReadingSeconds(characterCount, fixedWaitSeconds = 0, charactersPerMinute = 653) {
  if (!Number.isInteger(characterCount) || characterCount < 0 || !Number.isFinite(fixedWaitSeconds) || fixedWaitSeconds < 0 || !Number.isFinite(charactersPerMinute) || charactersPerMinute <= 0) throw new Error('文字数・固定待機秒・読書速度が不正です');
  return characterCount / charactersPerMinute * 60 + fixedWaitSeconds;
}
const position = state => ({ scene:state.sceneId, stack:structuredClone(state.executionStack) });

export function createPacingObserver(ranges = pacingRanges) {
  const active = new Map(), completed = new Map();
  function observe({ node, state }) {
    for (const range of ranges) {
      if (isChoice(node, state, range.start)) {
        if (active.has(range.id) || completed.has(range.id)) throw new Error(`${range.id}: 開始選択を重複観測しました`);
        active.set(range.id, { range, start:position(state), nodes:[], boundaryCandidates:[] });
        continue;
      }
      const current = active.get(range.id);
      if (!current) continue;
      if (isChoice(node, state, range.end)) {
        const characterCount = current.nodes.reduce((sum, entry) => sum + entry.characters, 0);
        // 現在のランタイムは本文・章題・画像の演出に強制待機を設けていない。
        // 「数秒、静止」という本文だけを固定待機として加算しない。
        const seconds = estimatedReadingSeconds(characterCount);
        completed.set(range.id, { ...current, end:position(state), characters:characterCount,
          fixedWaitSeconds:0, estimatedSeconds:seconds, slowReaderSeconds:estimatedReadingSeconds(characterCount,0,300),
          timeGate:seconds <= range.passSeconds ? 'pass' : seconds <= range.failAboveSeconds ? 'warning' : 'fail' });
        active.delete(range.id);
        continue;
      }
      if (node.t === 'choice' || node.t === 'call' || node.t === 'end' || node.t === 'wait') throw new Error(`${range.id}: 未評価の操作または待機 ${node.t}。MAGを推測せず範囲を再確認してください`);
      const text = visibleNarrativeText(node);
      if (text !== null) current.nodes.push({ ...position(state), type:node.t, speaker:node.who ?? null, text, characters:characters(text) });
      if (node.t === 'bg' || node.t === 'chapterTitle') current.boundaryCandidates.push({ ...position(state), type:node.t, value:node.id ?? node.text, afterCharacters:current.nodes.reduce((sum, entry) => sum + entry.characters, 0) });
    }
  }
  function result() {
    for (const range of ranges) if (!completed.has(range.id)) throw new Error(`${range.id}: 開始または終点が未観測です`);
    return ranges.map(range => completed.get(range.id));
  }
  return { observe, result };
}
