export const rebuttalB3 = { id:'rebuttal_b3', title:'五番の夜・宇野との対峙', initialConviction:62, rule:'宇野が守る「旦那さまの筋書き」を、栞が手元の札で読み替える。確信を崩し切れなければ、命令は止まらない。', nodes:[
 {id:'n1',kind:'命令',type:'命令',designIntent:'宇野が命令を自分の忠義として読んでいる最初の綴じ目をほどく。',claim:'旦那さまは、栞さまを消せとお命じになった。筋書きを守るのが、わたくしの役目です。',responses:[
  {kind:'rebut',label:'暖炉の指示メモを示す',card:'first_memo',result:{effects:[{t:'param',key:'conviction',delta:-12}],break:true,note:'署名は「六」だけ。宇野個人へ向けた命令ではない。'}},
  {kind:'silence',label:'返事をしない',result:{effects:[{t:'param',key:'conviction',delta:8}],note:'沈黙を、命令への従順と読まれる。'}},
  {kind:'redirect',label:'私だけを消す理由を問う',result:{effects:[{t:'param',key:'conviction',delta:-4}],note:'問いは残るが、宇野の手は止まらない。'}}]},
 {id:'n2',kind:'脚本',type:'脚本',designIntent:'共犯者全員へ異なる台本が渡った事実で、宇野の忠義の対象を揺らす。',claim:'皆さまには、それぞれ役目がございます。旦那さまの筋書きは、間違うはずがない。',responses:[
  {kind:'rebut',label:'三通の計画書を広げる',card:'three_plans_card',result:{effects:[{t:'param',key:'conviction',delta:-15}],break:true,note:'役目は皆で違う。守られているのは人でなく、破綻しない結末だ。'}},
  {kind:'rebut',label:'控えカルテの改ざんを示す',card:'medical_record_copy',result:{effects:[{t:'param',key:'conviction',delta:-9}],note:'命令は記録まで書き換える。だが宇野はなお目を伏せる。'}},
  {kind:'silence',label:'目をそらす',result:{effects:[{t:'param',key:'conviction',delta:8}],note:'宇野は迷いを、こちらの恐れと読み替える。'}}]},
 {id:'n3',kind:'人間',type:'人間',designIntent:'死体の筆だこを、宇野が守ろうとした人間の生存証拠として返す。',claim:'あの方はもう亡くなられた。残った旦那さまのために、わたくしが頁を閉じねばなりません。',responses:[
  {kind:'rebut',label:'死体のペンだこを示す',card:'corpse_callus_card',result:{effects:[{t:'param',key:'conviction',delta:-15}],break:true,note:'死者の手は四十年書き続けた人の手だった。宇野の忠義は、生きた人を消す筋書きへ向いている。'}},
  {kind:'rebut',label:'手毬唄を開く',card:'temariuta_text',result:{effects:[{t:'param',key:'conviction',delta:-5}],note:'唄は予告ではなく配役表だった。だが宇野はまだ命令を離せない。'}},
  {kind:'silence',label:'宇野の目を待つ',result:{effects:[{t:'param',key:'conviction',delta:10}],note:'待つだけでは、四十年の命令をほどけない。'}}]}
]};
