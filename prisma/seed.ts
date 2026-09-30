import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const existing = await db.campaign.findUnique({ where: { slug: 'campana-demo' } });
  if (existing) return;
  await db.campaign.create({
    data: {
      slug: 'campana-demo',
      title: 'Campaña de demostración',
      description: 'Una vista de prueba para definir el diseño y el recorrido de compra. No se reciben pagos.',
      prize: 'Premio por definir',
      priceCrc: 1000,
      numberCount: 100,
      numberWidth: 3,
      status: 'LIVE',
      numbers: { createMany: { data: Array.from({ length: 100 }, (_, value) => ({ value })) } },
    },
  });
}

main().finally(() => db.$disconnect());
