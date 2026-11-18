export type ShrineBiomeId = 'kyoto_shrine' | 'jigokudani' | 'arashiyama' | 'gion';
export type ShrineCameraPresetId = 'overview' | 'torii' | 'lantern' | 'bell' | 'pagoda';
export type JigokudaniCameraPresetId = 'ravine' | 'onsen_pool' | 'rock_ledge' | 'pine_overlook';
export type ArashiyamaCameraPresetId =
  | 'bamboo_path'
  | 'canopy_sunbeams'
  | 'shishi_odoshi'
  | 'bamboo_overlook';
export type GionCameraPresetId = 'hanamikoji' | 'tea_house' | 'chochin_eaves' | 'canal_bridge';

export type AnyCameraPresetId =
  | ShrineCameraPresetId
  | JigokudaniCameraPresetId
  | ArashiyamaCameraPresetId
  | GionCameraPresetId;

export type ShrineTimeOfDayId =
  | 'dawn'
  | 'dusk'
  | 'night'
  | 'winter_twilight'
  | 'misty_morning'
  | 'emerald_canopy'
  | 'gion_dusk';

export type ShrineMonumentId = 'torii' | 'lantern' | 'bell' | 'pagoda' | 'zen_garden';
export type JigokudaniMonumentId = 'onsen_pool' | 'volcanic_rock' | 'frost_pines' | 'kakehi_spout';
export type ArashiyamaMonumentId = 'bamboo_pathway' | 'shishi_odoshi' | 'sunlit_canopy';
export type GionMonumentId = 'machiya_teahouse' | 'chochin_lanterns' | 'cobblestone_lane';

export type AnyMonumentId =
  | ShrineMonumentId
  | JigokudaniMonumentId
  | ArashiyamaMonumentId
  | GionMonumentId;

export interface ShrineBiomeInfo {
  id: ShrineBiomeId;
  label: string;
  shortLabel: string;
  japanese: string;
  subtitle: string;
  defaultTimeOfDay: ShrineTimeOfDayId;
  defaultCameraPreset: AnyCameraPresetId;
  defaultMonument: AnyMonumentId;
}

