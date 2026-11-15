import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeatherTravelTip,
  celsiusToFahrenheit,
  formatTemperature,
  normalizeGoogleWeatherPayload,
  normalizeOpenMeteoPayload,
} from './weather';

test('celsiusToFahrenheit and formatTemperature convert and round accurately', () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(celsiusToFahrenheit(20), 68);
  assert.equal(formatTemperature(14.6, 'C'), '15°C');
  assert.equal(formatTemperature(15, 'F'), '59°F');
});

test('normalizeGoogleWeatherPayload slices 3 days and extracts current + daily fields safely', () => {
  const sampleForecast = {
    forecastDays: [
      {
        displayDate: { year: 2026, month: 11, day: 15 },
        maxTemperature: { degrees: 17.2 },
        minTemperature: { degrees: 9.4 },
        daytimeForecast: {
          weatherCondition: {
            type: 'PARTLY_CLOUDY',
            iconBaseUri: 'https://maps.gstatic.com/weather/v1/partly_cloudy',
            description: { text: 'Partly sunny' },
          },
          relativeHumidity: 52,
          precipitation: { probability: { percent: 15 } },
          wind: { speed: { value: 11 } },
        },
      },
      {
        displayDate: { year: 2026, month: 11, day: 16 },
        maxTemperature: { degrees: 14.8 },
        minTemperature: { degrees: 8.1 },
        daytimeForecast: {
          weatherCondition: { type: 'LIGHT_RAIN', description: { text: 'Light showers' } },
          relativeHumidity: 74,
          precipitation: { probability: { percent: 65 } },
          wind: { speed: { value: 18 } },
        },
      },
      {
        displayDate: { year: 2026, month: 11, day: 17 },
        maxTemperature: { degrees: 16.0 },
        minTemperature: { degrees: 7.5 },
        daytimeForecast: {
          weatherCondition: { type: 'CLEAR', description: { text: 'Sunny' } },
          relativeHumidity: 48,
          precipitation: { probability: { percent: 5 } },
          wind: { speed: { value: 9 } },
        },
      },
      {
        displayDate: { year: 2026, month: 11, day: 18 },
        maxTemperature: { degrees: 18.0 },
        minTemperature: { degrees: 9.0 },
      },
    ],
  };

  const sampleCurrent = {
    temperature: { degrees: 15.3 },
    feelsLikeTemperature: { degrees: 14.9 },
    relativeHumidity: 50,
    uvIndex: 3,
    weatherCondition: { type: 'CLEAR', description: { text: 'Sunny' } },
    wind: { speed: { value: 10 } },
  };

  const normalized = normalizeGoogleWeatherPayload('Tokyo', sampleForecast, sampleCurrent);
  assert.equal(normalized.cityId, 'Tokyo');
  assert.equal(normalized.source, 'google-weather');
  assert.equal(normalized.days.length, 3);
  assert.equal(normalized.days[0].dayLabel, 'Today');
  assert.equal(normalized.days[1].dayLabel, 'Tomorrow');
  assert.equal(normalized.days[1].conditionKind, 'rain');
  assert.equal(normalized.days[1].precipPercent, 65);
  assert.equal(normalized.currentTempC, 15.3);
  assert.equal(normalized.uvIndex, 3);
});

test('normalizeGoogleWeatherPayload supports fullDayForecast payload structure', () => {
  const fullDayPayload = {
    forecastDays: [
      {
        displayDate: { year: 2026, month: 11, day: 16 },
        maxTemperature: { degrees: 19 },
        minTemperature: { degrees: 11 },
        fullDayForecast: {
          weatherCondition: {
            type: 'MOSTLY_CLEAR',
            description: { text: 'Clear with periodic clouds' },
          },
          relativeHumidity: 60,
          precipitation: { probability: { percent: 20 } },
          wind: { speed: { value: 18 } },
        },
      },
      {
        displayDate: { year: 2026, month: 11, day: 17 },
        maxTemperature: { degrees: 13 },
        minTemperature: { degrees: 9 },
        fullDayForecast: {
          weatherCondition: {
            type: 'RAIN',
            description: { text: 'Afternoon showers' },
          },
          relativeHumidity: 78,
          precipitation: { probability: { percent: 70 } },
          wind: { speed: { value: 22 } },
        },
      },
      {
        displayDate: { year: 2026, month: 11, day: 18 },
        maxTemperature: { degrees: 18 },
        minTemperature: { degrees: 9 },
        fullDayForecast: {
          weatherCondition: {
            type: 'CLEAR',
            description: { text: 'Sunny' },
          },
          relativeHumidity: 48,
          precipitation: { probability: { percent: 5 } },
          wind: { speed: { value: 11 } },
        },
      },
    ],
  };

  const normalized = normalizeGoogleWeatherPayload('Tokyo', fullDayPayload);
  assert.equal(normalized.days[0].conditionText, 'Clear with periodic clouds');
  assert.equal(normalized.days[0].conditionKind, 'partly_cloudy');
  assert.equal(normalized.days[0].precipPercent, 20);
  assert.equal(normalized.days[0].windKmh, 18);
  assert.equal(normalized.days[1].conditionKind, 'rain');
  assert.equal(normalized.days[1].precipPercent, 70);
  assert.equal(normalized.days[2].conditionKind, 'sunny');
});

test('normalizeOpenMeteoPayload maps 3-day outlook and WMO codes accurately', () => {
  const raw = {
    current: {
      temperature_2m: 4.2,
      apparent_temperature: 1.5,
      relative_humidity_2m: 68,
      wind_speed_10m: 14,
      weather_code: 73,
    },
    daily: {
      time: ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'],
      weather_code: [73, 2, 0, 3],
      temperature_2m_max: [6.0, 7.5, 8.2, 9.0],
      temperature_2m_min: [-1.2, 0.4, 1.1, 2.0],
      precipitation_probability_max: [70, 25, 10, 40],
      wind_speed_10m_max: [19, 13, 11, 15],
      relative_humidity_2m_mean: [72, 61, 55, 65],
    },
  };

  const summary = normalizeOpenMeteoPayload('Sapporo', raw);
  assert.equal(summary.source, 'open-meteo');
  assert.equal(summary.days.length, 3);
  assert.equal(summary.currentConditionKind, 'snow');
  assert.equal(summary.days[0].conditionText, 'Snowfall');
  assert.equal(summary.days[2].conditionKind, 'sunny');
});

test('buildWeatherTravelTip tailors advice for rain, snow, cold, and mild conditions', () => {
  const rainyTip = buildWeatherTravelTip(
    [
      {
        dateIso: '2026-11-15',
        dayLabel: 'Today',
        conditionText: 'Showers',
        conditionKind: 'rain',
        tempMaxC: 16,
        tempMinC: 10,
        precipPercent: 75,
        humidityPercent: 80,
        windKmh: 14,
      },
    ],
    'Kyoto'
  );
  assert.match(rainyTip, /umbrella/i);

  const mildTip = buildWeatherTravelTip(
    [
      {
        dateIso: '2026-11-15',
        dayLabel: 'Today',
        conditionText: 'Sunny',
        conditionKind: 'sunny',
        tempMaxC: 19,
        tempMinC: 11,
        precipPercent: 10,
        humidityPercent: 50,
        windKmh: 8,
      },
    ],
    'Nara'
  );
  assert.match(mildTip, /walking weather/i);
});
