const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create default shifts
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

  // Create admin user if no users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
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
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