export interface ShrineCameraPreset {
  id: AnyCameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface ShrineAtmospherePreset {
  id: ShrineTimeOfDayId;
  label: string;
  skyTopHex: number;
  skyBottomHex: number;
  fogHex: number;
  fogDensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  keyHex: number;
  keyIntensity: number;
  keyPosition: [number, number, number];
  lanternIntensity: number;
  envIntensity: number;
  particleColorHex: number;
  amberSteamHex?: number;
}

export interface ShrineMonumentInfo {
  id: AnyMonumentId;
  title: string;
  japanese: string;
  subtitle: string;
  etiquetteRule: string;
  culturalFact: string;
  cameraPreset: AnyCameraPresetId;
}

export const SHRINE_BIOMES: Record<ShrineBiomeId, ShrineBiomeInfo> = {
  kyoto_shrine: {
    id: 'kyoto_shrine',
    label: '3D Kyoto Shrine & Zen Courtyard',
    shortLabel: 'Kyoto Shrine',
    japanese: '京都神社',
    subtitle: 'Torii gate, Bonsho bronze bell, stone lanterns & Karesansui gravel',
    defaultTimeOfDay: 'dusk',
    defaultCameraPreset: 'overview',
    defaultMonument: 'torii',
  },
  jigokudani: {
    id: 'jigokudani',
    label: 'Jigokudani Snow-Dusted Hot Spring',
    shortLabel: 'Jigokudani Onsen',
    japanese: '地獄谷温泉',
    subtitle: 'Volcanic ravine onsen with steaming amber mist & ripple water',
    defaultTimeOfDay: 'winter_twilight',
    defaultCameraPreset: 'ravine',
    defaultMonument: 'onsen_pool',
  },
  arashiyama: {
    id: 'arashiyama',
    label: 'Arashiyama Bamboo Grove',
    shortLabel: 'Arashiyama Bamboo',
    japanese: '竹林の小径',
    subtitle: 'Swaying emerald stalks, sunbeams, stone path & Shishi-odoshi',
    defaultTimeOfDay: 'misty_morning',
    defaultCameraPreset: 'bamboo_path',
    defaultMonument: 'bamboo_pathway',
  },
  gion: {
    id: 'gion',
    label: 'Gion Historic Tea House District',
    shortLabel: 'Gion Tea Houses',
    japanese: '祇園・花見小路',
    subtitle: 'Dusk machiya alley, chochin lanterns & rain-lit cobblestones',
    defaultTimeOfDay: 'gion_dusk',
    defaultCameraPreset: 'hanamikoji',
    defaultMonument: 'machiya_teahouse',
  },
};

export const SHRINE_CAMERA_PRESETS: Array<ShrineCameraPreset & { id: ShrineCameraPresetId }> = [
  {
    id: 'overview',
    label: 'Courtyard',
    position: [11.5, 6.2, 13.8],
    target: [0, 2.2, -1.5],
  },
  {
    id: 'torii',
    label: 'Torii Gate',
    position: [0.4, 2.6, 8.6],
    target: [0, 2.7, 2.0],
  },
  {
    id: 'lantern',
    label: 'Toro Lantern',
    position: [-5.6, 2.1, 3.6],
    target: [-2.6, 1.5, -0.4],
  },
  {
    id: 'bell',
    label: 'Temple Bell',
    position: [-8.6, 2.7, 7.6],
    target: [-4.8, 1.85, 3.4],
  },
  {
    id: 'pagoda',
    label: 'Pagoda Sanctuary',
    position: [6.8, 5.2, -1.6],
    target: [0, 4.4, -8.5],
  },
];

export const JIGOKUDANI_CAMERA_PRESETS: Array<
  ShrineCameraPreset & { id: JigokudaniCameraPresetId }
> = [
  {
    id: 'ravine',
    label: 'Ravine',
    position: [10.6, 5.1, 12.6],
    target: [0, 1.45, -1.6],
  },
  {
    id: 'onsen_pool',
    label: 'Onsen Pool',
    position: [0.5, 4.2, 7.6],
    target: [0, 0.35, -0.2],
  },
  {
    id: 'rock_ledge',
    label: 'Bamboo Spout',
    position: [-6.4, 2.6, 5.2],
    target: [-2.4, 0.9, -1.6],
  },
  {
    id: 'pine_overlook',
    label: 'Pine Ridge',
    position: [-10.2, 6.2, -6.2],
    target: [0, 0.9, 0.4],
  },
];

export const ARASHIYAMA_CAMERA_PRESETS: Array<
  ShrineCameraPreset & { id: ArashiyamaCameraPresetId }
> = [
  {
    id: 'bamboo_path',
    label: 'Bamboo Path',
    position: [0.5, 2.25, 11.8],
    target: [0, 3.1, -5.0],
  },
  {
    id: 'canopy_sunbeams',
    label: 'Canopy Shafts',
    position: [-1.4, 1.4, 6.2],
    target: [0.8, 6.5, -3.5],
  },
  {
    id: 'shishi_odoshi',
    label: 'Shishi-odoshi',
    position: [-0.8, 1.8, 4.6],
    target: [2.2, 0.9, 1.8],
  },
  {
    id: 'bamboo_overlook',
    label: 'Grove Edge',
    position: [5.2, 4.8, 12.8],
    target: [0, 2.4, -2.0],
  },
];

export const GION_CAMERA_PRESETS: Array<ShrineCameraPreset & { id: GionCameraPresetId }> = [
  {
    id: 'hanamikoji',
    label: 'Machiya Alley',
    position: [0.15, 2.2, 12.4],
    target: [0, 2.15, -4.5],
  },
  {
    id: 'tea_house',
    label: 'Tea House',
    position: [-1.6, 1.95, 5.2],
    target: [2.8, 1.9, 0.6],
  },
  {
    id: 'chochin_eaves',
    label: 'Chochin Eaves',
    position: [1.5, 2.65, 6.4],
    target: [-2.7, 2.6, 0.2],
  },
  {
    id: 'canal_bridge',
    label: 'Evening Lane',
    position: [-0.2, 4.6, -11.4],
    target: [0, 1.8, 2.5],
  },
];

export const SHRINE_ATMOSPHERE_PRESETS: Record<ShrineTimeOfDayId, ShrineAtmospherePreset> = {
  dawn: {
    id: 'dawn',
    label: 'Sakura Dawn',
    skyTopHex: 0x3b4d78,
    skyBottomHex: 0xf1bfa8,
    fogHex: 0xdcaea3,
    fogDensity: 0.017,
    hemiSkyHex: 0xfde2d2,
    hemiGroundHex: 0x3a4a3a,
    hemiIntensity: 1.15,
    keyHex: 0xffd2a8,
    keyIntensity: 2.8,
    keyPosition: [14, 11, 10],
    lanternIntensity: 1.6,
    envIntensity: 0.85,
    particleColorHex: 0xffc8dd,
    amberSteamHex: 0xffc689,
  },
  dusk: {
    id: 'dusk',
    label: 'Kyoto Dusk',
    skyTopHex: 0x16223d,
    skyBottomHex: 0xd97d54,
    fogHex: 0x5c3e45,
    fogDensity: 0.019,
    hemiSkyHex: 0xffb38a,
    hemiGroundHex: 0x1e2430,
    hemiIntensity: 0.9,
    keyHex: 0xff9b5e,
    keyIntensity: 2.5,
    keyPosition: [-15, 8.5, 11],
    lanternIntensity: 4.5,
    envIntensity: 0.65,
    particleColorHex: 0xffd1e0,
    amberSteamHex: 0xffa857,
  },
  night: {
    id: 'night',
    label: 'Lantern Night',
    skyTopHex: 0x050914,
    skyBottomHex: 0x152238,
    fogHex: 0x0c1422,
    fogDensity: 0.021,
    hemiSkyHex: 0x5c7ca8,
    hemiGroundHex: 0x10141c,
    hemiIntensity: 0.65,
    keyHex: 0x99b8ff,
    keyIntensity: 1.35,
    keyPosition: [12, 18, -10],
    lanternIntensity: 8.2,
    envIntensity: 0.35,
    particleColorHex: 0xf6c945,
    amberSteamHex: 0xff9a36,
  },
  winter_twilight: {
    id: 'winter_twilight',
    label: 'Winter Twilight',
    skyTopHex: 0x0b1730,
    skyBottomHex: 0x6288b8,
    fogHex: 0x2c4466,
    fogDensity: 0.014,
    hemiSkyHex: 0xcbe2ff,
    hemiGroundHex: 0x27364d,
    hemiIntensity: 1.05,
    keyHex: 0xdfeeff,
    keyIntensity: 2.1,
    keyPosition: [13, 12, 10],
    lanternIntensity: 7.4,
    envIntensity: 0.56,
    particleColorHex: 0xf0f6ff,
    amberSteamHex: 0xff9b38,
  },
  misty_morning: {
    id: 'misty_morning',
    label: 'Misty Morning',
    skyTopHex: 0x769c92,
    skyBottomHex: 0xdfece3,
    fogHex: 0xc4dbce,
    fogDensity: 0.021,
    hemiSkyHex: 0xe9f7ed,
    hemiGroundHex: 0x243a29,
    hemiIntensity: 1.28,
    keyHex: 0xfff2cf,
    keyIntensity: 2.95,
    keyPosition: [8, 19, 6],
    lanternIntensity: 1.8,
    envIntensity: 0.78,
    particleColorHex: 0xd9f2c7,
  },
  emerald_canopy: {
    id: 'emerald_canopy',
    label: 'Emerald Canopy',
    skyTopHex: 0x0e2a1f,
    skyBottomHex: 0x5f9c76,
    fogHex: 0x356148,
    fogDensity: 0.022,
    hemiSkyHex: 0x93d9aa,
    hemiGroundHex: 0x102116,
    hemiIntensity: 1.02,
    keyHex: 0xffe49e,
    keyIntensity: 3.15,
    keyPosition: [6, 21, 5],
    lanternIntensity: 2.4,
    envIntensity: 0.64,
    particleColorHex: 0xbef29f,
  },
  gion_dusk: {
    id: 'gion_dusk',
    label: 'Gion Dusk',
    skyTopHex: 0x0b152c,
    skyBottomHex: 0x364d7d,
    fogHex: 0x1a2644,
    fogDensity: 0.017,
    hemiSkyHex: 0x738bc4,
    hemiGroundHex: 0x161218,
    hemiIntensity: 0.88,
    keyHex: 0xa7c0f5,
    keyIntensity: 1.4,
    keyPosition: [-10, 14, 8],
    lanternIntensity: 7.8,
    envIntensity: 0.46,
    particleColorHex: 0xffb36b,
  },
};

export const SHRINE_MONUMENTS: Record<ShrineMonumentId, ShrineMonumentInfo> = {
  torii: {
    id: 'torii',
    title: 'Myojin Vermilion Torii',
    japanese: '明神鳥居',
    subtitle: 'Threshold between everyday street and sacred ground',
    etiquetteRule:
      'Pause just outside the vermilion pillars, bow once toward the sanctuary, and walk along the left or right edge—leaving the center "Seichu" path clear for the kami.',
    culturalFact:
      'Its gently upturned upper Kasagi beam and central gold Gakuzuka plaque characterize the classical Myojin style found across Kyoto shrines.',
    cameraPreset: 'torii',
  },
  lantern: {
    id: 'lantern',
    title: 'Kasuga Stone Toro Lantern',
    japanese: '石灯籠',
    subtitle: 'Hand-carved granite offering lantern',
    etiquetteRule:
      'Before approaching the main sanctuary hall, cleanse left hand, right hand, and mouth with one ladle of fresh water without touching the ladle directly to your lips.',
    culturalFact:
      'Pairs of granite Toro lanterns guide visitors along twilight paths; donations from Kyoto merchants traditionally funded each carved pillar.',
    cameraPreset: 'lantern',
  },
  bell: {
    id: 'bell',
    title: 'Bonsho Temple Bell Pavilion',
    japanese: '梵鐘・鐘楼',
    subtitle: 'Cast bronze sanctuary bell struck with cedar beam',
    etiquetteRule:
      'Bow gently before pulling back the cedar shumoku beam, strike once smoothly to send a single calm resonance across the courtyard, and avoid rapid repeated strikes.',
    culturalFact:
      'Every New Year’s Eve (Joya no Kane), Japanese temples strike their Bonsho bell 108 times to clear earthly worries—click the bell or press B to toll.',
    cameraPreset: 'bell',
  },
  pagoda: {
    id: 'pagoda',
    title: 'Three-Tier Sanctuary Pagoda',
    japanese: '三重塔',
    subtitle: 'Mortise-and-tenon cedar joinery without iron nails',
    etiquetteRule:
      'Observe photography rules carefully around wooden halls and speak softly so contemplative visitors and resident monks are undisturbed.',
    culturalFact:
      'A suspended central pillar ("Shinbashira") absorbs seismic energy independently across all three flaring eaves topped by a bronze Sorin spire.',
    cameraPreset: 'pagoda',
  },
  zen_garden: {
    id: 'zen_garden',
    title: 'Karesansui Raked Gravel Court',
    japanese: '枯山水',
    subtitle: 'Concentric stone ripple meditation garden',
    etiquetteRule:
      'Remain strictly on the stepped Tobi-ishi stones and cedar walkways—never step onto moss cushions or raked white granite patterns.',
    culturalFact:
      'Monks rake concentric ripples around moss-cradled boulders to evoke currents flowing around mountain islands without a single drop of water.',
    cameraPreset: 'overview',
  },
};

export const JIGOKUDANI_MONUMENTS: Record<JigokudaniMonumentId, ShrineMonumentInfo> = {
  onsen_pool: {
    id: 'onsen_pool',
    title: 'Jigokudani Steaming Onsen Pool',
    japanese: '地獄谷露天風呂',
    subtitle: 'Natural geothermal mineral spring ringed by basalt stone',
    etiquetteRule:
      'Wash and rinse thoroughly before stepping into the mineral bath, keep bath towels folded on top of your head or rim rock—never let fabric touch the hot water—and click the surface to send ripples.',
    culturalFact:
      'Fed by deep Nagano volcanic fissures at 41°C, rising steam catches amber lantern light against blue-white snowdrifts.',
    cameraPreset: 'onsen_pool',
  },
  volcanic_rock: {
    id: 'volcanic_rock',
    title: 'Basalt Ravine & Snow Ledge',
    japanese: '安山岩の渓谷',
    subtitle: 'Dark frost-carved volcanic boulders bordering the spring',
    etiquetteRule:
      'Step slowly along heated stone coping ledges; condensed geothermal mist can make surrounding winter boulders slick.',
    culturalFact:
      'Jigokudani ("Hell’s Valley") gets its dramatic name from steep basalt cliffs and sulfur-scented vents steaming through deep winter snow.',
    cameraPreset: 'ravine',
  },
  frost_pines: {
    id: 'frost_pines',
    title: 'Frost-Tipped Mountain Pines',
    japanese: '雪化粧の松林',
    subtitle: 'Subalpine evergreens dusted with twilight snow',
    etiquetteRule:
      'Keep voices calm in outdoor rotenburo ravines so bathers and local wildlife share the quiet mountain twilight.',
    culturalFact:
      'Dense evergreen canopies trap warm rising vapor around the ravine floor while frost crystals catch silver twilight glow.',
    cameraPreset: 'pine_overlook',
  },
  kakehi_spout: {
    id: 'kakehi_spout',
    title: 'Kakehi Bamboo Source Spout',
    japanese: '懸樋の源泉',
    subtitle: 'Continuous mountain mineral flow into stone basin',
    etiquetteRule:
      'Use the small wooden hinoki bucket beside the rim to ladle cool or warm spring water gently over shoulders before immersing.',
    culturalFact:
      'Traditional unchlorinated kakehi bamboo conduits feed fresh geothermal water continuously—allowing overflow steam to warm surrounding rocks.',
    cameraPreset: 'rock_ledge',
  },
};

export const ARASHIYAMA_MONUMENTS: Record<ArashiyamaMonumentId, ShrineMonumentInfo> = {
  bamboo_pathway: {
    id: 'bamboo_pathway',
    title: 'Arashiyama Bamboo Grove Path',
    japanese: '竹林の小径',
    subtitle: 'Emerald bamboo stalks framing a woven takegaki stone trail',
    etiquetteRule:
      'Stay along the flagstone path behind woven takegaki bamboo fences—never carve initials into culms or step onto protected root moss.',
    culturalFact:
      'Recognized among Japan’s 100 Soundscapes by the Ministry of the Environment for the soothing rustle of swaying bamboo leaves and creaking stalks.',
    cameraPreset: 'bamboo_path',
  },
  shishi_odoshi: {
    id: 'shishi_odoshi',
    title: 'Shishi-odoshi Deer Chaser',
    japanese: '鹿威し',
    subtitle: 'Counterbalanced hollow bamboo fountain rocking onto river stone',
    etiquetteRule:
      'Pause quietly to listen for the slow fill and resonant hollow knock ("kon!")—click the fountain or press Wind Audio to trigger a breeze & rock cycle.',
    culturalFact:
      'Originally built to startle wild boar and deer away from mountain crops, its rhythmic hollow clack became a signature motif in Zen temple gardens.',
    cameraPreset: 'shishi_odoshi',
  },
  sunlit_canopy: {
    id: 'sunlit_canopy',
    title: 'Emerald Canopy Sunbeams',
    japanese: '木漏れ日の竹林',
    subtitle: 'Vertical shafts of morning mist & filtered golden light',
    etiquetteRule:
      'Arrive early near sunrise to share the serene quiet of the grove; tripods should remain folded on narrow stretches of the path.',
    culturalFact:
      'Segmented bamboo internodes flex smoothly in mountain gusts, opening shifting shafts of golden light across the damp Kyoto granite below.',
    cameraPreset: 'canopy_sunbeams',
  },
};

export const GION_MONUMENTS: Record<GionMonumentId, ShrineMonumentInfo> = {
  machiya_teahouse: {
    id: 'machiya_teahouse',
    title: 'Machiya Ochaya Tea House',
    japanese: '町家・お茶屋',
    subtitle: 'Two-story Kyoto cedar townhouses with koshi lattice & shoji screens',
    etiquetteRule:
      'Never touch delicate wooden koshi lattice screens or step onto private stone thresholds marked with hanging linen noren curtains.',
    culturalFact:
      'Traditional Kyoto machiya use "ichigensan okotowari" (introduction-only) etiquette, where faint shamisen notes drift out from behind warm paper shoji.',
    cameraPreset: 'tea_house',
  },
  chochin_lanterns: {
    id: 'chochin_lanterns',
    title: 'Hanging Chochin Paper Lanterns',
    japanese: '提灯の灯り',
    subtitle: 'Hand-ribbed bamboo & washi paper lanterns lining timber eaves',
    etiquetteRule:
      'Observe photography restrictions strictly on private Gion side alleys and never block passing maiko or geiko along the narrow lane.',
    culturalFact:
      'Warm amber chochin and red house crests announce active evening hospitality while reflecting richly across rain-washed flagstones.',
    cameraPreset: 'chochin_eaves',
  },
  cobblestone_lane: {
    id: 'cobblestone_lane',
    title: 'Rain-Slick Hanamikoji Cobblestones',
    japanese: '祇園の石畳',
    subtitle: 'Granite alley stones catching twilight amber & indigo reflections',
    etiquetteRule:
      'Walk calmly to the side in evening rain, keep voices low, and listen to the gentle clack of wooden geta sandals along nearby Shirakawa lanes.',
    culturalFact:
      'Shopkeepers sprinkle water ("uchimizu") across storefront flagstones at dusk to settle dust, cool evening air, and invite guests inside.',
    cameraPreset: 'hanamikoji',
  },
};

export function getCameraPresetsForBiome(biome: ShrineBiomeId): ShrineCameraPreset[] {
  switch (biome) {
    case 'jigokudani':
      return JIGOKUDANI_CAMERA_PRESETS;
    case 'arashiyama':
      return ARASHIYAMA_CAMERA_PRESETS;
    case 'gion':
      return GION_CAMERA_PRESETS;
    default:
      return SHRINE_CAMERA_PRESETS;
  }
}

export function getCameraPreset(
  id: AnyCameraPresetId,
  biome: ShrineBiomeId = 'kyoto_shrine'
): ShrineCameraPreset {
  const list = getCameraPresetsForBiome(biome);
  return list.find((p) => p.id === id) ?? list[0];
}

export function getAtmospherePreset(id: ShrineTimeOfDayId): ShrineAtmospherePreset {
  return SHRINE_ATMOSPHERE_PRESETS[id] ?? SHRINE_ATMOSPHERE_PRESETS.dusk;
}

export function getMonumentInfo(id: AnyMonumentId): ShrineMonumentInfo {
  if (id in JIGOKUDANI_MONUMENTS) {
    return JIGOKUDANI_MONUMENTS[id as JigokudaniMonumentId];
  }
  if (id in ARASHIYAMA_MONUMENTS) {
    return ARASHIYAMA_MONUMENTS[id as ArashiyamaMonumentId];
  }
  if (id in GION_MONUMENTS) {
    return GION_MONUMENTS[id as GionMonumentId];
  }
  return SHRINE_MONUMENTS[id as ShrineMonumentId] ?? SHRINE_MONUMENTS.torii;
}


