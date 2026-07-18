import { Prisma, PrismaClient } from "@prisma/client";
import { PROCEDURE_MEDIA_SEED } from "../content/procedure-media";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

async function main() {
  let created = 0;
  let updated = 0;
  for (const item of PROCEDURE_MEDIA_SEED) {
    const service = await prisma.service.findUnique({
      where: { slug: item.serviceSlug },
      select: { id: true },
    });
    if (!service) throw new Error(`Missing service ${item.serviceSlug}`);
    const existing = await prisma.procedureMedia.findUnique({
      where: { serviceId_key: { serviceId: service.id, key: item.key } },
      select: { id: true },
    });
    const data = {
      image: item.image,
      identities: item.identities as Prisma.InputJsonValue,
      sourceUrl: item.sourceUrl,
      sourceLicense: item.sourceLicense,
    };
    if (!existing) {
      await prisma.procedureMedia.create({
        data: { serviceId: service.id, key: item.key, ...data },
      });
      created++;
    } else if (force) {
      await prisma.procedureMedia.update({ where: { id: existing.id }, data });
      updated++;
    }
  }
  console.log(
    `Procedure media synchronized: ${created} created, ${updated} updated, ${PROCEDURE_MEDIA_SEED.length} total.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
