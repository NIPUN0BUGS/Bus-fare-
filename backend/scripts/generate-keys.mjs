#!/usr/bin/env node
/**
 * Generates RS256 keypairs for JWT signing and QR ticket signing.
 * Run once before first launch: node scripts/generate-keys.mjs
 *
 * Outputs:
 *   secrets/jwt-private.pem   secrets/jwt-public.pem
 *   secrets/qr-private.pem    secrets/qr-public.pem
 */
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SECRETS = join(ROOT, 'secrets');

mkdirSync(SECRETS, { recursive: true });

function generatePair(name) {
  const privatePath = join(SECRETS, `${name}-private.pem`);
  const publicPath  = join(SECRETS, `${name}-public.pem`);

  if (existsSync(privatePath) && existsSync(publicPath)) {
    const fingerprint = createHash('sha256')
      .update(readFileSync(publicPath))
      .digest('hex')
      .slice(0, 16);
    console.log(`[skip] ${name} keys already exist  (fingerprint: ${fingerprint}…)`);
    return;
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  writeFileSync(privatePath, privateKey, { mode: 0o600 });
  writeFileSync(publicPath,  publicKey,  { mode: 0o644 });

  const fingerprint = createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
  console.log(`[ok]   ${name} keys written          (fingerprint: ${fingerprint}…)`);
}

generatePair('jwt');
generatePair('qr');

// Print .env snippet so the developer can paste values directly
console.log('\n─── Paste into .env ────────────────────────────────────────');
for (const name of ['jwt', 'qr']) {
  const priv = readFileSync(join(SECRETS, `${name}-private.pem`), 'utf8')
    .replace(/\n/g, '\\n');
  const pub  = readFileSync(join(SECRETS, `${name}-public.pem`), 'utf8')
    .replace(/\n/g, '\\n');
  console.log(`${name.toUpperCase()}_PRIVATE_KEY="${priv}"`);
  console.log(`${name.toUpperCase()}_PUBLIC_KEY="${pub}"`);
  console.log();
}
console.log('────────────────────────────────────────────────────────────');
console.log('The PEM files are in ./secrets/ — add that directory to .gitignore.');
