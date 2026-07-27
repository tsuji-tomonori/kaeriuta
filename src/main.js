import { loadManifest, resolveAsset } from './engine/assets.js';
import { AudioManager } from './engine/audio.js';
import { createGameState } from './engine/state.js';
import {
  AUTO_SLOT,
  loadGame,
  listSaves,
  saveGame,
} from './engine/save.js';
import {
  flushRead,
  isRead,
  loadProgress,
  loadSettings,
  markRead,
  recordEnding,
  saveProgress,
} from './engine/progress.js';
import { applyEffect, applyNodeEffect, evaluateCondition } from './engine/script-runner.js';
import {
  advanceExecution,
  currentNode,
  enterBranch,
  gotoLabel,
  resetExecution,
} from './engine/execution.js';
import { chapterSlot, chapters, CONTINUE_SLOTS } from './data/chapters.js';
import { flags } from './data/flags.js';
import { characters } from './data/characters.js';
import { scenes } from './data/scenario/index.js';
import { createScreen, setBackground } from './ui/screen.js';
import { createMessageWindow } from './ui/message-window.js';
import { createChoice } from './ui/choice.js';
import { createCharacterLayer } from './ui/character-layer.js';
import { shouldShowAdvance } from './ui/advance-visibility.js';
import { showTitle } from './ui/title.js';
import { showGallery } from './ui/gallery.js';
import { openSaveMenu } from './ui/save-menu.js';
import { createHud } from './ui/hud.js';
import { createBacklog } from './ui/backlog.js';
import { isDialogOpen, showConfirm } from './ui/dialog.js';
import { openSettings } from './ui/settings.js';
import { createPlayback } from './engine/playback.js';
import { createNotebook } from './systems/notebook/index.js';
import { parts } from './systems/index.js';
import { buildEndingExplanation } from './data/endings-meta.js';

let activeSession = null;
let initializedRoot = null;
let inputDocument = null;
let keydownHandler = null;
let wheelHandler = null;

export function nodeKeyFromState(state) {
  const frame = state?.executionStack?.at(-1);
  if (!frame || !Array.isArray(frame.path) || !Number.isInteger(frame.index)) return null;
  return `${frame.path.join('.')}#${frame.index}`;
}

export function saveChapterSnapshot(state, {
  fromLoad = false,
  storage = globalThis.localStorage,
  now = () => Date.now(),
} = {}) {
  const slot = chapterSlot(state?.sceneId);
  if (!slot || fromLoad) return false;
  saveGame(slot, state, storage);
  const progress = loadProgress(storage);
  progress.chapters[state.sceneId] = { slot, reachedAt: now() };
  saveProgress(progress, storage);
  return true;
}

function latestContinueSlot(storage = globalThis.localStorage) {
  return listSaves(CONTINUE_SLOTS, storage)
    .filter((save) => save.exists)
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0]?.slot ?? null;
}

function closeTransientUi(session) {
  session?.playback?.stop();
  session?.saveMenu?.close?.();
  session?.settings?.close?.();
  session?.backlog?.close();
  session?.notebook?.close();
  session?.message?.hide();
  session?.charas?.clear();
  session?.audio?.stopBGM();
  session?.screen?.choice && session.choices?.clear();
  session?.root?.querySelectorAll?.('.parts-modal').forEach((element) => element.remove());
}

function disposeSession() {
  if (!activeSession) return;
  activeSession.disposed = true;
  closeTransientUi(activeSession);
  activeSession = null;
}

function overlaysOpen(session) {
  return isDialogOpen()
    || Boolean(session?.saveMenu)
    || session?.settings?.isOpen?.()
    || session?.backlog?.isOpen()
    || session?.notebook?.isOpen();
}

