import { chromium } from 'playwright';

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

  const url = 'https://hotels.ctrip.com/hotels/detail/?hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09';

  console.log('[Explore] Navigating...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // 1. Try to extract __NEXT_DATA__ which contains all hotel data
  const nextData = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? el.textContent : null;
  });

  if (nextData) {
    console.log('[Explore] Found __NEXT_DATA__, length:', nextData.length);
    try {
      const data = JSON.parse(nextData);
      // Try to find room list in the data
      const rooms = findRooms(data);
      console.log('\n--- Rooms from __NEXT_DATA__ ---');
      console.log(JSON.stringify(rooms, null, 2).slice(0, 3000));
    } catch {
      console.log('[Explore] Failed to parse __NEXT_DATA__');
    }
  }

  // 2. Click "房间" tab
  const roomTab = await page.locator('text=房间').first();
  if (await roomTab.count() > 0) {
    console.log('[Explore] Clicking 房间 tab...');
    await roomTab.click();
    await page.waitForTimeout(5000);
  }

  // 3. Scroll down
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/tmp/ctrip-final.png', fullPage: false });

  // 4. Extract visible room cards
  const visibleRooms = await page.evaluate(() => {
    const results: any[] = [];
    // Try multiple approaches
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const text = div.textContent?.trim() || '';
      // Look for divs that contain price and room info
      if ((text.includes('¥') || text.includes('￥')) && text.includes('房')) {
        const priceMatch = text.match(/[¥￥]\s*(\d+)/);
        if (priceMatch) {
          results.push({
            text: text.slice(0, 200),
            price: parseInt(priceMatch[1]),
          });
        }
      }
    }
    return results.slice(0, 20);
  });
  console.log('\n--- Visible Room Cards ---');
  visibleRooms.forEach((r, i) => console.log(`  [${i}] ¥${r.price} | ${r.text.slice(0, 100)}`));

  // 5. Check for API response data in page
  const apiData = await page.evaluate(() => {
    // Look for any script that contains room data
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('roomList') || text.includes('rooms') || text.includes('priceInfo')) {
        return text.slice(0, 2000);
      }
    }
    return null;
  });
  if (apiData) {
    console.log('\n--- Script with room data ---');
    console.log(apiData);
  }

  await browser.close();
}

function findRooms(obj: any, depth = 0): any[] {
  if (depth > 10) return [];
  const rooms: any[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        if (item.roomName || item.roomTypeName || item.baseRoomName) {
          rooms.push({
            name: item.roomName || item.roomTypeName || item.baseRoomName,
            price: item.price || item.avgPrice || item.minPrice,
            area: item.area,
            bedType: item.bedType,
          });
        } else {
          rooms.push(...findRooms(item, depth + 1));
        }
      }
    }
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        if (val.roomName || val.roomTypeName || val.baseRoomName) {
          rooms.push({
            name: val.roomName || val.roomTypeName || val.baseRoomName,
            price: val.price || val.avgPrice || val.minPrice,
            area: val.area,
            bedType: val.bedType,
          });
        } else {
          rooms.push(...findRooms(val, depth + 1));
        }
      }
    }
  }
  return rooms;
}

main().catch(console.error);
