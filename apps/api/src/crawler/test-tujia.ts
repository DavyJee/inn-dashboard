import { crawlTujia, extractUnitId } from './tujia';

// Note: Use a real, active Tujia unit ID for testing.
// The default below is a placeholder. Replace with actual Muju Inn ID.
const TEST_URL = process.env.TUJIA_TEST_URL || 'https://www.tujia.com/detail/123456.html';

async function main() {
  console.log('=== 途家爬虫测试 ===\n');

  const unitId = extractUnitId(TEST_URL);
  console.log(`URL: ${TEST_URL}`);
  console.log(`Extracted unitId: ${unitId}\n`);

  const testInn = {
    id: 999,
    name: '测试民宿',
    platform: 'tujia',
    url: TEST_URL,
    totalRooms: 5,
    isActive: true,
  };

  console.log('Starting crawl...\n');
  const result = await crawlTujia(testInn);

  console.log('\n--- Result ---');
  console.log(`Success: ${result.success}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  console.log(`Availabilities: ${result.availabilities.length}`);
  console.log(`Prices: ${result.prices.length}`);

  if (result.availabilities.length > 0) {
    console.log('\n--- First 5 days ---');
    for (let i = 0; i < Math.min(5, result.availabilities.length); i++) {
      const av = result.availabilities[i];
      console.log(
        `${av.date.toISOString().slice(0, 10)} | ` +
        `可订: ${av.availableRooms}/${av.totalRooms} | ` +
        `入住率: ${av.occupancyRate}% | ` +
        `最低价: ${av.lowestPrice ?? 'N/A'}`
      );
    }
  }

  if (result.prices.length > 0) {
    console.log('\n--- Price sample ---');
    for (let i = 0; i < Math.min(5, result.prices.length); i++) {
      const p = result.prices[i];
      console.log(`${p.date.toISOString().slice(0, 10)} | ¥${p.price} | ${p.roomType ?? ''}`);
    }
  }
}

main().catch(console.error);
