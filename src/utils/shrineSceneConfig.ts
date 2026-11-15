export type ShrineCameraPresetId = 'overview' | 'torii' | 'lantern' | 'bell' | 'pagoda';
export type ShrineTimeOfDayId = 'dawn' | 'dusk' | 'night';
export type ShrineMonumentId = 'torii' | 'lantern' | 'bell' | 'pagoda' | 'zen_garden';

export interface ShrineCameraPreset {
  id: ShrineCameraPresetId;
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
}

export interface ShrineMonumentInfo {
  id: ShrineMonumentId;
  title: string;
  japanese: string;
  subtitle: string;
  etiquetteRule: string;
  culturalFact: string;
  cameraPreset: ShrineCameraPresetId;
}

export const SHRINE_CAMERA_PRESETS: ShrineCameraPreset[] = [
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

export function getCameraPreset(id: ShrineCameraPresetId): ShrineCameraPreset {
  return SHRINE_CAMERA_PRESETS.find((p) => p.id === id) ?? SHRINE_CAMERA_PRESETS[0];
}

export function getAtmospherePreset(id: ShrineTimeOfDayId): ShrineAtmospherePreset {
  return SHRINE_ATMOSPHERE_PRESETS[id] ?? SHRINE_ATMOSPHERE_PRESETS.dusk;
}

export function getMonumentInfo(id: ShrineMonumentId): ShrineMonumentInfo {
  return SHRINE_MONUMENTS[id] ?? SHRINE_MONUMENTS.torii;
}
