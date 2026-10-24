import { PrismaClient, RoleName } from '@prisma/client';
const prisma = new PrismaClient();

const extraRoles = [
  { name: RoleName.OP_MANAGER, level: 2 },
  { name: RoleName.WEB_DEVELOPER, level: 1 },
  { name: RoleName.SOFTWARE_DEVELOPER, level: 1 },
  { name: RoleName.DIGITAL_MARKETER, level: 1 },
  { name: RoleName.CONTENT_CREATOR, level: 1 },
  { name: RoleName.VIDEO_EDITOR, level: 1 },
];

async function main() {
  for (const r of extraRoles) {
    const exists = await prisma.role.findUnique({ where: { name: r.name } });
    if (!exists) {
      await prisma.role.create({ data: r });
      console.log(`✅ Created role: ${r.name}`);
    } else {
      console.log(`⏭️ Role already exists: ${r.name}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
