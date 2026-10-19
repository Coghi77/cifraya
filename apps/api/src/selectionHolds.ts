import { Prisma, type PrismaClient } from '@prisma/client';
import { chooseBaseNumbers, invertedValues, reverseNumber } from './invertedNumbers.js';

export const HOLD_MS = 5 * 60_000;
export function selectable(key?: string): Prisma.EntryNumberWhereInput {
  return { status: 'AVAILABLE', OR: [{ holdKey: null }, { holdExpiresAt: { lte: new Date() } }, ...(key ? [{ holdKey: key }] : [])] };
}

// Campaign row lock coordinates random, partial manual, replacement and inverse selections
// across all API processes. Each inventory claim is also conditional, never read-then-write.
export async function selectNumbers(db: PrismaClient, campaign: { id: string; numberWidth: number; invertedEnabled: boolean }, key: string, input: { quantity: number; values?: number[]; includeInverted?: boolean; change?: boolean }) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Campaign" WHERE id = ${campaign.id} FOR UPDATE`;
    const live = await tx.campaign.findUnique({ where: { id: campaign.id }, select: { status: true } });
    if (live?.status !== 'LIVE') throw Error('CAMPAIGN_CLOSED');
    const existing = await tx.numberProposal.findUnique({ where: { campaignId_sessionKey: { campaignId: campaign.id, sessionKey: key } } });
    const valid = existing && !existing.consumedAt && existing.expiresAt > new Date();
    if (input.change && !valid) throw Error('PROPOSAL_EXPIRED');
    if (input.change && existing!.changesUsed >= 5) throw Error('NO_CHANGES_LEFT');
    const quantity = input.change ? existing!.quantity : input.quantity;
    let values = input.values ? [...input.values].sort((a,b) => a-b) : undefined;
    if (!values && !input.change && valid && existing.quantity === quantity && existing.values.length === quantity) values = existing.values;
    if (!values) {
      const available = await tx.entryNumber.findMany({ where: { campaignId: campaign.id, ...selectable(key), ...(input.change ? { value: { notIn: existing!.values } } : {}) }, select: { value: true } });
      values = chooseBaseNumbers(available.map(n => n.value), quantity, campaign.numberWidth, campaign.invertedEnabled) || undefined;
      if (!values) throw Error('NOT_ENOUGH_NUMBERS');
    }
    const expiresAt = valid ? existing.expiresAt : new Date(Date.now() + HOLD_MS);
    const reversed = campaign.invertedEnabled && values.length === quantity ? invertedValues(values, campaign.numberWidth, new Set(values.map(v => reverseNumber(v, campaign.numberWidth)))) : null;
    if (input.includeInverted && !reversed) throw Error('NUMBER_UNAVAILABLE');
    const allValues = [...values, ...(input.includeInverted ? reversed! : [])];
    const claimed = await tx.entryNumber.updateMany({ where: { campaignId: campaign.id, value: { in: allValues }, ...selectable(key) }, data: { holdKey: key, holdExpiresAt: expiresAt } });
    if (claimed.count !== allValues.length) throw Error('NUMBER_UNAVAILABLE');
    await tx.entryNumber.updateMany({ where: { campaignId: campaign.id, holdKey: key, value: { notIn: allValues } }, data: { holdKey: null, holdExpiresAt: null } });
    const proposal = await tx.numberProposal.upsert({ where: { campaignId_sessionKey: { campaignId: campaign.id, sessionKey: key } }, create: { campaignId: campaign.id, sessionKey: key, values, quantity, expiresAt }, update: { values, quantity, expiresAt, consumedAt: null, changesUsed: valid ? existing.changesUsed + (input.change ? 1 : 0) : 0 } });
    const inverseAvailable = reversed && await tx.entryNumber.count({ where: { campaignId: campaign.id, value: { in: reversed }, ...selectable(key) } }) === reversed.length;
    return { values: proposal.values, expiresAt, changesRemaining: Math.max(0, 5-proposal.changesUsed), invertedValues: inverseAvailable ? reversed : null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
