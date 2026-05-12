import { crawlCtrip, extractHotelId, testCtripCrawler } from './ctrip';

async function main() {
  console.log('=== 携程爬虫测试 ===\n');

  // Test URL parsing
  const testUrls = [
    'https://hotels.ctrip.com/hotels/12345.html',
    'https://hotels.ctrip.com/hotels/12345.html?checkIn=2025-06-01',
    'https://www.ctrip.com/hotels/hangzhou12345.html',
  ];

  console.log('--- URL解析测试 ---');
  for (const url of testUrls) {
    const id = extractHotelId(url);
    console.log(`  ${url} -> hotelId: ${id}`);
  }

  // Test with a real Hangzhou hotel URL if provided
  const testUrl = process.env.CTRIP_TEST_URL || 'https://hotels.ctrip.com/hotels/12345.html';
  console.log(`\n--- 爬虫测试: ${testUrl} ---\n`);

  const result = await testCtripCrawler(testUrl);
  console.log('\n--- 完整结果 ---');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
