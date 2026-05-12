import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  // Collect API responses
  const apiResponses: { url: string; body: string }[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('ctrip') || url.includes('tripcdn')) {
      try {
        const body = await response.text();
        if (body.includes('room') || body.includes('price') || body.includes('房') || body.includes('¥')) {
          apiResponses.push({ url, body: body.slice(0, 5000) });
        }
      } catch {
        // ignore
      }
    }
  });

  const url = 'https://hotels.ctrip.com/hotels/detail/?hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09';

  console.log('[Network] Navigating...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Click room tab
  const roomTab = await page.locator('text=房间').first();
  if (await roomTab.count() > 0) {
    await roomTab.click();
    await page.waitForTimeout(5000);
  }

  // Scroll down
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(3000);

  console.log(`[Network] Collected ${apiResponses.length} API responses`);

  // Save all API responses
  for (let i = 0; i < apiResponses.length; i++) {
    fs.writeFileSync(`/tmp/ctrip-api-${i}.json`, apiResponses[i].body);
    console.log(`[Network] API ${i}: ${apiResponses[i].url.slice(0, 120)}`);
  }

  // Try to parse each response for room data
  for (let i = 0; i < apiResponses.length; i++) {
    try {
      const data = JSON.parse(apiResponses[i].body);
      const rooms = findRoomData(data);
      if (rooms.length > 0) {
        console.log(`\n[Network] Found ${rooms.length} rooms in API ${i}:`);
        rooms.forEach((r: any, idx: number) => {
          console.log(`  [${idx}] ${r.name} | ¥${r.price} | ${r.bedType || ''} | ${r.area || ''}`);
        });
      }
    } catch {
      // not JSON
    }
  }

  // Also try to get window.__NFES_DATA__
  const nfesData = await page.evaluate(() => {
    // @ts-ignore
    return window.__NFES_DATA__;
  });
  if (nfesData) {
    fs.writeFileSync('/tmp/ctrip-nfes.json', JSON.stringify(nfesData, null, 2));
    console.log('[Network] Saved __NFES_DATA__ to /tmp/ctrip-nfes.json');
  }

  await browser.close();
}

function findRoomData(obj: any, depth = 0): any[] {
  if (depth > 15 || !obj) return [];
  const rooms: any[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      rooms.push(...findRoomData(item, depth + 1));
    }
  } else if (typeof obj === 'object') {
    // Check if this object looks like a room
    if ((obj.roomName || obj.roomTypeName || obj.baseRoomName || obj.name) &&
        (obj.price !== undefined || obj.avgPrice !== undefined || obj.minPrice !== undefined || obj.amount !== undefined)) {
      rooms.push({
        name: obj.roomName || obj.roomTypeName || obj.baseRoomName || obj.name,
        price: obj.price || obj.avgPrice || obj.minPrice || obj.amount,
        area: obj.area,
        bedType: obj.bedType || obj.bedTypeName,
      });
    } else {
      for (const key of Object.keys(obj)) {
        rooms.push(...findRoomData(obj[key], depth + 1));
      }
    }
  }

  return rooms;
}

main().catch(console.error);
