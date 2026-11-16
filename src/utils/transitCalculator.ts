export interface TransitLegEstimate {
  fromName: string;
  toName: string;
  fromStation: string;
  toStation: string;
  lineName: string;
  railMinutes: number;
  walkMinutes: number;
  totalMinutes: number;
  icFareJpy: number;
}

export interface DayTransitSummary {
  legs: TransitLegEstimate[];
  totalRailMinutes: number;
  totalWalkMinutes: number;
  totalTransitMinutes: number;
  totalIcFareJpy: number;
}

export interface SpotStationMeta {
  keyword: string;
  station: string;
  zone: string;
  lat: number;
  lng: number;
}

const KNOWN_SPOT_STATIONS: SpotStationMeta[] = [
  { keyword: 'shibuya', station: 'Shibuya Sta.', zone: 'JR Yamanote · West Tokyo', lat: 35.658, lng: 139.7016 },
  { keyword: 'meiji', station: 'Harajuku Sta.', zone: 'JR Yamanote · Shibuya-ku', lat: 35.6702, lng: 139.7027 },
  { keyword: 'harajuku', station: 'Harajuku Sta.', zone: 'JR Yamanote · Shibuya-ku', lat: 35.6702, lng: 139.7027 },
  { keyword: 'yanaka', station: 'Nippori Sta.', zone: 'JR Yamanote · East Tokyo', lat: 35.7278, lng: 139.7709 },
  { keyword: 'tsukiji', station: 'Tsukiji-shijo Sta.', zone: 'Toei Oedo Line · Central', lat: 35.6647, lng: 139.7671 },
  { keyword: 'asakusa', station: 'Asakusa Sta.', zone: 'Tokyo Metro Ginza Line', lat: 35.7119, lng: 139.7983 },
  { keyword: 'senso', station: 'Asakusa Sta.', zone: 'Tokyo Metro Ginza Line', lat: 35.7148, lng: 139.7967 },
  { keyword: 'shinjuku', station: 'Shinjuku Sta.', zone: 'JR Chuo & Yamanote', lat: 35.6896, lng: 139.7006 },
  { keyword: 'tokyo station', station: 'Tokyo Sta.', zone: 'JR Central Hub', lat: 35.6812, lng: 139.7671 },
  { keyword: 'arashiyama', station: 'Saga-Arashiyama Sta.', zone: 'JR Sagano Line · West Kyoto', lat: 35.0186, lng: 135.6812 },
  { keyword: 'kiyomizu', station: 'Kiyomizu-Gojo Sta.', zone: 'Keihan Main Line · Higashiyama', lat: 34.9961, lng: 135.7695 },
  { keyword: 'gion', station: 'Gion-Shijo Sta.', zone: 'Keihan Main Line · Central Kyoto', lat: 35.0037, lng: 135.7721 },
  { keyword: 'nishiki', station: 'Karasuma Sta.', zone: 'Hankyu Kyoto Line', lat: 35.0037, lng: 135.7598 },
  { keyword: 'fushimi', station: 'Inari Sta.', zone: 'JR Nara Line · South Kyoto', lat: 34.9672, lng: 135.7707 },
  { keyword: 'kuromon', station: 'Nippombashi Sta.', zone: 'Osaka Metro Sakaisuji Line', lat: 34.6665, lng: 135.5063 },
  { keyword: 'dotonbori', station: 'Namba Sta.', zone: 'Osaka Metro Midosuji Line', lat: 34.6668, lng: 135.5005 },
  { keyword: 'hozenji', station: 'Namba Sta.', zone: 'Osaka Metro Midosuji Line', lat: 34.6675, lng: 135.5028 },
  { keyword: 'osaka castle', station: 'Osakajokoen Sta.', zone: 'JR Osaka Loop Line', lat: 34.6873, lng: 135.5262 },
  { keyword: 'namba', station: 'Namba Sta.', zone: 'Nankai & Midosuji Hub', lat: 34.6644, lng: 135.5015 },
  { keyword: 'odori', station: 'Odori Sta.', zone: 'Sapporo Subway Namboku Line', lat: 43.0604, lng: 141.3534 },
  { keyword: 'nijo', station: 'Bus Center-mae Sta.', zone: 'Sapporo Tozai Line', lat: 43.0586, lng: 141.3587 },
  { keyword: 'jozankei', station: 'Makomanai Bus Hub', zone: 'Jotetsu Rapid Express', lat: 42.9652, lng: 141.1636 },
  { keyword: 'todai', station: 'Kintetsu-Nara Sta.', zone: 'Kintetsu Nara Line', lat: 34.6844, lng: 135.8288 },
  { keyword: 'kasuga', station: 'Kintetsu-Nara Sta.', zone: 'Nara Park Loop Bus', lat: 34.6814, lng: 135.8484 },
  { keyword: 'naramachi', station: 'Kintetsu-Nara Sta.', zone: 'Kintetsu Nara Line', lat: 34.6789, lng: 135.8305 },
  { keyword: 'kenroku', station: 'Kanazawa Sta. (East Gate)', zone: 'Hokutetsu Loop Bus', lat: 36.5621, lng: 136.6626 },
  { keyword: 'higashi chaya', station: 'Hashibacho Stop', zone: 'Kanazawa Loop Bus', lat: 36.5724, lng: 136.6666 },
  { keyword: 'omicho', station: 'Musashigatsuji Stop', zone: 'Kanazawa Central Line', lat: 36.5715, lng: 136.6566 },
];

