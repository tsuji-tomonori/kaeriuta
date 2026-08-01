export function showCredits(root, { audio, onExit } = {}) {
  root.removeAttribute?.('data-scene-id');
  root.innerHTML = `
    <section class="kaeriuta-credits" aria-label="エンディングクレジット">
      <div class="kaeriuta-credits__rain" aria-hidden="true"></div>
      <div class="kaeriuta-credits__roll">
        <p class="kaeriuta-credits__eyebrow">TRUE END</p>
        <h1>帰り唄 <small>―手毬唄の館―</small></h1>
        <div class="kaeriuta-credits__verse" aria-label="帰り唄 主題">
          <p>閉じた頁に　名を返し</p><p>雨の向こうへ　朝を綴る</p>
          <p>帰る場所とは　赦しではなく</p><p>読まれぬ声を　忘れぬこと</p>
        </div>
        <dl>
          <div><dt>MAIN THEME</dt><dd>まだ閉じない頁</dd></div>
          <div><dt>ENDING THEME</dt><dd>帰り唄</dd></div>
          <div><dt>MUSIC</dt><dd>Original procedural score<br>Felt piano / Strings / Woodwinds / Warm synth</dd></div>
        </dl>
        <p class="kaeriuta-credits__thanks">最後まで読んでくださり、ありがとうございました。</p>
      </div>
      <button type="button" class="kaeriuta-credits__exit" data-credits-exit>タイトルへ戻る</button>
    </section>`;
  audio?.stopAmbience?.(800);
  audio?.playBGM?.('bgm_credits', 1400, false);
  root.querySelector('[data-credits-exit]')?.addEventListener('click', () => {
    audio?.stopBGM?.(900);
    onExit?.();
  });
}
