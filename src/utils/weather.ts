export type WeatherConditionKind =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog';

export type TemperatureUnit = 'C' | 'F';

export interface WeatherDayOutlook {
  dateIso: string;
  dayLabel: string;
  conditionText: string;
  conditionKind: WeatherConditionKind;
  iconUri?: string | null;
  tempMaxC: number;
  tempMinC: number;
  precipPercent: number;
  humidityPercent: number;
  windKmh: number;
}

export interface CityWeatherSummary {
  cityId: string;
  source: 'google-weather' | 'open-meteo';
  fetchedAt: number;
  currentTempC: number | null;
  feelsLikeC: number | null;
  currentConditionText: string | null;
  currentConditionKind: WeatherConditionKind;
  currentHumidity: number | null;
  currentWindKmh: number | null;
  uvIndex: number | null;
  days: WeatherDayOutlook[];
}

export function celsiusToFahrenheit(tempC: number): number {
  return (tempC * 9) / 5 + 32;
}

export function formatTemperature(tempC: number, unit: TemperatureUnit): string {
  const val = unit === 'F' ? celsiusToFahrenheit(tempC) : tempC;
  return `${Math.round(val)}°${unit}`;
}

export function mapGoogleConditionToKind(typeStr?: string | null): WeatherConditionKind {
  const upper = (typeStr || '').toUpperCase();
  if (!upper) return 'partly_cloudy';
  if (upper.includes('THUNDER') || upper.includes('STORM')) return 'storm';
  if (upper.includes('SNOW') || upper.includes('BLIZZARD') || upper.includes('SLEET') || upper.includes('HAIL')) {
    return 'snow';
  }
  if (upper.includes('RAIN') || upper.includes('SHOWER') || upper.includes('DRIZZLE')) {
    return 'rain';
  }
  if (upper.includes('FOG') || upper.includes('MIST') || upper.includes('HAZE')) return 'fog';
  if (upper.includes('PARTLY') || upper.includes('MOSTLY_CLEAR') || upper.includes('SCATTERED')) {
    return 'partly_cloudy';
  }
  if (upper.includes('CLOUD') || upper.includes('OVERCAST')) return 'cloudy';
  if (upper.includes('CLEAR') || upper.includes('SUNNY')) return 'sunny';
  return 'partly_cloudy';
}

