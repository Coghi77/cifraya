import {z} from 'zod';
export const drawFields = {drawMode:z.enum(['DATE','SOLD_OUT','ANNOUNCED']).optional(),drawDate:z.string().datetime().nullable().optional()};
export function resolveDrawSchedule(input:{drawMode?:string;drawDate?:string|null}, current?:{drawMode:string;drawDate:Date|null}) {
  const mode=input.drawMode ?? (input.drawDate ? 'DATE' : current?.drawMode ?? 'ANNOUNCED');
  const date=input.drawDate===undefined ? current?.drawDate?.toISOString() ?? null : input.drawDate;
  return z.object({drawMode:z.enum(['DATE','SOLD_OUT','ANNOUNCED']),drawDate:z.string().datetime().nullable()})
    .refine(value=>value.drawMode!=='DATE'||value.drawDate!==null,{message:'Indicá la fecha y hora del sorteo.'})
    .transform(value=>({drawMode:value.drawMode,drawDate:value.drawMode==='DATE' ? new Date(value.drawDate!) : null}))
    .safeParse({drawMode:mode,drawDate:date});
}
