import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const tool = new URL('../tools/ボード整合検査.mjs', import.meta.url);
const reader = new URL('../tools/AIプレイ/lib/観測.js', import.meta.url);
const caller = new URL('../tools/AIプレイ/自動プレイ.js', import.meta.url);
const src = new URL('../src', import.meta.url);
async function runFixture(missingLabel = null) {
  const root = await mkdtemp(join(tmpdir(),'kaeriuta-board-integrity-'));
  try {
    const tools = join(root,'tools');
    const ai = join(tools,'AIプレイ');
    await mkdir(join(ai,'lib'),{recursive:true});
    await symlink(fileURLToPath(src),join(root,'src'));
    await copyFile(tool,join(tools,'ボード整合検査.mjs'));
    await copyFile(caller,join(ai,'自動プレイ.js'));
    const source = await readFile(reader,'utf8');
    if (missingLabel) assert.ok(source.includes(missingLabel),'否定例は実際の抽出語を壊す');
    await writeFile(join(ai,'lib','観測.js'),missingLabel ? source.replaceAll(missingLabel,'変更された表示語') : source);
    return spawnSync(process.execPath,[join(tools,'ボード整合検査.mjs')],{cwd:tmpdir(),encoding:'utf8'});
  } finally { await rm(root,{recursive:true,force:true}); }
}

test('分離後の観測.jsを読み、呼び出し側に表示語がなくてもボード整合検査が成功する',async()=>{
  const result=await runFixture();
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/ボード整合検査: OK/);
});
for(const label of ['表の読みへの一致','まことの盤の正確さ','見せる盤の栞の名指し']){
  test(`実抽出器から「${label}」が欠けると失敗する`,async()=>{
    const result=await runFixture(label);
    assert.equal(result.status,1);
    assert.ok(result.stderr.includes(`自動プレイ: 観測項目 ${label} を読み取っていない`),result.stderr);
  });
}
