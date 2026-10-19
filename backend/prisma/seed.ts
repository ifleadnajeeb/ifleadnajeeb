import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLE_LEVELS: Record<RoleName, number> = {
  OP_MANAGER: 50,
  WEB_DEVELOPER: 20,
  SOFTWARE_DEVELOPER: 20,
  DIGITAL_MARKETER: 20,
  CONTENT_CREATOR: 20,
  VIDEO_EDITOR: 20,

  ADMIN: 100,
  CEO: 80,
  BDM: 60,
  SALES_HEAD: 40,
  BDE: 20,
};

const MODULES = [
  'dashboard', 'leads', 'customers', 'customer360', 'followups',
  'appointments', 'calendar', 'tasks', 'projects', 'documents',
  'activities', 'reports', 'performance', 'notifications', 'users',
  'roles', 'permissions', 'organization', 'audit', 'ai',
  'integrations', 'whatsapp', 'settings',
];

const ACTIONS = ['read', 'create', 'update', 'delete', 'assign', 'export'];

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  OP_MANAGER: ['dashboard:read', 'tasks:*', 'projects:*', 'reports:*', 'users:read'],
  WEB_DEVELOPER: ['dashboard:read', 'tasks:*'],
  SOFTWARE_DEVELOPER: ['dashboard:read', 'tasks:*'],
  DIGITAL_MARKETER: ['dashboard:read', 'tasks:*'],
  CONTENT_CREATOR: ['dashboard:read', 'tasks:*'],
  VIDEO_EDITOR: ['dashboard:read', 'tasks:*'],

  ADMIN: ['*'],
  CEO: [
    'dashboard:read', 'leads:*', 'customers:*', 'customer360:*',
    'followups:*', 'appointments:*', 'calendar:*', 'tasks:*',
    'projects:*', 'documents:*', 'activities:*', 'reports:*',
    'performance:read', 'notifications:*', 'ai:*',
    'users:read', 'users:create', 'roles:read', 'permissions:read',
    'audit:read',
  ],
  BDM: [
    'dashboard:read', 'leads:*', 'customers:*', 'customer360:*',
    'followups:*', 'appointments:*', 'calendar:*', 'tasks:*',
    'projects:*', 'reports:read', 'performance:read',
    'notifications:*', 'ai:*', 'users:read', 'users:create',
  ],
  SALES_HEAD: [
    'dashboard:read', 'leads:read', 'leads:update', 'leads:assign',
    'customers:read', 'customers:update', 'followups:*',
    'appointments:*', 'calendar:*', 'tasks:*', 'projects:read',
    'performance:read', 'notifications:*', 'ai:*',
    'users:read', 'users:create',
  ],
  BDE: [
    'dashboard:read', 'leads:read', 'leads:create', 'leads:update',
    'customers:read', 'followups:read', 'followups:create',
    'followups:update', 'appointments:read', 'appointments:create',
    'calendar:read', 'tasks:read', 'tasks:update',
    'notifications:read', 'performance:read', 'ai:read',
  ],
};

