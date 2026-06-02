const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const ADMIN_EMAILS = [
  'arun.s@exotel.com',
  'ashwin.ts@exotel.com',
  'manikandan.palanisamy@exotel.com'
];

const LEGACY_WHITELIST = [
  { email: 'arun.s@exotel.com', role: 'admin' },
  { email: 'ashwin.ts@exotel.com', role: 'admin' },
  { email: 'vemana.kiran@exotel.com', role: 'employee' },
  { email: 'ruthwik.d@exotel.com', role: 'employee' },
  { email: 'sneha.sb@exotel.com', role: 'employee' },
  { email: 'akhil.a@exotel.com', role: 'employee' },
  { email: 'shreya.singh@exotel.com', role: 'employee' },
  { email: 'ashwini.v@exotel.com', role: 'employee' },
  { email: 'pratnadeep.sinha@exotel.com', role: 'employee' },
  { email: 'harsh.agrawal@exotel.com', role: 'employee' },
  { email: 'mangala.rajeshwari@exotel.com', role: 'employee' },
  { email: 'naveenkumar.k@exotel.com', role: 'employee' },
  { email: 'rajnish.singh@exotel.com', role: 'employee' },
  { email: 'diya.sarkar@exotel.com', role: 'employee' },
  { email: 'bindu.bhavani@exotel.com', role: 'employee' },
  { email: 'arun.naik@exotel.com', role: 'employee' },
  { email: 'rohit.anand@exotel.com', role: 'employee' },
  { email: 'ananya.ba@exotel.com', role: 'employee' },
  { email: 'turaka.aruna@exotel.com', role: 'employee' },
  { email: 'heena.k@exotel.com', role: 'employee' },
  { email: 'manikandan.palanisamy@exotel.com', role: 'admin' }
];

async function seedIfNeeded() {
  const prisma = new PrismaClient();

  try {
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (!adminUser) {
      console.log('Admin user not found, running seed...');

      const shifts = [
        { name: 'Morning Shift', startTime: '08:00', endTime: '17:00' },
        { name: 'Day Shift', startTime: '10:00', endTime: '19:00' },
        { name: 'Afternoon Shift', startTime: '13:00', endTime: '22:00' },
        { name: 'Evening Shift', startTime: '15:00', endTime: '00:00' }
      ];

      for (const shift of shifts) {
        await prisma.shift.upsert({
          where: { id: shift.name.toLowerCase().replace(/\s+/g, '-') },
          update: shift,
          create: {
            ...shift,
            id: shift.name.toLowerCase().replace(/\s+/g, '-')
          }
        });
      }
      console.log('Seeded default shifts');

      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash,
          name: 'Admin User',
          role: 'admin'
        }
      });
      console.log('Created default admin user (email: admin@example.com, password: admin123)');
    } else {
      console.log('Admin user already exists, skipping admin seed');
    }

    for (const email of ADMIN_EMAILS) {
      const updated = await prisma.user.updateMany({
        where: { email, role: { not: 'admin' } },
        data: { role: 'admin' }
      });
      if (updated.count > 0) console.log(`Promoted ${email} to admin (users)`);
      const updatedWhitelist = await prisma.allowedEmail.updateMany({
        where: { email, role: { not: 'admin' } },
        data: { role: 'admin' }
      });
      if (updatedWhitelist.count > 0) console.log(`Promoted ${email} to admin (allowed_emails)`);
    }

    const allowedCount = await prisma.allowedEmail.count();
    if (allowedCount === 0) {
      console.log('Allowed-email whitelist is empty, backfilling...');

      const existingUsers = await prisma.user.findMany({ select: { email: true, role: true } });
      const merged = new Map();
      for (const entry of LEGACY_WHITELIST) merged.set(entry.email, entry.role);
      for (const u of existingUsers) {
        if (!merged.has(u.email)) merged.set(u.email, u.role);
      }

      for (const [email, role] of merged) {
        await prisma.allowedEmail.create({
          data: { email, role, addedBy: 'system' }
        });
      }
      console.log(`Backfilled ${merged.size} allowed emails`);
    } else {
      console.log(`Allowed-email whitelist already has ${allowedCount} entries, skipping backfill`);
    }
  } catch (error) {
    console.error('Seed error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await seedIfNeeded();
  require('./src/index.js');
}

main();
