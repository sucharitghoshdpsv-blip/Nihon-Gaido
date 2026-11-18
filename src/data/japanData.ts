import type { ExpenseEntry } from '../utils/budget';

export type JapaneseThemeId = 'kinpaku' | 'aizome' | 'sakura' | 'take';

export interface JapaneseThemeMeta {
  id: JapaneseThemeId;
  name: string;
  japaneseName: string;
  swatchLight: string;
  swatchDark: string;
}

export const JAPANESE_THEMES: JapaneseThemeMeta[] = [
  { id: 'kinpaku', name: 'Kinpaku Gold', japaneseName: '金箔', swatchLight: '#A67108', swatchDark: '#F6C945' },
  { id: 'aizome', name: 'Aizome Indigo', japaneseName: '藍染', swatchLight: '#1D4ED8', swatchDark: '#60A5FA' },
  { id: 'sakura', name: 'Sakura Mist', japaneseName: '桜霧', swatchLight: '#A63457', swatchDark: '#F472B6' },
  { id: 'take', name: 'Bamboo Mist', japaneseName: '竹林', swatchLight: '#166534', swatchDark: '#34D399' },
];

export interface DistrictLandmark {
  id: string;
  name: string;
  japanese: string;
  kind: 'shrine' | 'transit' | 'dining' | 'market' | 'park';
  estimatedJpy: number;
  xPct: number;
  yPct: number;
  note: string;
}

export interface CityGuide {
  id: 'Tokyo' | 'Kyoto' | 'Osaka' | 'Sapporo' | 'Nara' | 'Kanazawa';
  district: string;
  japaneseName: string;
  regionLabel: string;
  imageUrl: string;
  headline: string;
  culturalInsight: string;
  etiquetteOverlayTitle: string;
  etiquetteOverlayTip: string;
  etiquetteChecklist: string[];
  transitHub: string;
  offlineSizeMb: number;
  mapCoords: { x: number; y: number };
  geoCenter: { lat: number; lng: number };
  landmarks: DistrictLandmark[];
}

export const HERO_IMAGE_URL = '/images/hero_japan_twilight_1794670215092.jpg';

