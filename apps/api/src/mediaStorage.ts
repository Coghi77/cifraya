import {S3Client, GetObjectCommand, PutObjectCommand} from '@aws-sdk/client-s3';
import {createHash, randomUUID} from 'node:crypto';

type Media = {data: Uint8Array | null; storageKey: string | null; sha256: string | null};
export const digest = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
export function storageConfig(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.MEDIA_STORAGE === 'r2';
  if (env.MEDIA_STORAGE && !['database','r2'].includes(env.MEDIA_STORAGE)) throw new Error('Invalid MEDIA_STORAGE');
  if (!enabled) return null;
  const {R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket} = env;
  if (!account || !/^[a-f0-9]{32}$/i.test(account) || !accessKeyId || !secretAccessKey || !bucket) throw new Error('Incomplete R2 configuration');
  return {account, accessKeyId, secretAccessKey, bucket};
}
const config = storageConfig();
const client = config ? new S3Client({region:'auto', endpoint:`https://${config.account}.r2.cloudflarestorage.com`, credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey}, maxAttempts:3, requestHandler:{connectionTimeout:5000,requestTimeout:15000}}) : null;
export const r2Enabled = Boolean(client);

export async function storeMedia(data: Buffer, mimeType: string, kind: 'photos'|'proofs'): Promise<Media & {data: Uint8Array<ArrayBuffer> | null}> {
  const sha256 = digest(data);
  if (!client || !config) return {data:new Uint8Array(data), storageKey:null, sha256};
  const storageKey = `${kind}/${randomUUID()}`;
  await client.send(new PutObjectCommand({Bucket:config.bucket, Key:storageKey, Body:data, ContentType:mimeType, CacheControl:'private, no-store', Metadata:{sha256}}));
  return {data:null, storageKey, sha256};
}

export async function readMedia(media: Media): Promise<Buffer> {
  if (media.data) return Buffer.from(media.data);
  if (!client || !config || !media.storageKey || !/^(photos|proofs)\/[a-f0-9-]{36}$/.test(media.storageKey)) throw new Error('Media storage unavailable');
  const result = await client.send(new GetObjectCommand({Bucket:config.bucket, Key:media.storageKey}));
  if (!result.Body || (result.ContentLength ?? 0) > 2_100_000) throw new Error('Invalid stored media');
  const data = Buffer.from(await result.Body.transformToByteArray());
  if (data.length > 2_100_000 || !media.sha256 || digest(data) !== media.sha256) throw new Error('Media integrity check failed');
  return data;
}
