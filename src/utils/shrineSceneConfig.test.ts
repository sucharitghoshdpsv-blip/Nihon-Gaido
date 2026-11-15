import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHRINE_CAMERA_PRESETS,
  SHRINE_MONUMENTS,
  getAtmospherePreset,
  getCameraPreset,
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