async function main() {
  console.log('🌱 Seeding database...');

  const permissions: { key: string; module: string; action: string }[] = [];
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      permissions.push({ key: `${module}:${action}`, module, action });
    }
  }
  await prisma.permission.createMany({ data: permissions, skipDuplicates: true });
  const allPermissions = await prisma.permission.findMany();
  console.log(`✅ ${allPermissions.length} permissions`);

  for (const name of Object.keys(ROLE_LEVELS) as RoleName[]) {
    await prisma.role.upsert({
      where: { name },
      update: { level: ROLE_LEVELS[name] },
      create: { name, level: ROLE_LEVELS[name], description: `${name} role` },
    });
  }
  const roles = await prisma.role.findMany();
  console.log(`✅ ${roles.length} roles`);

  for (const role of roles) {
    const allowed = ROLE_PERMISSIONS[role.name];
    const grants = allowed.includes('*')
      ? allPermissions
      : allPermissions.filter((p) => {
          if (allowed.includes(p.key)) return true;
          const [mod] = p.key.split(':');
          return allowed.includes(`${mod}:*`);
        });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: grants.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`   ${role.name}: ${grants.length} permissions`);
  }

  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { name: 'Demo Corp', slug: 'demo' },
  });

  let team = await prisma.team.findFirst({
    where: { organizationId: org.id, name: 'Sales Team A' },
  });
  if (!team) {
    team = await prisma.team.create({
      data: { name: 'Sales Team A', organizationId: org.id },
    });
  }

  const adminRole = roles.find((r) => r.name === 'ADMIN')!;
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'System Admin',
      passwordHash,
      organizationId: org.id,
      roleId: adminRole.id,
      teamId: team.id,
    },
  });

  // Build proper hierarchy: admin → ceo → bdm → saleshead → bde
  const ceo = await prisma.user.upsert({
    where: { email: 'ceo@demo.com' },
    update: { managerId: admin.id },
    create: {
      email: 'ceo@demo.com', name: 'CEO User', passwordHash,
      organizationId: org.id,
      roleId: roles.find(r => r.name === 'CEO')!.id,
      teamId: team.id, managerId: admin.id,
    },
  });

  const bdm = await prisma.user.upsert({
    where: { email: 'bdm@demo.com' },
    update: { managerId: ceo.id },
    create: {
      email: 'bdm@demo.com', name: 'BDM User', passwordHash,
      organizationId: org.id,
      roleId: roles.find(r => r.name === 'BDM')!.id,
      teamId: team.id, managerId: ceo.id,
    },
  });

  const saleshead = await prisma.user.upsert({
    where: { email: 'saleshead@demo.com' },
    update: { managerId: bdm.id },
    create: {
      email: 'saleshead@demo.com', name: 'Sales Head', passwordHash,
      organizationId: org.id,
      roleId: roles.find(r => r.name === 'SALES_HEAD')!.id,
      teamId: team.id, managerId: bdm.id,
    },
  });

  const bde = await prisma.user.upsert({
    where: { email: 'bde@demo.com' },
    update: { managerId: saleshead.id },
    create: {
      email: 'bde@demo.com', name: 'BDE User', passwordHash,
      organizationId: org.id,
      roleId: roles.find(r => r.name === 'BDE')!.id,
      teamId: team.id, managerId: saleshead.id,
    },
  });

  // bde already defined above
  if (bde) {
    const leadCount = await prisma.lead.count();
    if (leadCount === 0) {
      await prisma.lead.createMany({
        data: [
          {
            organizationId: org.id, name: 'John Doe', email: 'john@acme.com',
            phone: '9876543210', company: 'Acme Inc', source: 'manual',
            priority: 'HOT', status: 'NEW', value: 50000,
            assignedToId: bde.id, createdById: admin.id,
          },
          {
            organizationId: org.id, name: 'Jane Smith', email: 'jane@globex.com',
            phone: '9876543211', company: 'Globex Corp', source: 'manual',
            priority: 'MEDIUM', status: 'CONTACTED', value: 75000,
            assignedToId: bde.id, createdById: admin.id,
          },
          {
            organizationId: org.id, name: 'Bob Wilson', email: 'bob@initech.com',
            phone: '9876543212', company: 'Initech', source: 'manual',
            priority: 'LOW', status: 'QUALIFIED', value: 120000,
            assignedToId: bde.id, createdById: admin.id,
          },
        ],
      });
      console.log('✅ 3 demo leads created');
    }
  }

  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Demo users (password: Admin@123):');
  console.log('  admin@demo.com       (ADMIN)');
  console.log('  ceo@demo.com         (CEO)');
  console.log('  bdm@demo.com         (BDM)');
  console.log('  saleshead@demo.com   (SALES_HEAD)');
  console.log('  bde@demo.com         (BDE)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