export const CITY_GUIDES: CityGuide[] = [
  {
    id: 'Tokyo',
    district: 'Shibuya & Yanaka',
    japaneseName: '東京 · 渋谷',
    regionLabel: 'Kanto',
    imageUrl: '/images/city_tokyo_shibuya_1794670214672.jpg',
    headline: 'Neon precision meets quiet cedar alleyways',
    culturalInsight:
      'Tokyo runs on silent choreography. Neighborhoods shift tone within two blocks: Shinjuku towers give way to quiet kissaten coffee counters where whispering is preferred.',
    etiquetteOverlayTitle: 'Tokyo Transit & Escalator Protocol',
    etiquetteOverlayTip:
      'Stand on the LEFT side of escalators so commuters can pass on the right. Set phones to Manner Mode (silent) and avoid voice calls inside Yamanote and Metro cars.',
    etiquetteChecklist: [
      'Stand left on escalators; keep right lane clear.',
      'Hold backpacks in front or place on overhead racks during rush hour.',
      'Carry a small trash pouch; street bins are rare outside convenience stores.',
    ],
    transitHub: 'Tokyo Station · Yamanote & Shinkansen Hub',
    offlineSizeMb: 42,
    mapCoords: { x: 268, y: 238 },
    geoCenter: { lat: 35.6762, lng: 139.6503 },
    landmarks: [
      { id: 'tyo-1', name: 'Meiji Jingu Forest', japanese: '明治神宮', kind: 'shrine', estimatedJpy: 0, xPct: 28, yPct: 35, note: 'Bow once before entering the cypress torii gate.' },
      { id: 'tyo-2', name: 'Shibuya Sky & Crossing', japanese: '渋谷スクランブル', kind: 'transit', estimatedJpy: 2200, xPct: 45, yPct: 58, note: 'Book sunset entry 2 weeks ahead; no tripods on deck.' },
      { id: 'tyo-3', name: 'Tsukiji Outer Market', japanese: '築地場外市場', kind: 'market', estimatedJpy: 2800, xPct: 72, yPct: 50, note: 'Eat in designated shop corners rather than walking with skewers.' },
      { id: 'tyo-4', name: 'Yanaka Ginza', japanese: '谷中銀座', kind: 'dining', estimatedJpy: 1500, xPct: 60, yPct: 24, note: 'Cash-friendly historic craft street surviving from Showa era.' },
    ],
  },
  {
    id: 'Kyoto',
    district: 'Gion & Arashiyama',
    japaneseName: '京都 · 祇園',
    regionLabel: 'Kansai',
    imageUrl: '/images/city_kyoto_arashiyama_1794670217427.jpg',
    headline: 'Moss gardens, machiya lattices, and ritual stillness',
    culturalInsight:
      'Kyoto preserves living artisan lineages—matcha millers, incense blenders, and wooden machiya townhouses. Early mornings before 08:00 reveal stone lanes nearly empty.',
    etiquetteOverlayTitle: 'Kyoto Private Lane & Geiko Etiquette',
    etiquetteOverlayTip:
      'Photography is strictly prohibited on private Gion side alleys (signposted ¥10,000 fine). Never touch or block Geiko or Maiko on their way to engagements.',
    etiquetteChecklist: [
      'Do not photograph inside private Gion alleys marked with no-photo signs.',
      'Remove shoes at temple wooden halls where tatami or slippers are provided.',
      'Rinse left hand, right hand, then mouth at shrine temizuya basins.',
    ],
    transitHub: 'Kyoto Station · Karasuma & JR Sagano Lines',
    offlineSizeMb: 38,
    mapCoords: { x: 208, y: 262 },
    geoCenter: { lat: 35.0116, lng: 135.7681 },
    landmarks: [
      { id: 'kyo-1', name: 'Arashiyama Bamboo Grove', japanese: '嵐山竹林', kind: 'park', estimatedJpy: 0, xPct: 22, yPct: 42, note: 'Arrive at 06:30 for quiet mist and uncluttered light.' },
      { id: 'kyo-2', name: 'Kiyomizu-dera Terrace', japanese: '清水寺', kind: 'shrine', estimatedJpy: 500, xPct: 76, yPct: 56, note: 'Wooden stage built without nails overlooking Higashiyama.' },
      { id: 'kyo-3', name: 'Nishiki Food Market', japanese: '錦市場', kind: 'market', estimatedJpy: 2000, xPct: 52, yPct: 46, note: 'Consume tastings directly in front of the vendor stall.' },
      { id: 'kyo-4', name: 'Fushimi Inari Taisha', japanese: '伏見稲荷大社', kind: 'shrine', estimatedJpy: 0, xPct: 65, yPct: 78, note: 'Open 24 hours; upper mountain trails stay tranquil all day.' },
    ],
  },
  {
    id: 'Osaka',
    district: 'Dotonbori & Shinsekai',
    japaneseName: '大阪 · 道頓堀',
    regionLabel: 'Kansai',
    imageUrl: '/images/city_osaka_dotonbori_1794670216998.jpg',
    headline: 'Kuidaore kitchens, warm banter, and canal lanterns',
    culturalInsight:
      'Osaka’s motto is kuidaore—"eat until you drop." Unlike Tokyo’s reserved cadence, Osaka counter chefs welcome warm banter and local Kansai-ben greetings like "Ookini!"',
    etiquetteOverlayTitle: 'Osaka Escalator Switch & Izakaya Rule',
    etiquetteOverlayTip:
      'Unlike Tokyo, stand on the RIGHT side of escalators in Osaka and walk on the left! At kushikatsu stalls, never double-dip skewers into the communal sauce tray.',
    etiquetteChecklist: [
      'Stand on the RIGHT on Osaka escalators (opposite of Tokyo).',
      'Never double-dip kushikatsu; use complimentary cabbage leaves to scoop sauce.',
      'Expect a small otoshi appetizer (¥300–¥500) at sit-down izakayas.',
    ],
    transitHub: 'Shin-Osaka & Namba Station',
    offlineSizeMb: 34,
    mapCoords: { x: 196, y: 274 },
    geoCenter: { lat: 34.6937, lng: 135.5023 },
    landmarks: [
      { id: 'osa-1', name: 'Kuromon Ichiba Market', japanese: '黒門市場', kind: 'market', estimatedJpy: 2500, xPct: 58, yPct: 54, note: 'Fresh sea urchin, grilled scallops, and wagyu skewers.' },
      { id: 'osa-2', name: 'Hozenji Yokocho Alley', japanese: '法善寺横丁', kind: 'shrine', estimatedJpy: 0, xPct: 45, yPct: 42, note: 'Splash water gently on the moss-covered Fudo Myoo statue.' },
      { id: 'osa-3', name: 'Osaka Castle Park', japanese: '大阪城公園', kind: 'park', estimatedJpy: 600, xPct: 72, yPct: 26, note: 'Wide stone moat promenade and skyline views from the keep.' },
      { id: 'osa-4', name: 'Namba Grand Kagetsu', japanese: 'なんば駅', kind: 'transit', estimatedJpy: 1200, xPct: 40, yPct: 68, note: 'Direct Nankai Rapi:t airport express connection to Kansai Airport.' },
    ],
  },
  {
    id: 'Sapporo',
    district: 'Odori & Jozankei Onsen',
    japaneseName: '札幌 · 大通',
    regionLabel: 'Hokkaido',
    imageUrl: '/images/city_hokkaido_winter_1794670217421.jpg',
    headline: 'Volcanic hot springs, miso broth, and alpine air',
    culturalInsight:
      'Hokkaido’s grid-laid capital pairs underground winter arcades with steaming cedar onsen valleys just 50 minutes south in Jozankei.',
    etiquetteOverlayTitle: 'Hokkaido Onsen & Winter Walk Etiquette',
    etiquetteOverlayTip:
      'Wash thoroughly at seated shower stations BEFORE entering an onsen bath, keep towels out of the water, and cover tattoos with waterproof patches if required by the ryokan.',
    etiquetteChecklist: [
      'Wash completely while seated before stepping into communal hot spring pools.',
      'Never dip your small modesty towel into the thermal bath water.',
      'Walk with short, flat steps on icy pavement ("penguin walk").',
    ],
    transitHub: 'JR Sapporo Station · Rapid Airport Line',
    offlineSizeMb: 31,
    mapCoords: { x: 312, y: 84 },
    geoCenter: { lat: 43.0618, lng: 141.3545 },
    landmarks: [
      { id: 'sap-1', name: 'Odori Park & TV Tower', japanese: '大通公園', kind: 'park', estimatedJpy: 1000, xPct: 48, yPct: 46, note: '1.5 km green spine anchoring Sapporo festivals.' },
      { id: 'sap-2', name: 'Nijo Seafood Market', japanese: '二条市場', kind: 'market', estimatedJpy: 2600, xPct: 66, yPct: 50, note: 'Morning kaisen-don bowls with Hokkaido uni and crab.' },
      { id: 'sap-3', name: 'Jozankei Onsen Valley', japanese: '定山渓温泉', kind: 'shrine', estimatedJpy: 1500, xPct: 24, yPct: 74, note: 'Riverside footbaths and cedar ryokan day-bath passes.' },
      { id: 'sap-4', name: 'JR Sapporo Underground', japanese: '札幌駅地下街', kind: 'transit', estimatedJpy: 500, xPct: 46, yPct: 25, note: 'Heated subterranean walkway linking Sapporo to Susukino.' },
    ],
  },
  {
    id: 'Nara',
    district: 'Nara Park & Naramachi',
    japaneseName: '奈良 · 奈良公園',
    regionLabel: 'Kansai',
    imageUrl: '/images/city_nara_park_1794762230326.jpg',
    headline: 'Eighth-century bronze halls and bowing sacred deer',
    culturalInsight:
      'Japan’s first permanent capital preserves monumental cedar halls like Todai-ji alongside quiet merchant townhouses in Naramachi.',
    etiquetteOverlayTitle: 'Nara Sacred Deer Safety & Respect',
    etiquetteOverlayTip:
      'Only feed deer official wheat senbei crackers (¥200). Keep paper maps, transit tickets, and plastic bags zipped away—deer will nibble paper or plastic if visible.',
    etiquetteChecklist: [
      'Feed deer only official shika-senbei crackers—never human food.',
      'Show open empty palms once crackers are gone so deer know you are out.',
      'Speak softly inside Todai-ji’s Great Buddha Hall.',
    ],
    transitHub: 'Kintetsu-Nara & JR Nara Station',
    offlineSizeMb: 22,
    mapCoords: { x: 215, y: 280 },
    geoCenter: { lat: 34.6851, lng: 135.8048 },
    landmarks: [
      { id: 'nar-1', name: 'Todai-ji Great Buddha', japanese: '東大寺', kind: 'shrine', estimatedJpy: 800, xPct: 58, yPct: 35, note: 'World’s largest historic wooden hall housing Daibutsu.' },
      { id: 'nar-2', name: 'Kasuga Taisha Lanterns', japanese: '春日大社', kind: 'shrine', estimatedJpy: 500, xPct: 78, yPct: 55, note: 'Three thousand moss-draped stone and bronze lanterns.' },
      { id: 'nar-3', name: 'Naramachi Merchant Quarter', japanese: 'ならまち', kind: 'dining', estimatedJpy: 1400, xPct: 36, yPct: 72, note: 'Historic machiya cafes serving kakinoha-zushi persimmon leaf sushi.' },
    ],
  },
  {
    id: 'Kanazawa',
    district: 'Higashi Chaya & Kenroku-en',
    japaneseName: '金沢 · ひがし茶屋街',
    regionLabel: 'Hokuriku',
    imageUrl: '/images/city_kanazawa_garden_1794762230854.jpg',
    headline: 'Gold-leaf ateliers, samurai gardens, and winter crab',
    culturalInsight:
      'Kanazawa produces 99% of Japan’s Kinpaku gold leaf. Unscathed in WWII, its teahouse districts and Omicho seafood stalls feel deeply tactile.',
    etiquetteOverlayTitle: 'Kanazawa Teahouse & Garden Care',
    etiquetteOverlayTip:
      'Stay strictly on paved or stone paths inside Kenroku-en Garden to protect delicate moss carpets, and avoid resting bags on wooden lattice facades in Higashi Chaya.',
    etiquetteChecklist: [
      'Do not step onto moss beds in Kenroku-en Garden.',
      'Ask before photographing artisan gold-leaf workshops.',
      'Reserve Hokuriku Shinkansen seats early during peak autumn/winter.',
    ],
    transitHub: 'JR Kanazawa Station · Tsuzumi-mon Gate',
    offlineSizeMb: 26,
    mapCoords: { x: 218, y: 210 },
    geoCenter: { lat: 36.5613, lng: 136.6562 },
    landmarks: [
      { id: 'kan-1', name: 'Kenroku-en Garden', japanese: '兼六園', kind: 'park', estimatedJpy: 320, xPct: 56, yPct: 58, note: 'One of Japan’s Three Great Gardens with winter yukitsuri pine ropes.' },
      { id: 'kan-2', name: 'Higashi Chaya District', japanese: 'ひがし茶屋街', kind: 'dining', estimatedJpy: 1800, xPct: 74, yPct: 34, note: 'Edo-era wooden teahouses and gold-leaf wagashi sweets.' },
      { id: 'kan-3', name: 'Omicho Fish Market', japanese: '近江町市場', kind: 'market', estimatedJpy: 2400, xPct: 40, yPct: 44, note: 'Known as Kanazawa’s Kitchen for Sea of Japan sashimi.' },
    ],
  },
];