function bindInput(documentRef) {
  if (inputDocument && keydownHandler) inputDocument.removeEventListener('keydown', keydownHandler);
  if (inputDocument && wheelHandler) inputDocument.removeEventListener('wheel', wheelHandler);
  inputDocument = documentRef;

  keydownHandler = (event) => {
    const session = activeSession;
    if (!session || session.disposed || event.repeat) return;
    if (event.key === 'Escape') {
      if (session.saveMenu) session.saveMenu.close();
      else if (session.settings?.isOpen?.()) session.settings.close();
      else if (session.backlog.isOpen()) session.backlog.close();
      else if (session.notebook.isOpen()) session.notebook.close();
      return;
    }
    const tagName = event.target?.tagName?.toLowerCase();
    const editing = event.target?.isContentEditable
      || ['input', 'textarea', 'select', 'button'].includes(tagName);
    if (editing) return;
    if (overlaysOpen(session)) return;

    const key = event.key.toLowerCase();
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      session.manualAdvance();
    } else if (event.key === 'Control') {
      event.preventDefault();
      session.playback.toggleSkip();
    } else if (key === 's') {
      event.preventDefault();
      session.openSave();
    } else if (key === 'a') {
      event.preventDefault();
      session.playback.toggleAuto();
    } else if (key === 'l') {
      event.preventDefault();
      session.openLoad();
    } else if (key === 'n') {
      event.preventDefault();
      session.playback.stop();
      session.notebook.toggle();
    }
  };

  wheelHandler = (event) => {
    const session = activeSession;
    if (!session || session.disposed || event.deltaY >= 0 || overlaysOpen(session)) return;
    event.preventDefault();
    session.playback.stop();
    session.backlog.open();
  };

  documentRef.addEventListener('keydown', keydownHandler);
  documentRef.addEventListener('wheel', wheelHandler, { passive: false });
}

function renderTitleScreen(root) {
  disposeSession();
  flushRead();
  root.removeAttribute?.('data-scene-id');
  showTitle(root, {
    onStart: () => startGame(root, createGameState()),
    onContinue: () => {
      const slot = latestContinueSlot();
      const saved = slot && loadGame(slot);
      if (saved) startGame(root, saved, { fromLoad: true });
    },
    onLoad: (slot) => {
      const saved = loadGame(slot);
      if (saved) startGame(root, saved, { fromLoad: true });
    },
    onChapter: (key) => {
      const chapter = chapters.find((entry) => entry.key === key);
      const saved = chapter && loadGame(chapter.slot);
      if (saved) startGame(root, saved, { fromLoad: true });
    },
    onGallery: () => {
      disposeSession();
      showGallery(root, {
        onBack: () => renderTitleScreen(root),
        onReplay: (sceneId) => {
          const replay = createGameState();
          replay.sceneId = sceneId;
          startGame(root, resetExecution(replay), { replay: true });
        },
      });
    },
  });
}

