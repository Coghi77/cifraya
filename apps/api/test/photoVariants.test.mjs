import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { photoVariant } from '../dist/photoVariants.js';

test('photo variants preserve transparency, limit dimensions and reuse concurrent work', async () => {
  const input = await sharp({create:{width:1800,height:1400,channels:4,background:{r:255,g:210,b:0,alpha:0.5}}}).png().toBuffer();
  const [a,b] = await Promise.all([photoVariant('alpha-test',input,640),photoVariant('alpha-test',input,640)]);
  assert.equal(a,b);
  const metadata = await sharp(a).metadata();
  assert.equal(metadata.format,'webp');
  assert.equal(metadata.hasAlpha,true);
  assert.ok(metadata.width<=640 && metadata.height<=640);
  assert.ok(a.length<input.length);
  assert.equal(await photoVariant('alpha-test',input,640),a);
});
