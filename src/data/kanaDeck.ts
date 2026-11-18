export type KanaScript = 'Hiragana' | 'Katakana';
export type KanaGroupId = 'basic' | 'dakuten' | 'yoon';
export type KanaColIndex = 0 | 1 | 2 | 3 | 4;

export interface KanaItem {
  id: string;
  char: string;
  romaji: string;
  script: KanaScript;
  group: KanaGroupId;
  rowKey: string;
  rowLabel: string;
  colIndex: KanaColIndex;
  mnemonic: string;
}

export interface KanaChartRow {
  rowKey: string;
  rowLabel: string;
  group: KanaGroupId;
  cells: Array<KanaItem | null>;
}

const HIRAGANA_BASIC: KanaItem[] = [
  // Vowel row (∅)
  { id: 'hira-a', char: 'あ', romaji: 'a', script: 'Hiragana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 0, mnemonic: 'Looks like an apple with a leaf stem.' },
  { id: 'hira-i', char: 'い', romaji: 'i', script: 'Hiragana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 1, mnemonic: 'Two standing eels side by side.' },
  { id: 'hira-u', char: 'う', romaji: 'u', script: 'Hiragana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 2, mnemonic: 'A curved ear tilted sideways.' },
  { id: 'hira-e', char: 'え', romaji: 'e', script: 'Hiragana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 3, mnemonic: 'An energetic dancer stepping forward.' },
  { id: 'hira-o', char: 'お', romaji: 'o', script: 'Hiragana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 4, mnemonic: 'A golf tee and flying ball ("oh!").' },

  // K row
  { id: 'hira-ka', char: 'か', romaji: 'ka', script: 'Hiragana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 0, mnemonic: 'A sharp blade cutting with a flying spark dot.' },
  { id: 'hira-ki', char: 'き', romaji: 'ki', script: 'Hiragana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 1, mnemonic: 'Looks just like an antique skeleton key.' },
  { id: 'hira-ku', char: 'く', romaji: 'ku', script: 'Hiragana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 2, mnemonic: 'Cuckoo beak opening wide ("ku!").' },
  { id: 'hira-ke', char: 'け', romaji: 'ke', script: 'Hiragana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 3, mnemonic: 'Two wooden staves forming a keg.' },
  { id: 'hira-ko', char: 'こ', romaji: 'ko', script: 'Hiragana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 4, mnemonic: 'Two koi fish swimming head-to-tail.' },

  // S row
  { id: 'hira-sa', char: 'さ', romaji: 'sa', script: 'Hiragana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 0, mnemonic: 'A sad face smiling upside down.' },
  { id: 'hira-shi', char: 'し', romaji: 'shi', script: 'Hiragana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 1, mnemonic: 'Long curved hair of a woman ("she").' },
  { id: 'hira-su', char: 'す', romaji: 'su', script: 'Hiragana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 2, mnemonic: 'A looping noodle on chopsticks ("sushi").' },
  { id: 'hira-se', char: 'せ', romaji: 'se', script: 'Hiragana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 3, mnemonic: 'Mouth saying something clever ("say").' },
  { id: 'hira-so', char: 'そ', romaji: 'so', script: 'Hiragana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 4, mnemonic: 'Zigzag thread sewing ("so") in one stroke.' },

  // T row
  { id: 'hira-ta', char: 'た', romaji: 'ta', script: 'Hiragana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 0, mnemonic: 'Spells "t" and "a" side by side.' },
  { id: 'hira-chi', char: 'ち', romaji: 'chi', script: 'Hiragana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 1, mnemonic: 'Looks like a cheerful numeral 5.' },
  { id: 'hira-tsu', char: 'つ', romaji: 'tsu', script: 'Hiragana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 2, mnemonic: 'Cresting ocean tsunami wave curling.' },
  { id: 'hira-te', char: 'て', romaji: 'te', script: 'Hiragana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 3, mnemonic: 'Curved palm of an outstretched hand ("te").' },
  { id: 'hira-to', char: 'と', romaji: 'to', script: 'Hiragana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 4, mnemonic: 'A big toe with a tiny splinter stuck in it.' },

  // N row
  { id: 'hira-na', char: 'な', romaji: 'na', script: 'Hiragana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 0, mnemonic: 'Cross with a knot tied neatly.' },
  { id: 'hira-ni', char: 'に', romaji: 'ni', script: 'Hiragana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 1, mnemonic: 'A bent knee next to a shin bone.' },
  { id: 'hira-nu', char: 'ぬ', romaji: 'nu', script: 'Hiragana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 2, mnemonic: 'Tangled swirl of ramen noodles.' },
  { id: 'hira-ne', char: 'ね', romaji: 'ne', script: 'Hiragana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 3, mnemonic: 'Curled tail of a sleeping cat ("neko").' },
  { id: 'hira-no', char: 'の', romaji: 'no', script: 'Hiragana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 4, mnemonic: 'A classic "No Entry" circular sign.' },

  // H row
  { id: 'hira-ha', char: 'は', romaji: 'ha', script: 'Hiragana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 0, mnemonic: 'Standing post waving "ha!" with a loop.' },
  { id: 'hira-hi', char: 'ひ', romaji: 'hi', script: 'Hiragana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 1, mnemonic: 'Big wide smiling mouth saying "hee-hee".' },
  { id: 'hira-fu', char: 'ふ', romaji: 'fu', script: 'Hiragana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 2, mnemonic: 'Majestic peak of Mt. Fuji with drifting clouds.' },
  { id: 'hira-he', char: 'へ', romaji: 'he', script: 'Hiragana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 3, mnemonic: 'Arrow pointing up toward heaven.' },
  { id: 'hira-ho', char: 'ほ', romaji: 'ho', script: 'Hiragana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 4, mnemonic: 'Like は with a hat above—Santa says "ho!".' },

  // M row
  { id: 'hira-ma', char: 'ま', romaji: 'ma', script: 'Hiragana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 0, mnemonic: 'A ship mast with two horizontal sails.' },
  { id: 'hira-mi', char: 'み', romaji: 'mi', script: 'Hiragana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 1, mnemonic: 'Looks like cursive 21 ("me" turning 21).' },
  { id: 'hira-mu', char: 'む', romaji: 'mu', script: 'Hiragana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 2, mnemonic: 'A grazing cow face with horn ("moo!").' },
  { id: 'hira-me', char: 'め', romaji: 'me', script: 'Hiragana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 3, mnemonic: 'Swirling eye ("me" means eye in Japanese).' },
  { id: 'hira-mo', char: 'も', romaji: 'mo', script: 'Hiragana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 4, mnemonic: 'Fishing hook catching "more" fish.' },

  // Y row
  { id: 'hira-ya', char: 'や', romaji: 'ya', script: 'Hiragana', group: 'basic', rowKey: 'y', rowLabel: 'Y', colIndex: 0, mnemonic: 'Horned yak bowing its head forward.' },
  { id: 'hira-yu', char: 'ゆ', romaji: 'yu', script: 'Hiragana', group: 'basic', rowKey: 'y', rowLabel: 'Y', colIndex: 2, mnemonic: 'Hot-spring fish circling on a bath curtain ("yu").' },
  { id: 'hira-yo', char: 'よ', romaji: 'yo', script: 'Hiragana', group: 'basic', rowKey: 'y', rowLabel: 'Y', colIndex: 4, mnemonic: 'Spinning yo-yo hanging cleanly from a hand.' },

  // R row
  { id: 'hira-ra', char: 'ら', romaji: 'ra', script: 'Hiragana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 0, mnemonic: 'Hopping rabbit with perked long ear.' },
  { id: 'hira-ri', char: 'り', romaji: 'ri', script: 'Hiragana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 1, mnemonic: 'Two slender swaying river reeds.' },
  { id: 'hira-ru', char: 'る', romaji: 'ru', script: 'Hiragana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 2, mnemonic: 'Looping path ending in a ruby jewel.' },
  { id: 'hira-re', char: 'れ', romaji: 're', script: 'Hiragana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 3, mnemonic: 'Kicking out leg like a reindeer leaping.' },
  { id: 'hira-ro', char: 'ろ', romaji: 'ro', script: 'Hiragana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 4, mnemonic: 'Winding open road like る without the jewel.' },

  // W row + N
  { id: 'hira-wa', char: 'わ', romaji: 'wa', script: 'Hiragana', group: 'basic', rowKey: 'w', rowLabel: 'W', colIndex: 0, mnemonic: 'Wasp or swan curving cleanly down.' },
  { id: 'hira-wo', char: 'を', romaji: 'wo', script: 'Hiragana', group: 'basic', rowKey: 'w', rowLabel: 'W', colIndex: 4, mnemonic: 'Direct object particle ("o/wo"): jumping over a hurdle.' },
  { id: 'hira-n', char: 'ん', romaji: 'n', script: 'Hiragana', group: 'basic', rowKey: 'n_only', rowLabel: 'N', colIndex: 0, mnemonic: 'Looks just like a cursive lowercase "n".' },
];

const KATAKANA_BASIC: KanaItem[] = [
  // Vowel row (∅)
  { id: 'kata-a', char: 'ア', romaji: 'a', script: 'Katakana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 0, mnemonic: 'Sharp axe head swinging down.' },
  { id: 'kata-i', char: 'イ', romaji: 'i', script: 'Katakana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 1, mnemonic: 'Tilted easel standing up straight.' },
  { id: 'kata-u', char: 'ウ', romaji: 'u', script: 'Katakana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 2, mnemonic: 'Angular version of hiragana う with flat corners.' },
  { id: 'kata-e', char: 'エ', romaji: 'e', script: 'Katakana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 3, mnemonic: 'Iron girder like an elevator shaft.' },
  { id: 'kata-o', char: 'オ', romaji: 'o', script: 'Katakana', group: 'basic', rowKey: 'a', rowLabel: '∅', colIndex: 4, mnemonic: 'Opera singer kicking one leg out ("oh!").' },

  // K row
  { id: 'kata-ka', char: 'カ', romaji: 'ka', script: 'Katakana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 0, mnemonic: 'Angular twin of hiragana か without the dot.' },
  { id: 'kata-ki', char: 'キ', romaji: 'ki', script: 'Katakana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 1, mnemonic: 'Top jagged teeth of a metal house key.' },
  { id: 'kata-ku', char: 'ク', romaji: 'ku', script: 'Katakana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 2, mnemonic: 'Crooked corner of a cool kite wing.' },
  { id: 'kata-ke', char: 'ケ', romaji: 'ke', script: 'Katakana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 3, mnemonic: 'Looks like a slanted capital letter K.' },
  { id: 'kata-ko', char: 'コ', romaji: 'ko', script: 'Katakana', group: 'basic', rowKey: 'k', rowLabel: 'K', colIndex: 4, mnemonic: 'Two sharp 90-degree corners of a box.' },

  // S row
  { id: 'kata-sa', char: 'サ', romaji: 'sa', script: 'Katakana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 0, mnemonic: 'Saddle stirrups slung along a wooden rail.' },
  { id: 'kata-shi', char: 'シ', romaji: 'shi', script: 'Katakana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 1, mnemonic: 'Winking face smiling upward from bottom-to-top.' },
  { id: 'kata-su', char: 'ス', romaji: 'su', script: 'Katakana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 2, mnemonic: 'Speed skater gliding forward with flying scarf.' },
  { id: 'kata-se', char: 'セ', romaji: 'se', script: 'Katakana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 3, mnemonic: 'Angular cousin of hiragana せ.' },
  { id: 'kata-so', char: 'ソ', romaji: 'so', script: 'Katakana', group: 'basic', rowKey: 's', rowLabel: 'S', colIndex: 4, mnemonic: 'One short tick and a long downward stitch.' },

  // T row
  { id: 'kata-ta', char: 'タ', romaji: 'ta', script: 'Katakana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 0, mnemonic: 'Taco folded neatly with a tick inside.' },
  { id: 'kata-chi', char: 'チ', romaji: 'chi', script: 'Katakana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 1, mnemonic: 'Cheerleader balancing pom-poms cleanly.' },
  { id: 'kata-tsu', char: 'ツ', romaji: 'tsu', script: 'Katakana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 2, mnemonic: 'Two eyes and sweeping downward wave stroke.' },
  { id: 'kata-te', char: 'テ', romaji: 'te', script: 'Katakana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 3, mnemonic: 'Telephone pole crossbar standing tall.' },
  { id: 'kata-to', char: 'ト', romaji: 'to', script: 'Katakana', group: 'basic', rowKey: 't', rowLabel: 'T', colIndex: 4, mnemonic: 'Totem pole carving sticking out sideways.' },

  // N row
  { id: 'kata-na', char: 'ナ', romaji: 'na', script: 'Katakana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 0, mnemonic: 'Curved knife blade intersecting a cross guard.' },
  { id: 'kata-ni', char: 'ニ', romaji: 'ni', script: 'Katakana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 1, mnemonic: 'Two parallel needles (also kanji 二, "two").' },
  { id: 'kata-nu', char: 'ヌ', romaji: 'nu', script: 'Katakana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 2, mnemonic: 'Chopsticks pinching a single noodle.' },
  { id: 'kata-ne', char: 'ネ', romaji: 'ne', script: 'Katakana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 3, mnemonic: 'Nest perched high up on a branched tree.' },
  { id: 'kata-no', char: 'ノ', romaji: 'no', script: 'Katakana', group: 'basic', rowKey: 'n', rowLabel: 'N', colIndex: 4, mnemonic: 'A single crisp diagonal slash ("no!").' },

  // H row
  { id: 'kata-ha', char: 'ハ', romaji: 'ha', script: 'Katakana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 0, mnemonic: 'Two parted slopes of a thatched hat roof.' },
  { id: 'kata-hi', char: 'ヒ', romaji: 'hi', script: 'Katakana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 1, mnemonic: 'High-heel boot silhouette turned sideways.' },
  { id: 'kata-fu', char: 'フ', romaji: 'fu', script: 'Katakana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 2, mnemonic: 'Sharp corner hood billowing in the wind.' },
  { id: 'kata-he', char: 'ヘ', romaji: 'he', script: 'Katakana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 3, mnemonic: 'Identical mountain peak arrow to hiragana へ.' },
  { id: 'kata-ho', char: 'ホ', romaji: 'ho', script: 'Katakana', group: 'basic', rowKey: 'h', rowLabel: 'H', colIndex: 4, mnemonic: 'Holy cross glowing with sparks beside its base.' },

  // M row
  { id: 'kata-ma', char: 'マ', romaji: 'ma', script: 'Katakana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 0, mnemonic: 'Manta ray gliding gracefully underwater.' },
  { id: 'kata-mi', char: 'ミ', romaji: 'mi', script: 'Katakana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 1, mnemonic: 'Three slanted missiles streaking downward.' },
  { id: 'kata-mu', char: 'ム', romaji: 'mu', script: 'Katakana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 2, mnemonic: 'Triangular muscle flex anchored by a base.' },
  { id: 'kata-me', char: 'メ', romaji: 'me', script: 'Katakana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 3, mnemonic: 'Crossed scar right across an eye ("me").' },
  { id: 'kata-mo', char: 'モ', romaji: 'mo', script: 'Katakana', group: 'basic', rowKey: 'm', rowLabel: 'M', colIndex: 4, mnemonic: 'Angular sibling of hiragana も with flat bars.' },

  // Y row
  { id: 'kata-ya', char: 'ヤ', romaji: 'ya', script: 'Katakana', group: 'basic', rowKey: 'y', rowLabel: 'Y', colIndex: 0, mnemonic: 'Angular twin of hiragana や without its tail dot.' },
  { id: 'kata-yu', char: 'ユ', romaji: 'yu', script: 'Katakana', group: 'basic', rowKey: 'y', rowLabel: 'Y', colIndex: 2, mnemonic: 'Periscope rising smoothly up out of a U-boat.' },
  { id: 'kata-yo', char: 'ヨ', romaji: 'yo', script: 'Katakana', group: 'basic', rowKey: 'y', rowLabel: 'Y', colIndex: 4, mnemonic: 'Looks like a backward capital E shouting "Yo!".' },

  // R row
  { id: 'kata-ra', char: 'ラ', romaji: 'ra', script: 'Katakana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 0, mnemonic: 'A bowl of ramen with lid floating above.' },
  { id: 'kata-ri', char: 'リ', romaji: 'ri', script: 'Katakana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 1, mnemonic: 'Sharp upright bamboo reeds mirroring hiragana り.' },
  { id: 'kata-ru', char: 'ル', romaji: 'ru', script: 'Katakana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 2, mnemonic: 'Two branching tree roots gripping the earth.' },
  { id: 'kata-re', char: 'レ', romaji: 're', script: 'Katakana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 3, mnemonic: 'Crisp single-stroke razor edge kicking up.' },
  { id: 'kata-ro', char: 'ロ', romaji: 'ro', script: 'Katakana', group: 'basic', rowKey: 'r', rowLabel: 'R', colIndex: 4, mnemonic: 'Square robot head framing an open mouth.' },

  // W row + N
  { id: 'kata-wa', char: 'ワ', romaji: 'wa', script: 'Katakana', group: 'basic', rowKey: 'w', rowLabel: 'W', colIndex: 0, mnemonic: 'Wide wine glass without the stem.' },
  { id: 'kata-wo', char: 'ヲ', romaji: 'wo', script: 'Katakana', group: 'basic', rowKey: 'w', rowLabel: 'W', colIndex: 4, mnemonic: 'Rare particle twin combining コ and フ strokes.' },
  { id: 'kata-n', char: 'ン', romaji: 'n', script: 'Katakana', group: 'basic', rowKey: 'n_only', rowLabel: 'N', colIndex: 0, mnemonic: 'Rising upward stroke like a gentle wink.' },
];

const DAKUTEN_SPECS: Array<{
  rowKey: string;
  rowLabel: string;
  items: Array<{ slug: string; hira: string; kata: string; romaji: string; baseDesc: string }>;
}> = [
  {
    rowKey: 'g',
    rowLabel: 'G',
    items: [
      { slug: 'ga', hira: 'が', kata: 'ガ', romaji: 'ga', baseDesc: 'ka + dakuten (゛) softens K into voiced G.' },
      { slug: 'gi', hira: 'ぎ', kata: 'ギ', romaji: 'gi', baseDesc: 'ki + dakuten (゛) softens K into voiced G.' },
      { slug: 'gu', hira: 'ぐ', kata: 'グ', romaji: 'gu', baseDesc: 'ku + dakuten (゛) softens K into voiced G.' },
      { slug: 'ge', hira: 'げ', kata: 'ゲ', romaji: 'ge', baseDesc: 'ke + dakuten (゛) softens K into voiced G.' },
      { slug: 'go', hira: 'ご', kata: 'ゴ', romaji: 'go', baseDesc: 'ko + dakuten (゛) softens K into voiced G.' },
    ],
  },
  {
    rowKey: 'z',
    rowLabel: 'Z',
    items: [
      { slug: 'za', hira: 'ざ', kata: 'ザ', romaji: 'za', baseDesc: 'sa + dakuten (゛) voices S into buzzing Z.' },
      { slug: 'ji', hira: 'じ', kata: 'ジ', romaji: 'ji', baseDesc: 'shi + dakuten (゛) voices SH into J ("ji").' },
      { slug: 'zu', hira: 'ず', kata: 'ズ', romaji: 'zu', baseDesc: 'su + dakuten (゛) voices S into Z ("zu").' },
      { slug: 'ze', hira: 'ぜ', kata: 'ゼ', romaji: 'ze', baseDesc: 'se + dakuten (゛) voices S into Z ("ze").' },
      { slug: 'zo', hira: 'ぞ', kata: 'ゾ', romaji: 'zo', baseDesc: 'so + dakuten (゛) voices S into Z ("zo").' },
    ],
  },
  {
    rowKey: 'd',
    rowLabel: 'D',
    items: [
      { slug: 'da', hira: 'だ', kata: 'ダ', romaji: 'da', baseDesc: 'ta + dakuten (゛) voices T into crisp D.' },
      { slug: 'di', hira: 'ぢ', kata: 'ヂ', romaji: 'ji', baseDesc: 'chi + dakuten (゛); pronounced "ji" in rare native words.' },
      { slug: 'du', hira: 'づ', kata: 'ヅ', romaji: 'zu', baseDesc: 'tsu + dakuten (゛); pronounced "zu" in compound words.' },
      { slug: 'de', hira: 'で', kata: 'デ', romaji: 'de', baseDesc: 'te + dakuten (゛) voices T into D ("de").' },
      { slug: 'do', hira: 'ど', kata: 'ド', romaji: 'do', baseDesc: 'to + dakuten (゛) voices T into D ("do").' },
    ],
  },
  {
    rowKey: 'b',
    rowLabel: 'B',
    items: [
      { slug: 'ba', hira: 'ば', kata: 'バ', romaji: 'ba', baseDesc: 'ha + dakuten (゛) transforms breathy H into B.' },
      { slug: 'bi', hira: 'び', kata: 'ビ', romaji: 'bi', baseDesc: 'hi + dakuten (゛) transforms H into voiced B.' },
      { slug: 'bu', hira: 'ぶ', kata: 'ブ', romaji: 'bu', baseDesc: 'fu + dakuten (゛) transforms F into voiced B.' },
      { slug: 'be', hira: 'べ', kata: 'ベ', romaji: 'be', baseDesc: 'he + dakuten (゛) transforms H into voiced B.' },
      { slug: 'bo', hira: 'ぼ', kata: 'ボ', romaji: 'bo', baseDesc: 'ho + dakuten (゛) transforms H into voiced B.' },
    ],
  },
  {
    rowKey: 'p',
    rowLabel: 'P',
    items: [
      { slug: 'pa', hira: 'ぱ', kata: 'パ', romaji: 'pa', baseDesc: 'ha + handakuten circle (゜) pops breathy H into P.' },
      { slug: 'pi', hira: 'ぴ', kata: 'ピ', romaji: 'pi', baseDesc: 'hi + handakuten circle (゜) pops H into crisp P.' },
      { slug: 'pu', hira: 'ぷ', kata: 'プ', romaji: 'pu', baseDesc: 'fu + handakuten circle (゜) pops F into crisp P.' },
      { slug: 'pe', hira: 'ぺ', kata: 'ペ', romaji: 'pe', baseDesc: 'he + handakuten circle (゜) pops H into crisp P.' },
      { slug: 'po', hira: 'ぽ', kata: 'ポ', romaji: 'po', baseDesc: 'ho + handakuten circle (゜) pops H into crisp P.' },
    ],
  },
];

const YOON_SPECS: Array<{
  rowKey: string;
  rowLabel: string;
  hiraBase: string;
  kataBase: string;
  consonant: string;
}> = [
  { rowKey: 'ky', rowLabel: 'KY', hiraBase: 'き', kataBase: 'キ', consonant: 'ky' },
  { rowKey: 'sh', rowLabel: 'SH', hiraBase: 'し', kataBase: 'シ', consonant: 'sh' },
  { rowKey: 'ch', rowLabel: 'CH', hiraBase: 'ち', kataBase: 'チ', consonant: 'ch' },
  { rowKey: 'ny', rowLabel: 'NY', hiraBase: 'に', kataBase: 'ニ', consonant: 'ny' },
  { rowKey: 'hy', rowLabel: 'HY', hiraBase: 'ひ', kataBase: 'ヒ', consonant: 'hy' },
  { rowKey: 'my', rowLabel: 'MY', hiraBase: 'み', kataBase: 'ミ', consonant: 'my' },
  { rowKey: 'ry', rowLabel: 'RY', hiraBase: 'り', kataBase: 'リ', consonant: 'ry' },
  { rowKey: 'gy', rowLabel: 'GY', hiraBase: 'ぎ', kataBase: 'ギ', consonant: 'gy' },
  { rowKey: 'j', rowLabel: 'J', hiraBase: 'じ', kataBase: 'ジ', consonant: 'j' },
  { rowKey: 'by', rowLabel: 'BY', hiraBase: 'び', kataBase: 'ビ', consonant: 'by' },
  { rowKey: 'py', rowLabel: 'PY', hiraBase: 'ぴ', kataBase: 'ピ', consonant: 'py' },
];

const YOON_ENDINGS: Array<{
  colIndex: KanaColIndex;
  vowel: 'a' | 'u' | 'o';
  hiraSmall: string;
  kataSmall: string;
}> = [
  { colIndex: 0, vowel: 'a', hiraSmall: 'ゃ', kataSmall: 'ャ' },
  { colIndex: 1, vowel: 'u', hiraSmall: 'ゅ', kataSmall: 'ュ' },
  { colIndex: 2, vowel: 'o', hiraSmall: 'ょ', kataSmall: 'ョ' },
];

const HIRAGANA_DAKUTEN: KanaItem[] = DAKUTEN_SPECS.flatMap((row) =>
  row.items.map((item, idx) => ({
    id: `hira-${item.slug}`,
    char: item.hira,
    romaji: item.romaji,
    script: 'Hiragana',
    group: 'dakuten',
    rowKey: row.rowKey,
    rowLabel: row.rowLabel,
    colIndex: idx as KanaColIndex,
    mnemonic: `Hiragana ${item.baseDesc}`,
  }))
);

const KATAKANA_DAKUTEN: KanaItem[] = DAKUTEN_SPECS.flatMap((row) =>
  row.items.map((item, idx) => ({
    id: `kata-${item.slug}`,
    char: item.kata,
    romaji: item.romaji,
    script: 'Katakana',
    group: 'dakuten',
    rowKey: row.rowKey,
    rowLabel: row.rowLabel,
    colIndex: idx as KanaColIndex,
    mnemonic: `Katakana ${item.baseDesc}`,
  }))
);

const HIRAGANA_YOON: KanaItem[] = YOON_SPECS.flatMap((row) =>
  YOON_ENDINGS.map((end) => {
    const romaji = `${row.consonant}${end.vowel}`;
    return {
      id: `hira-${romaji}`,
      char: `${row.hiraBase}${end.hiraSmall}`,
      romaji,
      script: 'Hiragana',
      group: 'yoon',
      rowKey: row.rowKey,
      rowLabel: row.rowLabel,
      colIndex: end.colIndex,
      mnemonic: `Combines ${row.hiraBase} with small ${end.hiraSmall} to glide cleanly as "${romaji}".`,
    };
  })
);

const KATAKANA_YOON: KanaItem[] = YOON_SPECS.flatMap((row) =>
  YOON_ENDINGS.map((end) => {
    const romaji = `${row.consonant}${end.vowel}`;
    return {
      id: `kata-${romaji}`,
      char: `${row.kataBase}${end.kataSmall}`,
      romaji,
      script: 'Katakana',
      group: 'yoon',
      rowKey: row.rowKey,
      rowLabel: row.rowLabel,
      colIndex: end.colIndex,
      mnemonic: `Combines ${row.kataBase} with small ${end.kataSmall} for loanword syllable "${romaji}".`,
    };
  })
);

export const FULL_KANA_DECK: KanaItem[] = [
  ...HIRAGANA_BASIC,
  ...HIRAGANA_DAKUTEN,
  ...HIRAGANA_YOON,
  ...KATAKANA_BASIC,
  ...KATAKANA_DAKUTEN,
  ...KATAKANA_YOON,
];

const BASIC_ROW_ORDER = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'n_only'];
const DAKUTEN_ROW_ORDER = ['g', 'z', 'd', 'b', 'p'];
const YOON_ROW_ORDER = ['ky', 'sh', 'ch', 'ny', 'hy', 'my', 'ry', 'gy', 'j', 'by', 'py'];

/**
 * Returns traditional Gojūon / Dakuten / Yōon rows padded cleanly with null spacers
 * so every vowel column (-a, -i, -u, -e, -o or -ya, -yu, -yo) lines up vertically.
 */
export function buildKanaMatrixRows(
  script: KanaScript,
  group: KanaGroupId
): KanaChartRow[] {
  const rowOrder =
    group === 'basic'
      ? BASIC_ROW_ORDER
      : group === 'dakuten'
      ? DAKUTEN_ROW_ORDER
      : YOON_ROW_ORDER;
  const colCount = group === 'yoon' ? 3 : 5;
  const filtered = FULL_KANA_DECK.filter(
    (item) => item.script === script && item.group === group
  );

  return rowOrder.map((rowKey) => {
    const rowItems = filtered.filter((item) => item.rowKey === rowKey);
    const cells: Array<KanaItem | null> = Array.from({ length: colCount }, () => null);
    for (const item of rowItems) {
      if (item.colIndex < colCount) {
        cells[item.colIndex] = item;
      }
    }
    return {
      rowKey,
      rowLabel: rowItems[0]?.rowLabel ?? rowKey.toUpperCase(),
      group,
      cells,
    };
  });
}
