import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptVaultPayload,
  decryptVaultPayload,
  generateBase32Secret,
  generateTotpCode,
  verifyTotpCode,
  buildTotpUri,
} from './cryptoVault';

test('AES-GCM vault encryption and decryption roundtrip with passphrase', async () => {
  const secretDoc = JSON.stringify({
    title: 'Passport',
    docNumber: 'Z99881122',
    notes: 'Issued 2024, expires 2034',
  });
  const envelope = await encryptVaultPayload(secretDoc, 'sakura-vault-2026');
  assert.equal(envelope.alg, 'AES-GCM-256');
  assert.notEqual(envelope.cipherTextB64, secretDoc);

  const decrypted = await decryptVaultPayload(envelope, 'sakura-vault-2026');
  assert.equal(decrypted, secretDoc);

  await assert.rejects(async () => {
    await decryptVaultPayload(envelope, 'wrong-passphrase');
  });
});

test('RFC 6238 TOTP secret generation, URI, code generation and verification', async () => {
  const secret = generateBase32Secret();
  assert.ok(secret.length >= 16);
  assert.match(secret, /^[A-Z2-7]+$/);

  const uri = buildTotpUri(secret, 'traveler@example.com');
  assert.ok(uri.startsWith('otpauth://totp/'));
  assert.ok(uri.includes(`secret=${secret}`));

  const now = 1794670000000;
  const code = await generateTotpCode(secret, now);
  assert.match(code, /^\d{6}$/);

  const validNow = await verifyTotpCode(secret, code, now);
  assert.equal(validNow, true);

  const validNextWindow = await verifyTotpCode(secret, code, now + 25_000);
  assert.equal(validNextWindow, true);

  const invalidWrongCode = await verifyTotpCode(secret, '000000', now);
  // Note: 1 in 1,000,000 chance of collision; check altered digit instead
  const guaranteedWrong = code === '123456' ? '654321' : '123456';
  assert.equal(await verifyTotpCode(secret, guaranteedWrong, now), false);
  assert.equal(typeof invalidWrongCode, 'boolean');
});
