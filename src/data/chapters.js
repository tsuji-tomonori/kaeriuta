import { AUTO_SLOT, SAVE_SLOTS, listSaves } from '../engine/save.js';

export const chapters = [
  { key: 'prologue', label: 'プロローグ', sceneId: 'prologue', slot: 'chapter-prologue' },
  { key: 'ch1', label: '第一章', sceneId: 'chapter1', slot: 'chapter-1' },
  { key: 'ch2', label: '第二章', sceneId: 'chapter2', slot: 'chapter-2' },
  { key: 'ch3', label: '第三章', sceneId: 'chapter3', slot: 'chapter-3' },
  { key: 'ch4a', label: '第四章A', sceneId: 'chapter4a', slot: 'chapter-4a' },
  { key: 'ch4b', label: '第四章B', sceneId: 'chapter4b', slot: 'chapter-4b' },
];

const slotsByScene = new Map(chapters.map((chapter) => [chapter.sceneId, chapter.slot]));

export function chapterSlot(sceneId) {
  return slotsByScene.get(sceneId) ?? null;
}

export function availableChapters(storage = globalThis.localStorage) {
  const saves = new Map(listSaves(chapters.map((chapter) => chapter.slot), storage).map((save) => [save.slot, save]));
  return chapters.map((chapter) => {
    const save = saves.get(chapter.slot);
    return {
      ...chapter,
      available: Boolean(save?.exists),
      savedAt: save?.savedAt ?? null,
      meta: save?.meta ?? null,
    };
  });
}

export const CONTINUE_SLOTS = [...SAVE_SLOTS, AUTO_SLOT];
