import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const existingUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        isAdmin: true,
      },
    });
    console.log('[Seed] Created default admin user: admin / admin123');
  }

  // Create sample inns if none exist
  const count = await prisma.inn.count();
  if (count === 0) {
    await prisma.inn.createMany({
      data: [
        {
          name: '沐居',
          platform: 'booking',
          platformId: 'muju-demo',
          url: 'https://www.booking.com/hotel/cn/muju.html',
          totalRooms: 8,
          location: '杭州九溪',
          isActive: true,
        },
        {
          name: '竞品民宿A',
          platform: 'ctrip',
          platformId: 'demo-a',
          url: 'https://hotels.ctrip.com/hotel/12345.html',
          totalRooms: 6,
          location: '杭州九溪',
          isActive: true,
        },
        {
          name: '竞品民宿B',
          platform: 'tujia',
          platformId: 'demo-b',
          url: 'https://www.tujia.com/detail/12345.html',
          totalRooms: 10,
          location: '杭州杨梅岭',
          isActive: true,
        },
      ],
    });
    console.log('[Seed] Created 3 sample inns');
  }

  console.log('[Seed] Done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
