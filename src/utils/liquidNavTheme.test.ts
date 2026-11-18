import test from 'node:test';
import assert from 'node:assert/strict';
import { getJapaneseLiquidPalette } from './liquidNavTheme';
import { JAPANESE_THEMES } from '../data/japanData';

test('getJapaneseLiquidPalette returns valid normalized WebGL RGB triplets for all Japanese themes in dark and light modes', () => {
  for (const theme of JAPANESE_THEMES) {
    for (const isDark of [true, false]) {
      const palette = getJapaneseLiquidPalette(theme.id, isDark);
      assert.equal(palette.waterRgb.length, 3);
      assert.equal(palette.rimRgb.length, 3);
      for (const ch of [...palette.waterRgb, ...palette.rimRgb]) {
        assert.ok(ch >= 0 && ch <= 1, `Channel ${ch} out of [0..1] range`);
      }
      assert.ok(palette.accentCss.startsWith('#'));
    }
  }
});

test('getJapaneseLiquidPalette differentiates Kinpaku gold from Aizome indigo and Sakura blossom tints', () => {
  const kinpakuDark = getJapaneseLiquidPalette('kinpaku', true);
  const aizomeDark = getJapaneseLiquidPalette('aizome', true);
  const sakuraDark = getJapaneseLiquidPalette('sakura', true);
  const takeDark = getJapaneseLiquidPalette('take', true);

  // Kinpaku emphasizes red+green (warm gold) over blue
  assert.ok(kinpakuDark.waterRgb[0] > kinpakuDark.waterRgb[2]);
  // Aizome emphasizes blue channel
  assert.ok(aizomeDark.waterRgb[2] > aizomeDark.waterRgb[0]);
  // Sakura emphasizes red channel
  assert.ok(sakuraDark.waterRgb[0] > sakuraDark.waterRgb[1]);
  // Bamboo/Take emphasizes green channel
  assert.ok(takeDark.waterRgb[1] > takeDark.waterRgb[0]);
});
