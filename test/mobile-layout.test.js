import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const indexHtml = read('../index.html');
const mainCss = read('../src/styles/main.css');
const hudCss = read('../src/styles/hud.css');
const menuCss = read('../src/styles/menu.css');
const partsCss = read('../src/styles/parts.css');
const freeActionCss = read('../src/styles/追加-freeaction.css');
const boardCss = read('../src/styles/追加-board.css');

const landscapeQuery = /@media\s*\(orientation:\s*landscape\)[^{]*(?:max-height|pointer:\s*coarse)/;

test('スマートフォンの表示領域とセーフエリアを利用する', () => {
  assert.match(indexHtml, /viewport-fit=cover/);
  assert.match(indexHtml, /interactive-widget=resizes-content/);
  assert.match(mainCss, /100dvh/);
  assert.match(mainCss, /env\(safe-area-inset-top,0\)/);
});

test('縦向きではPC版表示を求めず横向き利用を案内する', () => {
  assert.match(indexHtml, /class="orientation-hint"/);
  assert.match(indexHtml, /PC版サイトへ切り替えず/);
  assert.match(mainCss, /@media\s*\(orientation:\s*portrait\)\s*and\s*\(max-width:\s*900px\)/);
  assert.match(mainCss, /\.orientation-hint\s*\{[\s\S]*?display:flex/);
});

test('横向きでは背景を残す3行メッセージ窓とタッチ領域を使う', () => {
  assert.match(mainCss, landscapeQuery);
  assert.match(mainCss, /--message-lines:\s*3/);
  assert.match(mainCss, /\.message-window\s*\{[\s\S]*?max-height:\s*48vh/);
  assert.match(mainCss, /\.advance\s*\{[\s\S]*?min-width:\s*44px/);
  assert.match(hudCss, landscapeQuery);
  assert.match(hudCss, /\.hud-button\s*\{[\s\S]*?min-height:\s*40px/);
});

test('横向きのレターボックスはshrink-to-fit の親に対する百分率で寸法を決めない', () => {
  const landscapeSection = mainCss.slice(
    mainCss.search(landscapeQuery),
    mainCss.indexOf('@media', mainCss.search(landscapeQuery) + 1),
  );
  const letterboxRule = landscapeSection.match(/\.letterbox\s*\{([\s\S]*?)\n  \}/)?.[1];

  assert.ok(letterboxRule, '横向き用の .letterbox ルールが必要です');
  assert.match(letterboxRule, /width:\s*min\([^;]*100dvw[^;]*\)/);
  assert.match(letterboxRule, /height:\s*min\([^;]*100dvh[^;]*\)/);
  assert.doesNotMatch(letterboxRule, /width:\s*min\(\s*100%/);
});

test('横向きではタイトル・セーブ・特殊パートも高さへ収める', () => {
  assert.match(menuCss, landscapeQuery);
  assert.match(menuCss, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(partsCss, landscapeQuery);
  assert.match(partsCss, /height:calc\(100dvh - 1rem\)/);
  assert.match(partsCss, /\.mansion-map\s*\{\s*max-height:48vh/);
});

test('自由行動の一覧と見取り図は重ならず、それぞれの領域でスクロールする', () => {
  assert.match(freeActionCss, /\.fa-main\s*\{[^}]*position:\s*relative/);
  assert.match(freeActionCss, /\.fa-main\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(freeActionCss, /\.fa-aside\s*\{[^}]*overflow-x:\s*hidden/);
});

test('手毬唄ボードの上部バーは閉じるボタンをタブへ折り返さない', () => {
  assert.match(boardCss, /\.ku-board-screen \.ku-topbar\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(boardCss, /\.ku-board-screen \.ku-title\s*\{[^}]*text-overflow:\s*ellipsis/);
});