export function mapWmoCodeToCondition(code: number): {
  text: string;
  kind: WeatherConditionKind;
} {
  if (code === 0) return { text: 'Clear skies', kind: 'sunny' };
  if (code === 1) return { text: 'Mainly clear', kind: 'sunny' };
  if (code === 2) return { text: 'Partly cloudy', kind: 'partly_cloudy' };
  if (code === 3) return { text: 'Overcast', kind: 'cloudy' };
  if (code === 45 || code === 48) return { text: 'Misty fog', kind: 'fog' };
  if (code >= 51 && code <= 57) return { text: 'Light drizzle', kind: 'rain' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { text: code >= 65 || code === 82 ? 'Steady rain' : 'Passing showers', kind: 'rain' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { text: 'Snowfall', kind: 'snow' };
  }
  if (code >= 95) return { text: 'Thunderstorms', kind: 'storm' };
  return { text: 'Partly cloudy', kind: 'partly_cloudy' };
}

export function formatForecastDayLabel(dateIso: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const parsed = new Date(`${dateIso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function toFiniteNumber(val: unknown, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

export function normalizeGoogleWeatherPayload(
  cityId: string,
  forecastRaw: unknown,
  currentRaw?: unknown
): CityWeatherSummary {
  const forecastObj = (forecastRaw && typeof forecastRaw === 'object' ? forecastRaw : {}) as Record<
    string,
    unknown
  >;
  const rawDays = Array.isArray(forecastObj.forecastDays) ? forecastObj.forecastDays : [];

  const days: WeatherDayOutlook[] = rawDays.slice(0, 3).map((entry, idx) => {
    const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const displayDate = (item.displayDate && typeof item.displayDate === 'object'
      ? item.displayDate
      : {}) as Record<string, unknown>;
    const y = toFiniteNumber(displayDate.year, 2026);
    const m = String(toFiniteNumber(displayDate.month, 1)).padStart(2, '0');
    const d = String(toFiniteNumber(displayDate.day, idx + 1)).padStart(2, '0');
    const dateIso = `${y}-${m}-${d}`;

    const daytime = (item.daytimeForecast && typeof item.daytimeForecast === 'object'
      ? item.daytimeForecast
      : item.fullDayForecast && typeof item.fullDayForecast === 'object'
        ? item.fullDayForecast
        : item.nighttimeForecast && typeof item.nighttimeForecast === 'object'
          ? item.nighttimeForecast
          : {}) as Record<string, unknown>;
    const cond = (daytime.weatherCondition && typeof daytime.weatherCondition === 'object'
      ? daytime.weatherCondition
      : {}) as Record<string, unknown>;
    const desc = (cond.description && typeof cond.description === 'object'
      ? cond.description
      : {}) as Record<string, unknown>;
    const precip = (daytime.precipitation && typeof daytime.precipitation === 'object'
      ? daytime.precipitation
      : {}) as Record<string, unknown>;
    const precipProb = (precip.probability && typeof precip.probability === 'object'
      ? precip.probability
      : {}) as Record<string, unknown>;
    const wind = (daytime.wind && typeof daytime.wind === 'object'
      ? daytime.wind
      : {}) as Record<string, unknown>;
    const windSpeed = (wind.speed && typeof wind.speed === 'object'
      ? wind.speed
      : {}) as Record<string, unknown>;

    const maxTemp = (item.maxTemperature && typeof item.maxTemperature === 'object'
      ? item.maxTemperature
      : {}) as Record<string, unknown>;
    const minTemp = (item.minTemperature && typeof item.minTemperature === 'object'
      ? item.minTemperature
      : {}) as Record<string, unknown>;

    const condType = typeof cond.type === 'string' ? cond.type : undefined;
    const iconBaseUri = typeof cond.iconBaseUri === 'string' ? cond.iconBaseUri : null;

    return {
      dateIso,
      dayLabel: formatForecastDayLabel(dateIso, idx),
      conditionText: typeof desc.text === 'string' && desc.text.trim() ? desc.text : 'Clear & mild',
      conditionKind: mapGoogleConditionToKind(condType),
      iconUri: iconBaseUri ? `${iconBaseUri}.svg` : null,
      tempMaxC: toFiniteNumber(maxTemp.degrees, 16),
      tempMinC: toFiniteNumber(minTemp.degrees, 8),
      precipPercent: Math.round(toFiniteNumber(precipProb.percent, 0)),
      humidityPercent: Math.round(toFiniteNumber(daytime.relativeHumidity, 55)),
      windKmh: Math.round(toFiniteNumber(windSpeed.value, 10)),
    };
  });

  const cur = (currentRaw && typeof currentRaw === 'object' ? currentRaw : {}) as Record<
    string,
    unknown
  >;
  const curTempObj = (cur.temperature && typeof cur.temperature === 'object'
    ? cur.temperature
    : {}) as Record<string, unknown>;
  const curFeelsObj = (cur.feelsLikeTemperature && typeof cur.feelsLikeTemperature === 'object'
    ? cur.feelsLikeTemperature
    : {}) as Record<string, unknown>;
  const curCondObj = (cur.weatherCondition && typeof cur.weatherCondition === 'object'
    ? cur.weatherCondition
    : {}) as Record<string, unknown>;
  const curDescObj = (curCondObj.description && typeof curCondObj.description === 'object'
    ? curCondObj.description
    : {}) as Record<string, unknown>;
  const curWindObj = (cur.wind && typeof cur.wind === 'object'
    ? cur.wind
    : {}) as Record<string, unknown>;
  const curWindSpeed = (curWindObj.speed && typeof curWindObj.speed === 'object'
    ? curWindObj.speed
    : {}) as Record<string, unknown>;

  const fallbackDay = days[0];

  return {
    cityId,
    source: 'google-weather',
    fetchedAt: Date.now(),
    currentTempC:
      typeof curTempObj.degrees === 'number'
        ? curTempObj.degrees
        : fallbackDay
          ? Math.round((fallbackDay.tempMaxC + fallbackDay.tempMinC) / 2)
          : null,
    feelsLikeC: typeof curFeelsObj.degrees === 'number' ? curFeelsObj.degrees : null,
    currentConditionText:
      typeof curDescObj.text === 'string'
        ? curDescObj.text
        : fallbackDay?.conditionText ?? null,
    currentConditionKind:
      typeof curCondObj.type === 'string'
        ? mapGoogleConditionToKind(curCondObj.type)
        : fallbackDay?.conditionKind ?? 'partly_cloudy',
    currentHumidity:
      typeof cur.relativeHumidity === 'number'
        ? Math.round(cur.relativeHumidity)
        : fallbackDay?.humidityPercent ?? null,
    currentWindKmh:
      typeof curWindSpeed.value === 'number'
        ? Math.round(curWindSpeed.value)
        : fallbackDay?.windKmh ?? null,
    uvIndex: typeof cur.uvIndex === 'number' ? Math.round(cur.uvIndex) : null,
    days,
  };
}

export function normalizeOpenMeteoPayload(cityId: string, raw: unknown): CityWeatherSummary {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const current = (obj.current && typeof obj.current === 'object' ? obj.current : {}) as Record<
    string,
    unknown
  >;
  const daily = (obj.daily && typeof obj.daily === 'object' ? obj.daily : {}) as Record<
    string,
    unknown
  >;

  const dates = Array.isArray(daily.time) ? daily.time : [];
  const codes = Array.isArray(daily.weather_code) ? daily.weather_code : [];
  const maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  const precipProbs = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max
    : [];
  const windMax = Array.isArray(daily.wind_speed_10m_max) ? daily.wind_speed_10m_max : [];
  const humidityMean = Array.isArray(daily.relative_humidity_2m_mean)
    ? daily.relative_humidity_2m_mean
    : [];

  const days: WeatherDayOutlook[] = dates.slice(0, 3).map((d, idx) => {
    const dateIso = typeof d === 'string' ? d : `2026-11-${15 + idx}`;
    const mapped = mapWmoCodeToCondition(toFiniteNumber(codes[idx], 2));
    return {
      dateIso,
      dayLabel: formatForecastDayLabel(dateIso, idx),
      conditionText: mapped.text,
      conditionKind: mapped.kind,
      iconUri: null,
      tempMaxC: toFiniteNumber(maxTemps[idx], 15),
      tempMinC: toFiniteNumber(minTemps[idx], 7),
      precipPercent: Math.round(toFiniteNumber(precipProbs[idx], 10)),
      humidityPercent: Math.round(toFiniteNumber(humidityMean[idx], 60)),
      windKmh: Math.round(toFiniteNumber(windMax[idx], 12)),
    };
  });

  const curCond =
    typeof current.weather_code === 'number'
      ? mapWmoCodeToCondition(current.weather_code)
      : { text: days[0]?.conditionText ?? 'Partly cloudy', kind: days[0]?.conditionKind ?? 'partly_cloudy' };

  return {
    cityId,
    source: 'open-meteo',
    fetchedAt: Date.now(),
    currentTempC: typeof current.temperature_2m === 'number' ? current.temperature_2m : null,
    feelsLikeC:
      typeof current.apparent_temperature === 'number' ? current.apparent_temperature : null,
    currentConditionText: curCond.text,
    currentConditionKind: curCond.kind,
    currentHumidity:
      typeof current.relative_humidity_2m === 'number'
        ? Math.round(current.relative_humidity_2m)
        : days[0]?.humidityPercent ?? null,
    currentWindKmh:
      typeof current.wind_speed_10m === 'number'
        ? Math.round(current.wind_speed_10m)
        : days[0]?.windKmh ?? null,
    uvIndex: null,
    days,
  };
}

export function buildWeatherTravelTip(days: WeatherDayOutlook[], cityName: string): string {
  if (days.length === 0) {
    return `Check local rail advisories before heading out in ${cityName}.`;
  }
  const maxPrecip = Math.max(...days.map((d) => d.precipPercent));
  const minTemp = Math.min(...days.map((d) => d.tempMinC));
  const maxTemp = Math.max(...days.map((d) => d.tempMaxC));
  const hasSnow = days.some((d) => d.conditionKind === 'snow');

  if (hasSnow) {
    return `Snow outlook ahead in ${cityName}—wear waterproof boots with grip soles and keep spare heat packs (kairo) handy.`;
  }
  if (maxPrecip >= 50) {
    return `Rain probability peaks around ${maxPrecip}% over the next 3 days—tuck a compact folding umbrella (or grab a clear vinyl kasa at any konbini).`;
  }
  if (minTemp <= 7) {
    return `Chilly mornings down to ${Math.round(minTemp)}°C in ${cityName}—layer a light packable jacket for early temple visits before indoor heating kicks in.`;
  }
  if (maxTemp >= 26) {
    return `Warm afternoons reaching ${Math.round(maxTemp)}°C—carry a breathable UV layer and stay hydrated at street vending machines.`;
  }
  return `Pleasant walking weather across ${cityName} (${Math.round(minTemp)}°C–${Math.round(maxTemp)}°C)—ideal for morning shrine paths and outdoor markets.`;
}
