import { chromium } from 'playwright';

const REAL_URL = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Intercept ALL network responses
  const apiCalls: any[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    // Capture JSON responses from ctrip/trip domains
    if ((url.includes('ctrip') || url.includes('tripcdn')) && contentType.includes('json')) {
      try {
        const json = await response.json();
        apiCalls.push({
          url: url.split('?')[0],
          status: response.status(),
          data: json,
        });
      } catch (e) {}
    }
  });

  console.log('Loading page...');
  await page.goto(REAL_URL, { waitUntil: 'networkidle', timeout: 90000 });

  // Wait extra time for lazy-loaded content
  console.log('Waiting 15s for lazy content...');
  await page.waitForTimeout(15000);

  console.log('\nURL:', page.url());
  console.log('Title:', await page.title());

  // Scroll down multiple times to trigger lazy loading
  console.log('Scrolling...');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(3000);
  }

  console.log('\n--- API calls captured ---');
  console.log(`Total JSON API calls: ${apiCalls.length}`);

  // Look for APIs containing room/price data
  const roomApis = apiCalls.filter(c => {
    const url = c.url.toLowerCase();
    const dataStr = JSON.stringify(c.data).toLowerCase();
    return url.includes('room') || url.includes('price') || dataStr.includes('room') || dataStr.includes('price');
  });

  console.log(`Room/price related APIs: ${roomApis.length}`);

  for (const api of roomApis) {
    console.log(`\nURL: ${api.url}`);
    console.log(`Status: ${api.status}`);
    const dataStr = JSON.stringify(api.data);
    console.log(`Data length: ${dataStr.length}`);
    console.log(`Preview: ${dataStr.slice(0, 500)}`);

    // Try to extract room info from data
    const data = api.data;
    if (data.data) {
      const d = data.data;
      if (d.roomList) console.log(`  -> roomList: ${d.roomList.length} items`);
      if (d.rooms) console.log(`  -> rooms: ${d.rooms.length} items`);
      if (d.saleRooms) console.log(`  -> saleRooms: ${d.saleRooms.length} items`);
      if (d.physicRoomMap) console.log(`  -> physicRoomMap keys: ${Object.keys(d.physicRoomMap).length}`);
      if (d.saleRoomMap) console.log(`  -> saleRoomMap keys: ${Object.keys(d.saleRoomMap).length}`);
    }
  }

  // Also try to find room data in page.evaluate
  console.log('\n--- DOM room search ---');
  const roomElements = await page.locator('text=/[¥￥]\\s*\\d{2,5}/').all();
  console.log(`Price elements in DOM: ${roomElements.length}`);

  for (const el of roomElements.slice(0, 10)) {
    const text = await el.textContent().catch(() => '');
    const parent = el.locator('xpath=..').locator('xpath=..').locator('xpath=..');
    const parentText = await parent.textContent().catch(() => '');
    console.log(`\n  Price: "${text?.trim()}"`);
    console.log(`  Context: "${parentText?.trim().slice(0, 200)}"`);
  }

  // Check if there's a specific section for room list
  console.log('\n--- Section search ---');
  const sections = await page.locator('div, section').all();
  let roomSectionCount = 0;
  for (const section of sections) {
    const text = await section.textContent().catch(() => '');
    if (text && text.includes('预订') && text.includes('¥') && text.length > 100 && text.length < 1000) {
      roomSectionCount++;
      if (roomSectionCount <= 5) {
        console.log(`\nRoom section ${roomSectionCount}:`);
        console.log(`  ${text.trim().slice(0, 300)}`);
      }
    }
  }
  console.log(`\nTotal room-like sections: ${roomSectionCount}`);

  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
