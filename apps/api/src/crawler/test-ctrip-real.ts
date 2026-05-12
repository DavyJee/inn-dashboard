import { crawlCtrip, closeBrowser } from './ctrip';

const REAL_URL = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

async function main() {
  console.log('=== 携程爬虫真实URL测试 ===\n');
  console.log('URL:', REAL_URL);

  const testInn = {
    id: 999,
    name: '沐居民宿',
    platform: 'ctrip',
    url: REAL_URL,
    totalRooms: 5,
    isActive: true,
  };

  console.log('开始抓取...\n');
  const result = await crawlCtrip(testInn);

  console.log('\n--- 结果 ---');
  console.log(`Success: ${result.success}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log(`Availabilities: ${result.availabilities.length}`);
  console.log(`Prices: ${result.prices.length}`);

  if (result.availabilities.length > 0) {
    console.log('\n--- 未来7天房态 ---');
    for (let i = 0; i < Math.min(7, result.availabilities.length); i++) {
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
    console.log('\n--- 价格样本 ---');
    for (let i = 0; i < Math.min(7, result.prices.length); i++) {
      const p = result.prices[i];
      console.log(`${p.date.toISOString().slice(0, 10)} | ¥${p.price} | ${p.roomType ?? ''}`);
    }
  }

  await closeBrowser();
  console.log('\nDone.');
}

main().catch(console.error);
