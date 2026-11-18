import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JIGOKUDANI_CAMERA_PRESETS,
  JIGOKUDANI_MONUMENTS,
  SHRINE_BIOMES,
  SHRINE_CAMERA_PRESETS,
  SHRINE_MONUMENTS,
  getAtmospherePreset,
  getCameraPreset,
  getCameraPresetsForBiome,
  getMonumentInfo,
} from './shrineSceneConfig';

test('SHRINE_CAMERA_PRESETS covers all five focal viewpoints including Temple Bell', () => {
  assert.equal(SHRINE_CAMERA_PRESETS.length, 5);
  const torii = getCameraPreset('torii');
  assert.equal(torii.id, 'torii');
  assert.equal(torii.position.length, 3);
  assert.equal(torii.target.length, 3);
  const bell = getCameraPreset('bell');
  assert.equal(bell.label, 'Temple Bell');
});

test('getAtmospherePreset scales lantern glow higher at night than dawn', () => {
  const dawn = getAtmospherePreset('dawn');
  const dusk = getAtmospherePreset('dusk');
  const night = getAtmospherePreset('night');
  assert.ok(night.lanternIntensity > dusk.lanternIntensity);
  assert.ok(dusk.lanternIntensity > dawn.lanternIntensity);
  assert.ok(dawn.keyIntensity > night.keyIntensity);
});

test('SHRINE_MONUMENTS links every interactive zone to etiquette guidance and camera preset', () => {
  for (const key of Object.keys(SHRINE_MONUMENTS) as Array<keyof typeof SHRINE_MONUMENTS>) {
    const info = getMonumentInfo(key);
    assert.ok(info.title.length > 0);
    assert.ok(info.etiquetteRule.length > 20);
    assert.equal(getCameraPreset(info.cameraPreset).id, info.cameraPreset);
  }
});

test('Jigokudani biome includes Winter Twilight blue-white vs amber steam contrast & valid presets', () => {
  const biome = SHRINE_BIOMES.jigokudani;
  assert.equal(biome.defaultTimeOfDay, 'winter_twilight');
  assert.equal(getCameraPresetsForBiome('jigokudani').length, JIGOKUDANI_CAMERA_PRESETS.length);

  const winter = getAtmospherePreset('winter_twilight');
  assert.equal(winter.label, 'Winter Twilight');
  assert.ok(winter.lanternIntensity > 5);
  assert.ok(typeof winter.amberSteamHex === 'number');

  // Blue channel dominant in cool snow sky/hemi fill vs red/amber dominant in steam glow
  const skyBlue = winter.skyBottomHex & 0xff;
  const skyRed = (winter.skyBottomHex >> 16) & 0xff;
  assert.ok(skyBlue > skyRed, 'Winter Twilight sky horizon should be cool blue-white');

  const steamRed = ((winter.amberSteamHex ?? 0) >> 16) & 0xff;
  const steamBlue = (winter.amberSteamHex ?? 0) & 0xff;
  assert.ok(steamRed > steamBlue, 'Amber steam warmth tint should be warm orange-amber');

  for (const key of Object.keys(JIGOKUDANI_MONUMENTS) as Array<keyof typeof JIGOKUDANI_MONUMENTS>) {
    const info = getMonumentInfo(key);
    assert.ok(info.etiquetteRule.length > 20);
    assert.equal(getCameraPreset(info.cameraPreset, 'jigokudani').id, info.cameraPreset);
  }
});

