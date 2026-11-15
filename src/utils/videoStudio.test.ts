import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORE_VIDEO_PRESETS,
  extractVideoFromInteraction,
  getExplorePresetById,
  isBillingOrQuotaMessage,
  normalizeVideoAspectRatio,
  parseImageDataUrl,
  resolveExploreAssetFilename,
} from './videoStudio';

test('EXPLORE_VIDEO_PRESETS includes hero and all six Japanese cities', () => {
  const ids = EXPLORE_VIDEO_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, ['hero', 'Tokyo', 'Kyoto', 'Osaka', 'Sapporo', 'Nara', 'Kanazawa']);
  assert.equal(getExplorePresetById('kyoto')?.id, 'Kyoto');
});

test('resolveExploreAssetFilename prevents path traversal and resolves valid URLs/IDs', () => {
  assert.equal(resolveExploreAssetFilename('Tokyo'), 'city_tokyo_shibuya_1794670214672.jpg');
  assert.equal(
    resolveExploreAssetFilename('/images/city_kyoto_arashiyama_1794670217427.jpg'),
    'city_kyoto_arashiyama_1794670217427.jpg'
  );
  assert.equal(resolveExploreAssetFilename('../../etc/passwd'), null);
  assert.equal(resolveExploreAssetFilename(''), null);
});

test('normalizeVideoAspectRatio allows 16:9 and 9:16 and defaults safely', () => {
  assert.equal(normalizeVideoAspectRatio('9:16'), '9:16');
  assert.equal(normalizeVideoAspectRatio('16:9'), '16:9');
  assert.equal(normalizeVideoAspectRatio('4:3'), '16:9');
  assert.equal(normalizeVideoAspectRatio(undefined), '16:9');
});

test('parseImageDataUrl validates allowed image MIME types and rejects unsupported schemes', () => {
  const sampleBase64 = Buffer.from('fake-png-bytes').toString('base64');
  const parsed = parseImageDataUrl(`data:image/png;base64,${sampleBase64}`);
  assert.equal(parsed.mimeType, 'image/png');
  assert.equal(parsed.base64Data, sampleBase64);

  const jpgParsed = parseImageDataUrl(`data:image/jpg;base64,${sampleBase64}`);
  assert.equal(jpgParsed.mimeType, 'image/jpeg');

  assert.throws(() => parseImageDataUrl('https://example.com/photo.jpg'));
  assert.throws(() => parseImageDataUrl(`data:image/gif;base64,${sampleBase64}`));
});

test('extractVideoFromInteraction reads output_video directly and falls back to steps', () => {
  const direct = extractVideoFromInteraction({
    output_video: { mime_type: 'video/mp4', data: 'QUJDRA==' },
  });
  assert.deepEqual(direct, {
    mimeType: 'video/mp4',
    dataBase64: 'QUJDRA==',
    uri: null,
  });

  const fromSteps = extractVideoFromInteraction({
    steps: [
      {
        type: 'model_output',
        outputs: [{ type: 'video', mime_type: 'video/mp4', data: 'U1RVVw==' }],
      },
    ],
  });
  assert.deepEqual(fromSteps, {
    mimeType: 'video/mp4',
    dataBase64: 'U1RVVw==',
    uri: null,
  });

  assert.equal(extractVideoFromInteraction({}), null);
});

test('isBillingOrQuotaMessage detects paid-key / quota error signals', () => {
  assert.equal(isBillingOrQuotaMessage('403 PERMISSION_DENIED: Billing required'), true);
  assert.equal(isBillingOrQuotaMessage('RESOURCE_EXHAUSTED quota exceeded'), true);
  assert.equal(isBillingOrQuotaMessage('Network socket closed'), false);
});
