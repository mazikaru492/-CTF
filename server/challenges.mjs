// Public materials are intentionally inspectable. Final answer configuration stays server-side.
export const challenges = [
  {
    id: 1, category: '暗号解読', kind: 'cipher', title: '消えた合言葉',
    subtitle: 'ひとつ戻すと、見えてくる。', difficulty: 'はじめの一歩', time: '1〜3分',
    story: '研究室から届いた短い通信。合言葉は、英字を１文字ずつ後ろにずらして隠されていました。',
    instruction: 'DBUを、アルファベット順に１文字前へ戻してください。見つけた３文字がフラグです。Aの１文字前はZです。',
    material: { cipher: 'DBU', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
    answer: 'CAT',
    hints: ['暗号化で後ろへずらした文字は、前へ戻すと読めます。', 'DはC、BはA。最後のUも１文字前に戻しましょう。'],
    explanation: 'D → C、B → A、U → T。合言葉はCATです。文字を一定数ずらす「シーザー暗号」の入り口を体験しました。',
    learning: '手がかりから規則を見つける力。シーザー暗号は学習用の古典暗号で、現在の重要情報を安全に守る用途には適しません。'
  },
  {
    id: 2, category: '暗号解読', kind: 'ascii', title: '数字に隠れた通信',
    subtitle: '数字の向こうに、言葉がある。', difficulty: '入門', time: '2〜4分',
    story: '通信記録には５つの数字が残っています。文字を数字で表す「ASCII」の表が、読み解く鍵になりそうです。',
    instruction: '対応表を使い、67・89・66・69・82を英字に戻してください。数字と一致する文字を順に読むとフラグになります。',
    material: { numbers: [67, 89, 66, 69, 82] },
    answer: 'CYBER', hints: ['表で67を探しましょう。数字に対応する英字を順番に読みます。', '最初の２文字はCとYです。残りの３つも表で探しましょう。'],
    explanation: '67=C、89=Y、66=B、69=E、82=R。フラグはCYBERです。ASCIIは文字を数字で表すルールです。',
    learning: 'データの表し方を知る力。ASCIIなどの符号化は、秘密を守る暗号化とは異なります。'
  },
  {
    id: 3, category: '画像調査', kind: 'image', title: '小さなメモの秘密',
    subtitle: 'よく見る。それも調査の力。', difficulty: '入門', time: '2〜4分',
    story: '誰もいない研究室。机に残されたメモのどこかに、次の調査へ進む合言葉があります。',
    instruction: '画像を開いて拡大し、メモの右下に書かれた４文字を探してください。画像は指で拡大・スクロールできます。',
    material: { image: '/assets/desk-photo.png', alt: '木製の研究机。左にモニターとキーボード、奥にノートとランプ、右手前にオレンジの付せんが付いた白いメモがあり、メモの右下に小さな４文字が印字されている。', textClue: 'メモの印字を読み取る', textDetail: 'メモの右下には N O V A と印字されています。' },
    answer: 'NOVA', hints: ['画像右側の、オレンジの付せんが付いたメモを調べましょう。', '「FIELD NOTE」と書かれたメモの右下を拡大しましょう。'],
    explanation: 'メモの右下にNOVAと書かれています。全体を見るだけでなく、範囲を絞って細部を確認すると手がかりが見つかります。',
    learning: '画像の細部を観察する力。画像調査の入門であり、専門的な画像解析やデータ復元の全工程を再現するものではありません。'
  },
  {
    id: 4, category: '画像調査', kind: 'compare', title: '変化した掲示板',
    subtitle: '違いをつなぐと、答えになる。', difficulty: '入門', time: '2〜4分',
    story: '調査前と調査後の掲示板画像を入手しました。変わった場所だけに、秘密のメッセージが残されています。',
    instruction: '「変更前」「変更後」を切り替え、変更後にだけ増えた３つの英字を左から読んでください。',
    material: { before: '/assets/board-before.svg', after: '/assets/board-after.svg', textClue: '掲示内容を文字で比較する', textDetail: '変更前：左のカード「点検」、中央「予定」、右「記録」。変更後：左「点検 S」、中央「予定 U」、右「記録 N」。' },
    answer: 'SUN', hints: ['３枚のカードの、下の小さな枠を比べましょう。', '変更後の左のカードにはSが増えています。中央と右も調べましょう。'],
    explanation: '変更後の画像には、左からS・U・Nが増えています。フラグはSUNです。',
    learning: '変化を比較し、必要な情報を取り出す力。調査前後の状態を比べる考え方を体験しました。'
  },
  {
    id: 5, category: '証拠探索', kind: 'logs', title: '失敗が集中した端末',
    subtitle: '記録の中の、違和感を探そう。', difficulty: '基礎', time: '2〜4分',
    story: '架空のシステムでログイン記録が残っていました。まずは調査する端末を絞りましょう。',
    instruction: 'ログイン失敗が２回以上ある端末をタップし、端末一覧にある対応コードをフラグとして提出してください。',
    material: { logs: [{ time: '10:00', device: 'A', result: '成功' }, { time: '10:01', device: 'B', result: '失敗' }, { time: '10:02', device: 'B', result: '失敗' }, { time: '10:03', device: 'C', result: '失敗' }], devices: [{ id: 'A', code: 'ALPHA' }, { id: 'B', code: 'BRAVO' }, { id: 'C', code: 'CHARLIE' }] },
    answer: 'BRAVO', hints: ['「失敗」の行を端末ごとに数えましょう。', '端末Bには失敗が２回あります。端末一覧のBをタップしてコードを見ましょう。'],
    explanation: '端末Bの失敗が２回あるので、対応コードBRAVOがフラグです。',
    learning: '記録を条件で絞る力。ログイン失敗の集中だけで攻撃とは断定できません。実際には利用状況などを追加調査します。'
  },
  {
    id: 6, category: '証拠探索', kind: 'records', title: '消えた記録を追え',
    subtitle: 'もうひとつの記録が、手がかり。', difficulty: '基礎', time: '2〜4分',
    story: '現在の一覧から１件の記録が消えています。バックアップと照合すれば、何が消えたか分かるはずです。',
    instruction: '現在の一覧にないIDをバックアップから探し、そのカードをタップしてコードを提出してください。',
    material: { current: ['A01', 'A03'], backup: [{ id: 'A01', code: 'PINE' }, { id: 'A02', code: 'TRACE' }, { id: 'A03', code: 'ROCK' }] },
    answer: 'TRACE', hints: ['現在はA01とA03があります。バックアップには何が増えていますか？', '現在の一覧にないのはA02です。そのカードのコードを確認しましょう。'],
    explanation: '現在の一覧にないのはA02。そのコードTRACEがフラグです。別の記録を照合すると、なくなった情報の手がかりが見つかります。',
    learning: '複数の証拠を照合する力。これは調査の考え方の練習で、削除済みデータを実際に復元する問題ではありません。'
  },
  {
    id: 7, category: '時系列・総合', kind: 'order', title: '時系列を復元せよ',
    subtitle: '順番が、ひとつの言葉を作る。', difficulty: '基礎', time: '2〜4分',
    story: '４つの操作記録がばらばらになっています。時刻順に整理して、何が起きたのかを復元しましょう。',
    instruction: '上下ボタンで、時刻の早い順にカードを並べてください。並べたカードの文字を上から読むとフラグになります。',
    material: { cards: [{ id: 'D', time: '09:03', event: '記録を保存', letter: 'E' }, { id: 'B', time: '09:01', event: 'ログイン', letter: 'I' }, { id: 'A', time: '09:00', event: '端末を起動', letter: 'T' }, { id: 'C', time: '09:02', event: 'ファイルを開く', letter: 'M' }] },
    answer: 'TIME', hints: ['説明の順番を想像せず、カードの時刻を手がかりにしましょう。', '09:00、09:01、09:02、09:03の順です。文字を上から読んでください。'],
    explanation: '09:00の起動、09:01のログイン、09:02のファイル操作、09:03の保存。文字を順に読むとTIMEになります。',
    learning: '時系列を整理する力。実際の調査では端末間の時計のずれにも注意が必要です。'
  },
  {
    id: 8, category: '時系列・総合', kind: 'final', title: '最後の合言葉',
    subtitle: 'いままでのひらめきを、ひとつに。', difficulty: '応用の入り口', time: '3〜5分',
    story: '最後の通信には、鍵と暗号化のルールが別々に残っています。画像と記録を組み合わせて合言葉を復元しましょう。',
    instruction: '画像のKEYの数字と記録のルールを使い、UCHGを元の英字に戻してください。アルファベットはZの次にAへ戻ります。',
    material: { image: '/assets/key.svg', alt: '調査用の鍵カード。中央にKEYの数字が記されている。', textClue: '鍵カードの印字を読む', textDetail: '鍵カードにはKEY = 2と印字されています。', cipher: 'UCHG', rule: '暗号化では、各文字をKEYの数だけアルファベット順に後ろへずらした。' },
    answer: 'SAFE', hints: ['画像に書かれたKEYは、ずらした文字数です。', 'KEYは２。復号では２文字前へ戻します。UはSに戻ります。'],
    explanation: 'KEY=2なのでU→S、C→A、H→F、G→Eと２文字前へ戻します。最後のフラグはSAFEです。',
    learning: '異なる手がかりを組み合わせる力。８問で、規則を読む・画像を調べる・証拠を比べる・順番を整理する体験をしました。'
  }
];

export function publicChallenges() {
  return challenges.map(({ answer, hints, explanation, learning, ...publicData }) => ({ ...publicData, hintCount: hints.length }));
}
export function normalizeAnswer(value) {
  return value.normalize('NFKC').trim().replace(/^flag\{([^{}]+)\}$/i, '$1').toUpperCase();
}
