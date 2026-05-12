import { PrismaClient } from '@prisma/client';
import { startOfDay } from 'date-fns/startOfDay';
import { addDays } from 'date-fns/addDays';
import { subDays } from 'date-fns/subDays';

const prisma = new PrismaClient();

async function main() {
  await prisma.roomAvailability.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.alert.deleteMany();
  console.log('[MockSeed] Cleared old mock data');

  const inns = await prisma.inn.findMany();
  if (inns.length === 0) {
    console.log('[MockSeed] No inns found, skipping');
    return;
  }

  const today = startOfDay(new Date());
  const records: any[] = [];

  for (const inn of inns) {
    // Past 14 days + Future 30 days
    for (let offset = -14; offset < 30; offset++) {
      const date = addDays(today, offset);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseRate = isWeekend ? 0.7 : 0.4;
      const randomFactor = Math.random() * 0.3;
      const occupancyRate = Math.min(100, Math.max(0, (baseRate + randomFactor) * 100));
      const bookedRooms = Math.round((occupancyRate / 100) * inn.totalRooms);
      const availableRooms = inn.totalRooms - bookedRooms;
      const lowestPrice = isWeekend ? 800 + Math.random() * 400 : 500 + Math.random() * 300;

      records.push({
        innId: inn.id,
        date,
        availableRooms,
        totalRooms: inn.totalRooms,
        bookedRooms,
        occupancyRate: Number(occupancyRate.toFixed(1)),
        lowestPrice: Number(lowestPrice.toFixed(0)),
        capturedAt: subDays(today, Math.floor(Math.random() * 7)),
      });
    }
  }

  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await prisma.roomAvailability.createMany({ data: batch });
  }

  console.log(`[MockSeed] Created ${records.length} mock availability records`);

  // Price history
  const priceRecords: any[] = [];
  for (const inn of inns) {
    for (let offset = -14; offset < 30; offset++) {
      const date = addDays(today, offset);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const basePrice = isWeekend ? 800 : 500;
      const price = basePrice + Math.random() * 400;
      priceRecords.push({
        innId: inn.id,
        date,
        price: Number(price.toFixed(0)),
        roomType: '标准房',
        capturedAt: subDays(today, Math.floor(Math.random() * 7)),
      });
    }
  }

  for (let i = 0; i < priceRecords.length; i += batchSize) {
    const batch = priceRecords.slice(i, i + batchSize);
    await prisma.priceHistory.createMany({ data: batch });
  }

  console.log(`[MockSeed] Created ${priceRecords.length} mock price records`);

  // Sample alerts
  await prisma.alert.createMany({
    data: [
      { type: 'occupancy_drop', innId: inns[0]?.id, message: '沐居今日预订率较上周下降15%', severity: 'medium', isResolved: false },
      { type: 'price_change', innId: inns[1]?.id, message: '竞品民宿A周末价格上调20%', severity: 'low', isResolved: false },
    ],
  });
  console.log('[MockSeed] Created sample alerts');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
