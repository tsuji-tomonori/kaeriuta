import { loadManifest, resolveAsset } from './engine/assets.js';
import { AudioManager } from './engine/audio.js';
import { createGameState } from './engine/state.js';
import { saveGame, loadGame } from './engine/save.js';
import { applyEffect, applyNodeEffect, evaluateCondition } from './engine/script-runner.js';
import { advanceExecution, currentNode, enterBranch, gotoLabel, resetExecution } from './engine/execution.js';
import { flags } from './data/flags.js';
import { characters } from './data/characters.js';
import { scenes } from './data/scenario/index.js';
import { createScreen, setBackground } from './ui/screen.js';
import { createMessageWindow } from './ui/message-window.js';
import { createChoice } from './ui/choice.js';
import { createCharacterLayer } from './ui/character-layer.js';
import { showTitle } from './ui/title.js';
import { parts } from './systems/index.js';

const app = document.querySelector('#app'); let state; let screen; let message; let choices; let charas; let partActive = false; const audio = new AudioManager();
await loadManifest(); showTitle(app, { onStart: () => start(createGameState()), onLoad: (slot) => { const saved = loadGame(slot); if (saved) start(saved); } });

function start(saved) {
  state = saved; screen = createScreen(app); charas = createCharacterLayer(screen.chara); choices = createChoice(screen.choice); message = createMessageWindow(screen.message, advance);
  renderHud(); run();
}
function renderHud() {
  screen.hud.innerHTML = `<span>疑惑 ${state.params.suspicion}</span><span>確信 ${state.params.conviction}</span><span>🕯${state.flags.past.length}　📜${state.flags.plan.length}　👁${state.flags.alive.length}</span><button id="save">セーブ</button><button id="title">タイトルへ</button>`;
  screen.hud.querySelector('#save').onclick = () => { if (partActive) return alert('特殊パートの途中ではセーブできません。完了後に保存してください。'); saveGame('auto', state); saveGame('1', state); alert('セーブ1とオートセーブに記録しました。'); };
  screen.hud.querySelector('#title').onclick = () => location.reload();
}
function advance() { if (!choicesActive()) { state = advanceExecution(state, scenes[state.sceneId]); run(); } }
function choicesActive() { return Boolean(screen.choice.children.length); }
function run() {
  // Keep the currently executing scene observable for the browser verification
  // harness. This is also useful when diagnosing a save supplied by a tester.
  app.dataset.sceneId = state.sceneId;
  const scene = scenes[state.sceneId];
  while (currentNode(scene, state)) {
    const node = currentNode(scene, state);
    if (node.t === 'bg') { setBackground(screen.background, resolveAsset(node.id).src); state = advanceExecution(state, scene); continue; }
    if (node.t === 'chara') { charas.show(node.id, node.expr, node.pos, node.action); state = advanceExecution(state, scene); continue; }
    if (node.t === 'cg') { screen.cg.style.backgroundImage = `url("${resolveAsset(node.id).src}")`; state = advanceExecution(state, scene); continue; }
    if (node.t === 'bgm') { audio.playBGM(node.id, node.fade); state = advanceExecution(state, scene); continue; }
    if (node.t === 'se') { audio.playSE(node.id); state = advanceExecution(state, scene); continue; }
    if (node.t === 'flag' || node.t === 'item' || node.t === 'param' || node.t === 'log') { state = applyNodeEffect(state, node, flags); renderHud(); state = advanceExecution(state, scene); continue; }
    if (node.t === 'if') { state = enterBranch(state, scene, node, evaluateCondition(node.cond, state, flags) ? 'then' : 'else'); continue; }
    if (node.t === 'label') { state = advanceExecution(state, scene); continue; }
    if (node.t === 'choice') { const available = node.options.filter((o) => evaluateCondition(o.cond, state, flags)); choices.show(node.prompt, available, (o) => { state = (o.effects || []).reduce((s, e) => applyEffect(s, e, flags), state); choices.clear(); const result = gotoLabel(state, scene, o.goto); if (!result.found) { console.error(`[scenario] goto label not found: ${o.goto} (scene: ${state.sceneId})`); state = advanceExecution(state, scene); } else state = result.state; renderHud(); run(); }); return; }
    if (node.t === 'chapterTitle') { screen.chapter.textContent = node.text; screen.chapter.classList.add('show'); setTimeout(() => screen.chapter.classList.remove('show'), 1800); state = advanceExecution(state, scene); continue; }
    if (node.t === 'stage') {
      screen.stage.textContent = `【${String(node.text).replace(/^【\s*|\s*】$/g, '')}】`;
      screen.stage.classList.add('show'); message.hide();
      screen.stage.onclick = () => {
        screen.stage.classList.remove('show');
        screen.stage.onclick = null;
        advance();
      };
      return;
    }
    if (node.t === 'say' || node.t === 'mono') { const who = node.t === 'say' && node.who ? characters[node.who]?.name : null; message.show(who, node.text, node.t === 'mono'); return; }
    if (node.t === 'end') { state.endingId = node.endingId; saveGame('auto', state); message.show(null, 'END\nオートセーブしました。タイトルへ戻るには右上のボタンを押してください。'); return; }
    if (node.t === 'jump') { state.sceneId = node.scene; state = resetExecution(state); run(); return; }
    if (node.t === 'call') { const part = parts[node.part]; if (!part) { console.error(`[parts] 未登録part: ${node.part}`); message.show(null, `特殊パート「${node.part}」はα版未実装です。`); return; } partActive = true; part.start({ state, mount: document.body }, node.args || {}).then((result = {}) => { partActive = false; state = (result.effects || []).reduce((s, effect) => applyEffect(s, effect, flags), state); renderHud(); if (result.endingId && node.args?.routeEnding !== false && scenes[`end_${result.endingId}`]) { state.sceneId = `end_${result.endingId}`; state = resetExecution(state); run(); return; } state = advanceExecution(state, scenes[state.sceneId]); run(); }).catch((error) => { partActive = false; console.error(error); message.show(null, `特殊パートの実行に失敗しました: ${node.part}`); }); return; }
    state = advanceExecution(state, scene);
  }
}
