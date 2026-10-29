// Run after the additive database migration, with MEDIA_STORAGE=r2 and R2 credentials.
// Copies are verified before recording their keys. Original database bytes are retained.
import { PrismaClient } from '@prisma/client';
import { readMedia, storeMedia, r2Enabled, digest } from '../apps/api/dist/mediaStorage.js';
if (!r2Enabled) throw new Error('MEDIA_STORAGE=r2 is required');
const db = new PrismaClient();
try {
  for (const [model,kind] of [['campaignPhoto','photos'],['paymentProof','proofs']]) {
    let cursor;
    let copied = 0;
    let verified = 0;
    while (true) {
      const rows = await db[model].findMany({take:20,orderBy:{id:'asc'},...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,data:true,storageKey:true,sha256:true,mimeType:true}});
      if (!rows.length) break;
      for (const row of rows) {
        if (row.storageKey) {
          const remote = await readMedia({...row,data:null});
          if (row.data && digest(row.data)!==digest(remote)) throw new Error('Existing copy mismatch');
          verified++;
        } else {
          if (!row.data) throw new Error('Media has neither bytes nor storage key');
          const stored = await storeMedia(Buffer.from(row.data),row.mimeType,kind);
          await readMedia(stored);
          await db[model].update({where:{id:row.id},data:{storageKey:stored.storageKey,sha256:stored.sha256}});
          copied++;
        }
      }
      cursor = rows.at(-1).id;
    }
    console.log(JSON.stringify({model,copied,verified,originalsRetained:true}));
  }
} finally {await db.$disconnect();}
