import {z} from 'zod';

export const httpsUrl = z.string().trim().max(2000).url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Usá una dirección HTTPS sin credenciales.');

export const cardCollectionInput = z.object({
  name: z.string().trim().min(2).max(120),
  edition: z.string().trim().min(2).max(160),
  sourceUrl: httpsUrl,
  published: z.boolean(),
  cards: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    rarity: z.string().trim().min(1).max(80),
    number: z.string().trim().max(40),
    imageUrl: httpsUrl,
    featured: z.boolean().default(false),
  }).strict()).min(1).max(100),
}).strict();

export const cardCollectionUpdate = cardCollectionInput.extend({version:z.number().int().positive()});
