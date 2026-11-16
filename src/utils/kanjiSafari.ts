export interface WildKanjiItem {
  id: string;
  kanji: string;
  reading: string;
  meaning: string;
  category: 'Transit' | 'Dining' | 'Etiquette' | 'Shopping';
  whereFound: string;
  xp: number;
}

export interface KanjiSightingRecord {
  kanjiId: string;
  spottedAtCity: string;
  spottedDate: string;
  note: string;
}

export const WILD_KANJI_CATALOG: WildKanjiItem[] = [
  {
    id: 'kanji-deguchi',
    kanji: '出口',
    reading: 'Deguchi',
    meaning: 'Exit',
    category: 'Transit',
    whereFound: 'Subway gates, department stores, and Shinkansen concourses (usually green sign).',
    xp: 35,
  },
  {
    id: 'kanji-iriguchi',
    kanji: '入口',
    reading: 'Iriguchi',
    meaning: 'Entrance',
    category: 'Transit',
    whereFound: 'Ticket barriers, shrine grounds, and museum doors.',
    xp: 35,
  },
  {
    id: 'kanji-kinen',
    kanji: '禁煙',
    reading: 'Kin’en',
    meaning: 'No Smoking',
    category: 'Etiquette',
    whereFound: 'Restaurant tables, Shinkansen cars, and street pavement tiles.',
    xp: 35,
  },
  {
    id: 'kanji-eigyochu',
    kanji: '営業中',
    reading: 'Eigyō-chū',
    meaning: 'Open for Business',
    category: 'Dining',
    whereFound: 'Wooden door plaques outside ramen counters and kissaten cafes.',
    xp: 40,
  },
  {
    id: 'kanji-junbichu',
    kanji: '準備中',
    reading: 'Junbi-chū',
    meaning: 'Preparing / Closed',
    category: 'Dining',
    whereFound: 'Shopfront signs during afternoon break between lunch and dinner.',
    xp: 40,
  },
  {
    id: 'kanji-manseki',
    kanji: '満席',
    reading: 'Manseki',
    meaning: 'Full / No Seats',
    category: 'Dining',
    whereFound: 'Small counter izakayas during Friday evening rush.',
    xp: 40,
  },
  {
    id: 'kanji-osu',
    kanji: '押',
    reading: 'Osu',
    meaning: 'Push',
    category: 'Transit',
    whereFound: 'Glass convenience store doors and crosswalk buttons.',
    xp: 30,
  },
  {
    id: 'kanji-hiku',
    kanji: '引',
    reading: 'Hiku',
    meaning: 'Pull',
    category: 'Transit',
    whereFound: 'Bakery entrances, cafe doors, and station lockers.',
    xp: 30,
  },
  {
    id: 'kanji-muryo',
    kanji: '無料',
    reading: 'Muryō',
    meaning: 'Free of Charge',
    category: 'Shopping',
    whereFound: 'Wi-Fi spots, observation decks, and shrine entry boards.',
    xp: 35,
  },
  {
    id: 'kanji-otearai',
    kanji: 'お手洗い',
    reading: 'Otearai',
    meaning: 'Restroom',
    category: 'Etiquette',
    whereFound: 'Department store hallways, park pavilions, and train platforms.',
    xp: 35,
  },
  {
    id: 'kanji-waribiki',
    kanji: '割引',
    reading: 'Waribiki',
    meaning: 'Discount',
    category: 'Shopping',
    whereFound: 'Evening bento stickers in konbini and department store basements (depachika).',
    xp: 40,
  },
  {
    id: 'kanji-tachiiri',
    kanji: '立入禁止',
    reading: 'Tachiiri Kinshi',
    meaning: 'Keep Out / Restricted',
    category: 'Etiquette',
    whereFound: 'Private Kyoto machiya alleys and staff-only temple halls.',
    xp: 45,
  },
];

export function matchKanjiFromText(input: string): WildKanjiItem[] {
  const q = input.trim().toLowerCase();
  if (!q) return WILD_KANJI_CATALOG;
  return WILD_KANJI_CATALOG.filter(
    (item) =>
      item.kanji.includes(input.trim()) ||
      item.reading.toLowerCase().includes(q) ||
      item.meaning.toLowerCase().includes(q)
  );
}

export function buildSafariVaultSummary(
  sightings: KanjiSightingRecord[]
): { label: string; docNumber: string; notes: string } {
  const discovered = sightings.map((s) => {
    const meta = WILD_KANJI_CATALOG.find((k) => k.id === s.kanjiId);
    return meta ? `${meta.kanji} (${meta.meaning}) @ ${s.spottedAtCity}` : s.kanjiId;
  });
  return {
    label: `Kanji Safari Field Log (${sightings.length}/${WILD_KANJI_CATALOG.length})`,
    docNumber: `SAFARI-${sightings.length}-SIGNS`,
    notes: discovered.join(' · ') || 'No wild street kanji logged yet.',
  };
}