function startGame(root, initialState, { fromLoad = false, replay = false } = {}) {
  disposeSession();
  const session = {
    root,
    state: initialState,
    screen: createScreen(root),
    audio: new AudioManager(),
    partActive: false,
    endingActive: false,
    disposed: false,
    saveMenu: null,
    settings: null,
    prePartState: null,
    currentDisplay: null,
  };
  activeSession = session;

  session.charas = createCharacterLayer(session.screen.chara);
  session.choices = createChoice(session.screen.choice);
  session.backlog = createBacklog({ mount: root.querySelector('#game-screen') });
  session.notebook = createNotebook({
    mount: root.querySelector('#game-screen'),
    getState: () => session.state,
  });

  const choicesActive = () => Boolean(session.screen.choice.children.length);
  const renderHud = () => {
    session.hud.render(session.state);
    session.hud.setEnabled({ save: true });
  };
  const refreshPlayback = (revealing = session.message.isRevealing()) => {
    if (!session.currentDisplay) return;
    session.playback.notify({
      ...session.currentDisplay,
      revealing,
      choicesActive: choicesActive(),
      partActive: session.partActive,
      dialogActive: isDialogOpen(),
      backlogActive: session.backlog.isOpen(),
      notebookActive: session.notebook.isOpen(),
    });
  };
  const advanceStory = () => {
    if (session.disposed || choicesActive() || session.partActive || session.endingActive) return;
    session.state = advanceExecution(session.state, scenes[session.state.sceneId]);
    run();
  };
  const automaticAdvance = () => {
    if (session.disposed || overlaysOpen(session)) return;
    if (session.message.isRevealing()) {
      session.message.completeReveal();
      refreshPlayback(false);
      return;
    }
    advanceStory();
  };
  session.manualAdvance = (fromMessage = false) => {
    if (session.disposed || overlaysOpen(session) || choicesActive()
      || session.partActive || session.endingActive) return;
    session.playback.stop();
    if (!fromMessage && session.message.isRevealing()) {
      session.message.completeReveal();
      return;
    }
    advanceStory();
  };
  session.message = createMessageWindow(
    session.screen.message,
    () => session.manualAdvance(true),
  );
  session.message.setSpeed(loadSettings().textSpeed);
  session.audio.applySettings?.(loadSettings());
  session.playback = createPlayback({
    advance: automaticAdvance,
    isReadNode: (nodeKey) => isRead(session.state.sceneId, nodeKey, loadProgress()),
    getSettings: () => loadSettings(),
    onModeChange: (modes) => {
      session.hud?.setModes(modes);
      session.charas.setInstant(modes.skip);
    },
  });

  const openSaveMenuFor = (mode) => {
    session.playback.stop();
    session.saveMenu?.close?.();
    session.saveMenu = openSaveMenu({
      mount: root.querySelector('#game-screen'),
      mode,
      state: session.partActive && session.prePartState ? session.prePartState : session.state,
      saveMeta: session.partActive && session.prePartState ? {
        resume: 'part-start',
        partName: session.partName,
      } : undefined,
      onLoad: (slot) => {
        const saved = loadGame(slot);
        if (saved) startGame(root, saved, { fromLoad: true });
      },
      onClose: () => {
        if (activeSession === session) session.saveMenu = null;
      },
    });
  };
  session.openSave = () => {
    if (session.partActive) {
      session.playback.stop();
      showConfirm({
        mount: root.querySelector('#game-screen'),
        title: '特殊パート中のセーブ',
        body: '特殊パートの途中です。この特殊パートの開始時点から再開できるように保存します。',
        okLabel: 'セーブ画面へ',
        cancelLabel: '戻る',
      }).then((accepted) => {
        if (accepted && activeSession === session) openSaveMenuFor('save');
      });
      return;
    }
    openSaveMenuFor('save');
  };
  session.openLoad = () => openSaveMenuFor('load');
  const requestTitle = async () => {
    session.playback.stop();
    const accepted = await showConfirm({
      mount: root.querySelector('#game-screen'),
      title: 'タイトルへ戻りますか？',
      body: '最後に保存した地点より後の進行は失われます。',
      okLabel: 'タイトルへ戻る',
      cancelLabel: 'ゲームを続ける',
      danger: true,
    });
    if (accepted && activeSession === session) renderTitleScreen(root);
  };
  session.hud = createHud(session.screen.hud, {
    onSave: session.openSave,
    onLoad: session.openLoad,
    onTitle: requestTitle,
    onNotebook: () => {
      session.playback.stop();
      session.notebook.toggle();
    },
    onBacklog: () => {
      session.playback.stop();
      session.backlog.toggle();
    },
    onSkip: () => session.playback.toggleSkip(),
    onAuto: () => session.playback.toggleAuto(),
    onConfig: () => {
      session.playback.stop();
      session.settings?.close?.();
      session.settings = openSettings({
        mount: root.querySelector('#game-screen'),
        onChange: (settings) => {
          session.message.setSpeed(settings.textSpeed);
          session.audio.applySettings?.(settings);
        },
      });
    },
  });

  function showText(node, who, text, mode) {
    const nodeKey = nodeKeyFromState(session.state);
    const wasRead = isRead(session.state.sceneId, nodeKey, loadProgress());
    markRead(session.state.sceneId, nodeKey);
    session.charas.setSpeaker(node.t === 'say' ? node.who : null);
    session.backlog.push({
      who: node.t === 'stage' ? '―― 場面 ――' : who,
      text,
      mono: node.t === 'mono' || node.t === 'stage',
      sceneId: session.state.sceneId,
    });
    session.message.show(
      who,
      text,
      mode,
      shouldShowAdvance({
        nodeType: node.t,
        choicesActive: choicesActive(),
        partActive: session.partActive,
      }),
    );
    session.currentDisplay = {
      nodeType: node.t,
      nodeKey,
      read: wasRead,
      textLength: Array.from(String(text)).length,
    };
    refreshPlayback();
  }

  function transitionTo(sceneId, options = {}) {
    session.state.sceneId = sceneId;
    session.state = resetExecution(session.state);
    saveChapterSnapshot(session.state, options);
    run();
  }

  function run() {
    if (session.disposed || activeSession !== session) return;

    // ブラウザ検証とAIプレイが現在シーンを観測するための公開状態。
    root.dataset.sceneId = session.state.sceneId;
    const scene = scenes[session.state.sceneId];
    if (!scene) {
      console.error(`[scenario] scene not found: ${session.state.sceneId}`);
      return;
    }

    while (currentNode(scene, session.state)) {
      const node = currentNode(scene, session.state);
      if (node.t === 'bg') {
        setBackground(session.screen.background, resolveAsset(node.id).src, {
          transition: node.transition || 'fade',
        });
        session.charas.clear();
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'chara') {
        session.charas.show(node.id, node.expr, node.pos, node.action);
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'cg') {
        setBackground(session.screen.cg, resolveAsset(node.id).src, {
          transition: node.transition || 'fade',
        });
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'bgm') {
        session.audio.playBGM(node.id, node.fade);
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'se') {
        session.audio.playSE(node.id);
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (['flag', 'item', 'param', 'log'].includes(node.t)) {
        session.state = applyNodeEffect(session.state, node, flags);
        renderHud();
        session.notebook.refresh();
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'if') {
        session.state = enterBranch(
          session.state,
          scene,
          node,
          evaluateCondition(node.cond, session.state, flags) ? 'then' : 'else',
        );
        continue;
      }
      if (node.t === 'label') {
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'choice') {
        session.playback.stop();
        session.charas.setSpeaker(null);
        session.message.hide();
        const available = node.options.filter((option) => (
          evaluateCondition(option.cond, session.state, flags)
        ));
        session.choices.show(node.prompt, available, (option) => {
          if (session.disposed) return;
          session.state = (option.effects || []).reduce(
            (next, effect) => applyEffect(next, effect, flags),
            session.state,
          );
          session.choices.clear();
          const result = gotoLabel(session.state, scene, option.goto);
          if (!result.found) {
            console.error(`[scenario] goto label not found: ${option.goto} (scene: ${session.state.sceneId})`);
            session.state = advanceExecution(session.state, scene);
          } else {
            session.state = result.state;
          }
          renderHud();
          session.notebook.refresh();
          run();
        });
        return;
      }
      if (node.t === 'chapterTitle') {
        session.screen.chapter.textContent = node.text;
        session.screen.chapter.classList.add('show');
        setTimeout(() => session.screen.chapter.classList.remove('show'), 1800);
        session.state = advanceExecution(session.state, scene);
        continue;
      }
      if (node.t === 'stage') {
        const text = `【${String(node.text).replace(/^【\s*|\s*】$/g, '')}】`;
        showText(node, null, text, 'stage');
        return;
      }
      if (node.t === 'say' || node.t === 'mono') {
        const who = node.t === 'say' && node.who ? characters[node.who]?.name : null;
        showText(node, who, node.text, node.t === 'mono');
        return;
      }
      if (node.t === 'end') {
        session.playback.stop();
        session.charas.setSpeaker(null);
        session.endingActive = true;
        session.state.endingId = node.endingId;
        recordEnding(node.endingId, session.state);
        flushRead();
        saveGame(AUTO_SLOT, session.state);
        renderHud();
        const ending = buildEndingExplanation(node.endingId, session.state);
        session.message.show(
          null,
          `END\n${ending.title}\n${ending.metrics}\n${ending.reason}\n${ending.detail}\n${ending.nextHint}\nオートセーブしました。`,
          false,
          shouldShowAdvance({ nodeType: node.t, ending: true }),
        );
        session.choices.show('', [{ label: 'タイトルへ戻る' }, { label: '回想モードへ' }], (option) => {
          if (activeSession !== session) return;
          if (option.label === '回想モードへ') showGallery(root, { onBack: () => renderTitleScreen(root), onReplay: (sceneId) => { const replay = createGameState(); replay.sceneId = sceneId; startGame(root, resetExecution(replay), { replay: true }); } });
          else renderTitleScreen(root);
        });
        return;
      }
      if (node.t === 'jump') {
        session.playback.stop();
        session.charas.setSpeaker(null);
        transitionTo(node.scene);
        return;
      }
      if (node.t === 'call') {
        session.playback.stop();
        session.charas.setSpeaker(null);
        const part = parts[node.part];
        if (!part) {
          console.error(`[parts] 未登録part: ${node.part}`);
          session.message.show(null, `特殊パート「${node.part}」はα版未実装です。`);
          return;
        }
        session.prePartState = structuredClone(session.state);
        session.partName = node.part;
        session.partActive = true;
        renderHud();
        part.start({ state: session.state, mount: root.querySelector('#game-screen') }, node.args || {})
          .then((result = {}) => {
            if (session.disposed || activeSession !== session) return;
            session.partActive = false;
            session.prePartState = null;
            session.partName = null;
            session.state = (result.effects || []).reduce(
              (next, effect) => applyEffect(next, effect, flags),
              session.state,
            );
            renderHud();
            session.notebook.refresh();
            if (result.endingId && node.args?.routeEnding !== false
              && scenes[`end_${result.endingId}`]) {
              transitionTo(`end_${result.endingId}`);
              return;
            }
            session.state = advanceExecution(
              session.state,
              scenes[session.state.sceneId],
            );
            run();
          })
          .catch((error) => {
            if (session.disposed || activeSession !== session) return;
            session.partActive = false;
            session.prePartState = null;
            session.partName = null;
            renderHud();
            console.error(error);
            session.message.show(null, `特殊パートの実行に失敗しました: ${node.part}`);
          });
        return;
      }
      session.state = advanceExecution(session.state, scene);
    }
  }

  renderHud();
  if (!replay) saveChapterSnapshot(session.state, { fromLoad });
  run();
}

export async function initializeApp({
  root = globalThis.document?.querySelector?.('#app'),
  documentRef = globalThis.document,
  loadAssets = true,
  showInitialTitle = true,
} = {}) {
  try {
    if (!root) throw new Error('#app が見つかりません。');
    if (!documentRef?.addEventListener) throw new Error('document が利用できません。');
    disposeSession();
    initializedRoot = root;
    bindInput(documentRef);
    if (loadAssets) await loadManifest();
    if (showInitialTitle) renderTitleScreen(root);
    return {
      showTitle: () => renderTitleScreen(root),
      dispose: () => {
        disposeSession();
        if (inputDocument && keydownHandler) inputDocument.removeEventListener('keydown', keydownHandler);
        if (inputDocument && wheelHandler) inputDocument.removeEventListener('wheel', wheelHandler);
        inputDocument = null;
        keydownHandler = null;
        wheelHandler = null;
        initializedRoot = null;
      },
    };
  } finally {
    documentRef?.querySelector?.('#boot-loader')?.remove();
  }
}

if (typeof document !== 'undefined') {
  const app = document.querySelector('#app');
  if (app && initializedRoot !== app) await initializeApp({ root: app });
}
