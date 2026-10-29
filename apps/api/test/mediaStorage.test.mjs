import test from 'node:test';
import assert from 'node:assert/strict';
import { S3Client } from '@aws-sdk/client-s3';

test('database media remain readable and invalid storage configuration fails closed', async () => {
  delete process.env.MEDIA_STORAGE;
  const m = await import('../dist/mediaStorage.js?database');
  assert.equal(m.storageConfig({}), null);
  assert.throws(() => m.storageConfig({MEDIA_STORAGE:'other'}));
  assert.throws(() => m.storageConfig({MEDIA_STORAGE:'r2'}));
  const bytes = Buffer.from('legacy image');
  const stored = await m.storeMedia(bytes, 'image/webp', 'photos');
  assert.equal(stored.storageKey, null);
  assert.deepEqual(await m.readMedia(stored), bytes);
  await assert.rejects(m.readMedia({data:null,storageKey:'photos/missing',sha256:null}));
});

test('R2 round trip verifies bytes and refuses corrupted or invalid objects', async () => {
  Object.assign(process.env, {MEDIA_STORAGE:'r2',R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'test',R2_SECRET_ACCESS_KEY:'test',R2_BUCKET:'test'});
  const original = S3Client.prototype.send;
  const objects = new Map();
  let corrupt = false;
  S3Client.prototype.send = async function(command) {
    const {Key,Body} = command.input;
    if (Body) {objects.set(Key, Buffer.from(Body)); return {};}
    const bytes = corrupt ? Buffer.from('corrupt') : objects.get(Key);
    return {ContentLength:bytes.length,Body:{transformToByteArray:async()=>bytes}};
  };
  try {
    const m = await import('../dist/mediaStorage.js?r2');
    const bytes = Buffer.from('private proof');
    const stored = await m.storeMedia(bytes, 'image/webp', 'proofs');
    assert.equal(stored.data, null);
    assert.match(stored.storageKey, /^proofs\/[a-f0-9-]{36}$/);
    assert.deepEqual(await m.readMedia(stored), bytes);
    corrupt = true;
    await assert.rejects(m.readMedia(stored), /integrity/);
    await assert.rejects(m.readMedia({...stored,storageKey:'https://untrusted.example/image'}), /unavailable/);
    S3Client.prototype.send = async () => {throw new Error('storage offline');};
    await assert.rejects(m.storeMedia(bytes,'image/webp','photos'), /offline/);
  } finally {
    S3Client.prototype.send = original;
    delete process.env.MEDIA_STORAGE;
  }
});