export {
  FULL_KANA_DECK as KANA_LESSONS,
  buildKanaMatrixRows,
  type KanaItem,
  type KanaScript,
  type KanaGroupId,
  type KanaChartRow,
} from './kanaDeck';

export interface TravelPhrase {
  id: string;
  category: 'Dining' | 'Transit' | 'Shopping' | 'Etiquette';
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  nuance: string;
}

export const TRAVEL_PHRASES: TravelPhrase[] = [
  {
    id: 'phr-1',
    category: 'Dining',
    japanese: 'お会計をお願いします',
    kana: 'おかいけいをおねがいします',
    romaji: 'Okaikei o onegaishimasu',
    english: 'May I have the check, please?',
    nuance: 'Use at your table or near the register; crossing your index fingers in an X also signals the bill.',
  },
  {
    id: 'phr-2',
    category: 'Dining',
    japanese: 'おすすめのメニューは何ですか？',
    kana: 'おすすめのめにゅーはなんですか',
    romaji: 'Osusume no menyuu wa nan desu ka?',
    english: 'What do you recommend on the menu?',
    nuance: 'Warm and natural at ramen counters and izakayas.',
  },
  {
    id: 'phr-3',
    category: 'Transit',
    japanese: 'この電車は京都に止まりますか？',
    kana: 'このでんしゃはきょうとにとまりますか',
    romaji: 'Kono densha wa Kyoto ni tomarimasu ka?',
    english: 'Does this train stop at Kyoto?',
    nuance: 'Crucial on Shinkansen platforms (Nozomi vs Hikari vs Kodama).',
  },
  {
    id: 'phr-4',
    category: 'Transit',
    japanese: 'ICカードにチャージしたいです',
    kana: 'あいしーかーどにちゃーじしたいです',
    romaji: 'IC kaado ni chaaji shitai desu',
    english: 'I would like to top up my IC card.',
    nuance: 'Applies to Suica, Pasmo, and ICOCA ticket machines.',
  },
  {
    id: 'phr-5',
    category: 'Shopping',
    japanese: '免税の手続きはできますか？',
    kana: 'めんぜいのてつづきはできますか',
    romaji: 'Menzei no tetsuzuki wa dekimasu ka?',
    english: 'Is tax-free checkout available here?',
    nuance: 'Keep your physical passport ready; purchases over ¥5,000 qualify.',
  },
  {
    id: 'phr-6',
    category: 'Etiquette',
    japanese: 'すみません、写真を撮ってもいいですか？',
    kana: 'すみません、しゃしんをとってもいいですか',
    romaji: 'Sumimasen, shashin o totte mo ii desu ka?',
    english: 'Excuse me, may I take a photo?',
    nuance: 'Always ask before photographing shrines interiors, artisans, or stall chefs.',
  },
];