export function resolveSpotStation(spotName: string, area?: string): SpotStationMeta {
  const haystack = `${spotName} ${area || ''}`.toLowerCase();
  const matched = KNOWN_SPOT_STATIONS.find((entry) => haystack.includes(entry.keyword));
  if (matched) return matched;

  const cleanStation = area?.trim() ? `${area.trim()} Sta.` : `${spotName.split(' ')[0] || 'Local'} Sta.`;
  return {
    keyword: spotName.toLowerCase(),
    station: cleanStation,
    zone: 'Local Metro / JR Line',
    lat: 35.68,
    lng: 139.74,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function selectRailLineLabel(from: SpotStationMeta, to: SpotStationMeta): string {
  if (from.station === to.station) return 'On Foot · Same Station Area';
  if (from.zone.includes('Yamanote') && to.zone.includes('Yamanote')) return 'JR Yamanote Line';
  if (from.zone.includes('Keihan') && to.zone.includes('Keihan')) return 'Keihan Main Line';
  if (from.zone.includes('Sagano') || to.zone.includes('Sagano')) return 'JR Sagano + Kyoto Subway';
  if (from.zone.includes('Kintetsu') || to.zone.includes('Nara')) return 'Kintetsu Nara / Loop Bus';
  if (from.zone.includes('Kanazawa') || to.zone.includes('Hokutetsu')) return 'Kanazawa Right-Loop Bus';
  if (from.zone.includes('Sapporo') || to.zone.includes('Jotetsu')) return 'Sapporo Subway / Jotetsu';
  if (from.zone.includes('Osaka') || to.zone.includes('Midosuji')) return 'Osaka Metro / Loop Line';
  return 'JR / Metro IC Transfer';
}

export function estimateTransitLeg(
  fromStop: { name: string; area?: string },
  toStop: { name: string; area?: string }
): TransitLegEstimate {
  const fromMeta = resolveSpotStation(fromStop.name, fromStop.area);
  const toMeta = resolveSpotStation(toStop.name, toStop.area);

  const km = haversineKm(fromMeta.lat, fromMeta.lng, toMeta.lat, toMeta.lng);

  // If the two resolved stations are identical or very close (< 0.9 km), walk directly
  if (fromMeta.station === toMeta.station || km < 0.85) {
    const walkMinutes = Math.max(5, Math.min(18, Math.round(km * 13) + 6));
    return {
      fromName: fromStop.name,
      toName: toStop.name,
      fromStation: fromMeta.station,
      toStation: toMeta.station,
      lineName: 'Direct Walk (No Rail Needed)',
      railMinutes: 0,
      walkMinutes,
      totalMinutes: walkMinutes,
      icFareJpy: 0,
    };
  }

  // Realistic urban rail speed + station transfer buffer + short walk at ends
  const railMinutes = Math.max(8, Math.round(km * 2.45 + 7));
  const walkMinutes = Math.max(6, Math.min(15, 7 + Math.round((km % 3) * 2)));
  const rawFare = 146 + Math.round(km * 11.5);
  // Japanese IC fares commonly step cleanly (e.g., 178, 208, 230, 320, etc.)
  const icFareJpy = Math.min(980, Math.max(150, Math.round(rawFare / 2) * 2));

  return {
    fromName: fromStop.name,
    toName: toStop.name,
    fromStation: fromMeta.station,
    toStation: toMeta.station,
    lineName: selectRailLineLabel(fromMeta, toMeta),
    railMinutes,
    walkMinutes,
    totalMinutes: railMinutes + walkMinutes,
    icFareJpy,
  };
}

export function summarizeDayTransit<T extends { name: string; area?: string }>(
  stops: T[]
): DayTransitSummary {
  const legs: TransitLegEstimate[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    legs.push(estimateTransitLeg(stops[i], stops[i + 1]));
  }

  const totalRailMinutes = legs.reduce((acc, l) => acc + l.railMinutes, 0);
  const totalWalkMinutes = legs.reduce((acc, l) => acc + l.walkMinutes, 0);
  const totalIcFareJpy = legs.reduce((acc, l) => acc + l.icFareJpy, 0);

  return {
    legs,
    totalRailMinutes,
    totalWalkMinutes,
    totalTransitMinutes: totalRailMinutes + totalWalkMinutes,
    totalIcFareJpy,
  };
}

export function reorderStops<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

// ============================================================================
// JR Pass vs Point-to-Point Calculator
// ============================================================================

export interface IntercityLegOption {
  id: string;
  label: string;
  from: string;
  to: string;
  singleTicketJpy: number;
  durationLabel: string;
  coveredByKansaiHokuriku: boolean;
}

export const INTERCITY_LEGS: IntercityLegOption[] = [
  {
    id: 'tyo-kyo',
    label: 'Tokyo → Kyoto (Tokaido Shinkansen)',
    from: 'Tokyo',
    to: 'Kyoto',
    singleTicketJpy: 14170,
    durationLabel: '2h 15m',
    coveredByKansaiHokuriku: false,
  },
  {
    id: 'kyo-nar',
    label: 'Kyoto → Nara (JR Nara Rapid)',
    from: 'Kyoto',
    to: 'Nara',
    singleTicketJpy: 720,
    durationLabel: '45m',
    coveredByKansaiHokuriku: true,
  },
  {
    id: 'nar-osa',
    label: 'Nara → Osaka (JR Yamatoji Rapid)',
    from: 'Nara',
    to: 'Osaka',
    singleTicketJpy: 580,
    durationLabel: '50m',
    coveredByKansaiHokuriku: true,
  },
  {
    id: 'osa-tyo',
    label: 'Shin-Osaka → Tokyo (Tokaido Shinkansen)',
    from: 'Osaka',
    to: 'Tokyo',
    singleTicketJpy: 14720,
    durationLabel: '2h 30m',
    coveredByKansaiHokuriku: false,
  },
  {
    id: 'kyo-kan',
    label: 'Kyoto → Kanazawa (Thunderbird + Hokuriku)',
    from: 'Kyoto',
    to: 'Kanazawa',
    singleTicketJpy: 7790,
    durationLabel: '2h 05m',
    coveredByKansaiHokuriku: true,
  },
  {
    id: 'kan-tyo',
    label: 'Kanazawa → Tokyo (Hokuriku Shinkansen)',
    from: 'Kanazawa',
    to: 'Tokyo',
    singleTicketJpy: 14380,
    durationLabel: '2h 30m',
    coveredByKansaiHokuriku: false,
  },
  {
    id: 'tyo-hir',
    label: 'Tokyo → Hiroshima (Shinkansen)',
    from: 'Tokyo',
    to: 'Hiroshima',
    singleTicketJpy: 19440,
    durationLabel: '3h 55m',
    coveredByKansaiHokuriku: false,
  },
];

export interface RailPassOption {
  id: 'jr-7' | 'jr-14' | 'kansai-hokuriku-7';
  name: string;
  priceJpy: number;
  notes: string;
}

export const RAIL_PASS_OPTIONS: RailPassOption[] = [
  {
    id: 'jr-7',
    name: '7-Day Whole Japan JR Pass',
    priceJpy: 50000,
    notes: 'Covers all JR Shinkansen (Hikari/Sakura/Kagayaki) & local JR trains nationwide.',
  },
  {
    id: 'jr-14',
    name: '14-Day Whole Japan JR Pass',
    priceJpy: 80000,
    notes: 'Best only for long multi-region loops reaching Kyushu + Tohoku/Hokkaido.',
  },
  {
    id: 'kansai-hokuriku-7',
    name: '7-Day JR West Kansai-Hokuriku Pass',
    priceJpy: 19000,
    notes: 'Covers Kyoto, Osaka, Nara & Kanazawa/Hokuriku region (does not include Tokyo–Kyoto Tokaido leg).',
  },
];

export interface JrPassComparisonResult {
  pointToPointTotalJpy: number;
  passPriceJpy: number;
  uncoveredTicketsJpy: number;
  effectivePassCostJpy: number;
  savingsWithPassJpy: number;
  recommendPass: boolean;
  verdictLabel: string;
}

export function compareRailPassVsSingle(
  selectedLegIds: string[],
  passId: RailPassOption['id'],
  roundTrip: boolean
): JrPassComparisonResult {
  const pass = RAIL_PASS_OPTIONS.find((p) => p.id === passId) ?? RAIL_PASS_OPTIONS[0];
  const multiplier = roundTrip ? 2 : 1;

  let pointToPointTotalJpy = 0;
  let uncoveredTicketsJpy = 0;

  for (const id of selectedLegIds) {
    const leg = INTERCITY_LEGS.find((l) => l.id === id);
    if (!leg) continue;
    const cost = leg.singleTicketJpy * multiplier;
    pointToPointTotalJpy += cost;
    if (pass.id === 'kansai-hokuriku-7' && !leg.coveredByKansaiHokuriku) {
      uncoveredTicketsJpy += cost;
    }
  }

  const effectivePassCostJpy = pass.priceJpy + uncoveredTicketsJpy;
  const savingsWithPassJpy = pointToPointTotalJpy - effectivePassCostJpy;
  const recommendPass = pointToPointTotalJpy > 0 && savingsWithPassJpy > 0;

  const verdictLabel =
    pointToPointTotalJpy === 0
      ? 'Select at least one intercity rail leg to compare fares.'
      : recommendPass
        ? `${pass.name} saves ¥${savingsWithPassJpy.toLocaleString()} compared to single tickets.`
        : `Individual point-to-point tickets save ¥${Math.abs(savingsWithPassJpy).toLocaleString()} over ${pass.name}.`;

  return {
    pointToPointTotalJpy,
    passPriceJpy: pass.priceJpy,
    uncoveredTicketsJpy,
    effectivePassCostJpy,
    savingsWithPassJpy,
    recommendPass,
    verdictLabel,
  };
}

// ============================================================================
// Last-Train Countdown Alert & Late-Night Taxi Fallback
// ============================================================================

export interface NeighborhoodLastTrainSchedule {
  id: string;
  cityId: 'Tokyo' | 'Kyoto' | 'Osaka' | 'Sapporo' | 'Nara' | 'Kanazawa';
  neighborhood: string;
  stationName: string;
  lineName: string;
  lastDepartureHour: number; // 23 or 24 (00:xx next day)
  lastDepartureMinute: number;
  taxiFallbackBaseJpy: number;
  taxiKmEstimate: number;
}

export const LAST_TRAIN_SCHEDULES: NeighborhoodLastTrainSchedule[] = [
  {
    id: 'tyo-shibuya',
    cityId: 'Tokyo',
    neighborhood: 'Shibuya Crossing',
    stationName: 'Shibuya Sta. (JR Yamanote Outer)',
    lineName: 'JR Yamanote / Ginza Line',
    lastDepartureHour: 24,
    lastDepartureMinute: 18,
    taxiFallbackBaseJpy: 3400,
    taxiKmEstimate: 7.5,
  },
  {
    id: 'tyo-yanaka',
    cityId: 'Tokyo',
    neighborhood: 'Yanaka Ginza',
    stationName: 'Nippori Sta. (JR Keihin-Tohoku)',
    lineName: 'JR Yamanote / Chiyoda Line',
    lastDepartureHour: 24,
    lastDepartureMinute: 9,
    taxiFallbackBaseJpy: 2900,
    taxiKmEstimate: 6.0,
  },
  {
    id: 'kyo-gion',
    cityId: 'Kyoto',
    neighborhood: 'Gion & Pontocho',
    stationName: 'Gion-Shijo Sta.',
    lineName: 'Keihan Main Line / Kyoto Subway',
    lastDepartureHour: 23,
    lastDepartureMinute: 55,
    taxiFallbackBaseJpy: 2100,
    taxiKmEstimate: 4.2,
  },
  {
    id: 'kyo-arashiyama',
    cityId: 'Kyoto',
    neighborhood: 'Arashiyama Bamboo Grove',
    stationName: 'Saga-Arashiyama Sta.',
    lineName: 'JR Sagano Line',
    lastDepartureHour: 23,
    lastDepartureMinute: 46,
    taxiFallbackBaseJpy: 4800,
    taxiKmEstimate: 11.0,
  },
  {
    id: 'osa-dotonbori',
    cityId: 'Osaka',
    neighborhood: 'Dotonbori & Namba',
    stationName: 'Namba Sta.',
    lineName: 'Osaka Metro Midosuji Line',
    lastDepartureHour: 24,
    lastDepartureMinute: 6,
    taxiFallbackBaseJpy: 2400,
    taxiKmEstimate: 5.0,
  },
  {
    id: 'sap-susukino',
    cityId: 'Sapporo',
    neighborhood: 'Odori & Susukino',
    stationName: 'Susukino Sta.',
    lineName: 'Sapporo Subway Namboku Line',
    lastDepartureHour: 24,
    lastDepartureMinute: 0,
    taxiFallbackBaseJpy: 1900,
    taxiKmEstimate: 3.5,
  },
  {
    id: 'nar-park',
    cityId: 'Nara',
    neighborhood: 'Naramachi & Nara Park',
    stationName: 'Kintetsu-Nara Sta.',
    lineName: 'Kintetsu Nara Line',
    lastDepartureHour: 23,
    lastDepartureMinute: 40,
    taxiFallbackBaseJpy: 2200,
    taxiKmEstimate: 4.5,
  },
  {
    id: 'kan-higashi',
    cityId: 'Kanazawa',
    neighborhood: 'Higashi Chaya District',
    stationName: 'Kanazawa Sta. Bus Terminal',
    lineName: 'Kanazawa Night Loop / JR Hokuriku',
    lastDepartureHour: 23,
    lastDepartureMinute: 15,
    taxiFallbackBaseJpy: 1800,
    taxiKmEstimate: 3.2,
  },
];

export interface LastTrainCountdownState {
  departureLabel: string;
  currentJstLabel: string;
  minutesRemaining: number;
  secondsRemaining: number;
  countdownFormatted: string;
  urgency: 'safe' | 'hurry' | 'missed';
  lateNightTaxiJpy: number;
}

export function computeLastTrainCountdown(
  schedule: NeighborhoodLastTrainSchedule,
  nowJstHour: number,
  nowJstMinute: number,
  nowJstSecond = 0
): LastTrainCountdownState {
  // Normalize 00:00..04:59 as 24:00..28:59 in the evening service day
  const normalizedNowHour = nowJstHour < 5 ? nowJstHour + 24 : nowJstHour;
  const nowSeconds = normalizedNowHour * 3600 + nowJstMinute * 60 + nowJstSecond;
  const targetSeconds = schedule.lastDepartureHour * 3600 + schedule.lastDepartureMinute * 60;

  const diffSeconds = targetSeconds - nowSeconds;
  const displayHour = schedule.lastDepartureHour >= 24 ? schedule.lastDepartureHour - 24 : schedule.lastDepartureHour;
  const departureLabel = `${String(displayHour).padStart(2, '0')}:${String(schedule.lastDepartureMinute).padStart(2, '0')}`;
  const currentJstLabel = `${String(nowJstHour).padStart(2, '0')}:${String(nowJstMinute).padStart(2, '0')}:${String(nowJstSecond).padStart(2, '0')} JST`;

  // Late-night Japanese taxi surcharge: +20% between 22:00 and 05:00
  const isLateSurcharge = nowJstHour >= 22 || nowJstHour < 5;
  const lateNightTaxiJpy = Math.round(schedule.taxiFallbackBaseJpy * (isLateSurcharge ? 1.2 : 1.0));

  if (diffSeconds <= 0) {
    return {
      departureLabel,
      currentJstLabel,
      minutesRemaining: 0,
      secondsRemaining: 0,
      countdownFormatted: 'Departed (Use Taxi Fallback)',
      urgency: 'missed',
      lateNightTaxiJpy,
    };
  }

  const hrs = Math.floor(diffSeconds / 3600);
  const mins = Math.floor((diffSeconds % 3600) / 60);
  const secs = diffSeconds % 60;
  const countdownFormatted = `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;

  const minutesRemaining = Math.ceil(diffSeconds / 60);
  const urgency: LastTrainCountdownState['urgency'] =
    minutesRemaining <= 45 ? 'hurry' : 'safe';

  return {
    departureLabel,
    currentJstLabel,
    minutesRemaining,
    secondsRemaining: diffSeconds,
    countdownFormatted,
    urgency,
    lateNightTaxiJpy,
  };
}