export interface GrammarDrill {
  id: string;
  level: 'Basic' | 'Intermediate';
  prompt: string;
  sentenceWithBlank: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const GRAMMAR_DRILLS: GrammarDrill[] = [
  {
    id: 'gram-1',
    level: 'Basic',
    prompt: 'Select the destination particle ("go TO Kyoto"):',
    sentenceWithBlank: '明日、京都 ___ 行きます。',
    options: ['に', 'を', 'で', 'が'],
    correctAnswer: 'に',
    explanation: 'に (ni) or へ (e) marks the destination with movement verbs like 行きます (ikimasu, to go).',
  },
  {
    id: 'gram-2',
    level: 'Basic',
    prompt: 'Select the means/location of action particle ("pay BY Suica"):',
    sentenceWithBlank: 'Suica ___ 払います。',
    options: ['を', 'で', 'に', 'は'],
    correctAnswer: 'で',
    explanation: 'で (de) indicates the tool, method, or transport used to perform an action.',
  },
  {
    id: 'gram-3',
    level: 'Intermediate',
    prompt: 'Choose the polite permission request ("May I sit here?"):',
    sentenceWithBlank: 'ここに座って ___ いいですか。',
    options: ['も', 'が', 'を', 'から'],
    correctAnswer: 'も',
    explanation: '[Verb て-form] + もいいですか asks politely for permission ("Is it okay even if I...?").',
  },
  {
    id: 'gram-4',
    level: 'Intermediate',
    prompt: 'Select the respectful Keigo verb ("to eat / drink" politely for a guest):',
    sentenceWithBlank: 'どうぞ ___ ください。',
    options: ['召し上がって', '食べて', 'いただいて', 'やって'],
    correctAnswer: '召し上がって',
    explanation: '召し上がる (meshiagaru) is the honorific verb for eating/drinking when addressing guests or seniors.',
  },
];

export const SEED_EXPENSES: ExpenseEntry[] = [
  {
    id: 'exp-1',
    title: 'JR Narita Express Ticket',
    amountJpy: 3070,
    category: 'transit',
    city: 'Tokyo',
    date: '2026-11-14',
    createdAt: 1794640000000,
  },
  {
    id: 'exp-2',
    title: 'Yanaka Hand-Drip Matcha & Wagashi',
    amountJpy: 1450,
    category: 'food',
    city: 'Tokyo',
    date: '2026-11-14',
    createdAt: 1794645000000,
  },
  {
    id: 'exp-3',
    title: 'Tokaido Shinkansen Tokyo → Kyoto',
    amountJpy: 14170,
    category: 'transit',
    city: 'Kyoto',
    date: '2026-11-15',
    createdAt: 1794650000000,
  },
  {
    id: 'exp-4',
    title: 'Kiyomizu-dera & Higashiyama Tea',
    amountJpy: 1300,
    category: 'sightseeing',
    city: 'Kyoto',
    date: '2026-11-15',
    createdAt: 1794655000000,
  },
];

export interface ItineraryPlan {
  tripTitle: string;
  summary: string;
  days: Array<{
    dayNumber: number;
    region: string;
    theme: string;
    etiquetteTip: string;
    stops: Array<{
      time: string;
      name: string;
      area: string;
      transitNote: string;
      estimatedJpy: number;
      description: string;
    }>;
  }>;
}

export const SEED_ITINERARY: ItineraryPlan = {
  tripTitle: 'Golden Route: Tokyo Crafts & Kyoto Stillness',
  summary: 'Balanced 3-day cultural rail loop linking Shitamachi neighborhoods, Tokaido Shinkansen transit, and early-morning temple walks.',
  days: [
    {
      dayNumber: 1,
      region: 'Tokyo',
      theme: 'Cedar Shrines & Old-Town Craft',
      etiquetteTip: 'Keep backpacks in front on Yamanote trains and stand on the left on escalators.',
      stops: [
        {
          time: '08:30',
          name: 'Meiji Jingu Forest Walk',
          area: 'Harajuku',
          transitNote: 'JR Yamanote Line to Harajuku Station (¥150)',
          estimatedJpy: 150,
          description: 'Walk through 100,000 donated evergreens to the cedar main sanctuary.',
        },
        {
          time: '12:30',
          name: 'Tsukiji Outer Market Sushi Counter',
          area: 'Chuo',
          transitNote: 'Hibiya Line to Tsukiji Station (¥210)',
          estimatedJpy: 3200,
          description: 'Seasonal nigiri lunch at an outer market stand-up counter.',
        },
        {
          time: '16:30',
          name: 'Yanaka Ginza Sunset Stroll',
          area: 'Taito',
          transitNote: 'JR Yamanote Line to Nippori Station (¥180)',
          estimatedJpy: 1400,
          description: 'Browse family-run ceramic shops, taiyaki bakeries, and historic temple lanes.',
        },
      ],
    },
    {
      dayNumber: 2,
      region: 'Kyoto',
      theme: 'Nozomi Rail & Higashiyama Stone Lanes',
      etiquetteTip: 'Never take photos inside private Gion lanes marked with prohibition signs.',
      stops: [
        {
          time: '08:00',
          name: 'Nozomi Shinkansen to Kyoto',
          area: 'Tokyo → Kyoto',
          transitNote: 'Reserve Seat E for Mt. Fuji window view (2h 15m)',
          estimatedJpy: 14170,
          description: 'High-speed rail arrival into Kyoto Station with eki-ben bento box.',
        },
        {
          time: '13:00',
          name: 'Nishiki Market Tasting Walk',
          area: 'Nakagyo',
          transitNote: 'Karasuma Subway to Shijo (¥220)',
          estimatedJpy: 2400,
          description: 'Sample yuba tofu skin, roasted chestnuts, and pickled kyoyasai vegetables.',
        },
        {
          time: '17:00',
          name: 'Kiyomizu-dera & Ninenzaka Dusk',
          area: 'Higashiyama',
          transitNote: 'Keihan Line to Kiyomizu-Gojo (¥220)',
          estimatedJpy: 500,
          description: 'Lantern-lit wooden stairways overlooking Kyoto valley at twilight.',
        },
      ],
    },
  ],
};

export interface TravelReminderItem {
  id: string;
  kind: 'shinkansen' | 'flight' | 'ferry' | 'hotel';
  code: string;
  route: string;
  departureIso: string;
  platformOrGate: string;
}

export const SEED_REMINDERS: TravelReminderItem[] = [
  {
    id: 'rem-1',
    kind: 'shinkansen',
    code: 'Nozomi #214',
    route: 'Tokyo Station → Kyoto Station',
    departureIso: '2026-11-15T08:30',
    platformOrGate: 'Track 17 · Car 7 Seat E',
  },
  {
    id: 'rem-2',
    kind: 'flight',
    code: 'ANA NH848',
    route: 'Tokyo Haneda (HND) → Sapporo (CTS)',
    departureIso: '2026-11-18T11:15',
    platformOrGate: 'Terminal 2 · Gate 62',
  },
];

export interface CommunityBoardPost {
  id: string;
  authorUid: string;
  authorName: string;
  city: 'Tokyo' | 'Kyoto' | 'Osaka' | 'Sapporo' | 'Nara' | 'Kanazawa';
  category: 'meetup' | 'tip' | 'crowd' | 'food';
  message: string;
  createdAtLabel: string;
}

export const SEED_COMMUNITY_POSTS: CommunityBoardPost[] = [
  {
    id: 'post-1',
    authorUid: 'seed-1',
    authorName: 'Kenji T.',
    city: 'Kyoto',
    category: 'crowd',
    message: 'Arashiyama Bamboo Grove is peaceful before 07:15 AM today—zero tour buses at the north gate.',
    createdAtLabel: '25m ago',
  },
  {
    id: 'post-2',
    authorUid: 'seed-2',
    authorName: 'Maya R.',
    city: 'Tokyo',
    category: 'tip',
    message: 'Digital Suica in Apple Wallet works seamlessly on every Yamanote gate and 7-Eleven ATM.',
    createdAtLabel: '1h ago',
  },
  {
    id: 'post-3',
    authorUid: 'seed-3',
    authorName: 'Haruto S.',
    city: 'Osaka',
    category: 'food',
    message: 'Takoyaki stall behind Hozenji Yokocho has fresh yuzu-ponzu toppings with short 5-min wait.',
    createdAtLabel: '2h ago',
  },
];

export const EMERGENCY_CONTACTS = [
  {
    number: '110',
    title: 'Police Emergency',
    japanese: '警察 (けいさつ)',
    detail: 'Report theft, lost passport, or urgent safety threats. English interpreters available via dispatch.',
  },
  {
    number: '119',
    title: 'Ambulance & Fire',
    japanese: '救急・消防',
    detail: 'Free emergency medical transport & fire rescue nationwide. Stay on line for bilingual support.',
  },
  {
    number: '050-3816-2787',
    title: 'JNTO 24/7 Visitor Hotline',
    japanese: '観光庁ホットライン',
    detail: '24-hour multilingual travel emergencies, hospital referrals, and disaster guidance in English.',
  },
  {
    number: '#7119',
    title: 'Tokyo Medical Advice',
    japanese: '救急相談センター',
    detail: '24-hour triage nurse consultation in Tokyo/Osaka to find open night clinics before calling 119.',
  },
];
