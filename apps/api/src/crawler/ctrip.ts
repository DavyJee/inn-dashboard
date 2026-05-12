import { chromium, Browser, Page } from 'playwright';
import { startOfDay, addDays, format } from 'date-fns';
import type { CrawlResult } from './index';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1366,768',
        '--hide-scrollbars',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
      ],
    });
  }
  return browser;
}

async function createPage(): Promise<Page> {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    permissions: ['notifications'],
    colorScheme: 'light',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' },
    ]});
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update' }, OnRestartRequiredReason: { APP_UPDATE: 'app_update' } } };
    const originalQuery = window.navigator.permissions.query;
    // @ts-ignore
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission, onchange: null })
        : originalQuery(parameters);
    // @ts-ignore
    window.navigator.hardwareConcurrency = 8;
    // @ts-ignore
    window.navigator.deviceMemory = 8;
  });

  return page;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function randomDelay(min = 2000, max = 5000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

/**
 * Extract hotelId from various Ctrip URL formats
 */
export function extractHotelId(url: string): string | null {
  let match = url.match(/[?&]hotelId=(\d+)/);
  if (match) return match[1];
  match = url.match(/[?&]optionId=(\d+)/);
  if (match) return match[1];
  match = url.match(/hotels\/(\d+)\.html/);
  if (match) return match[1];
  match = url.match(/hotels\/[^/]*?(\d{5,})\.html/);
  if (match) return match[1];
  return null;
}

/**
 * Build Ctrip URL preserving query params, only updating checkIn/checkOut
 */
function buildCtripUrl(baseUrl: string, checkIn: string, checkOut: string): string {
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set('checkIn', checkIn);
  urlObj.searchParams.set('checkOut', checkOut);
  return urlObj.toString();
}

interface CtripRoomData {
  name: string;
  price: number | null;
  available: boolean;
  remaining: number;
  bedType: string;
  area: string;
}

interface CtripApiResponse {
  data?: {
    roomList?: Array<{ key: string; subRoomList: any[] }>;
    physicRoomMap?: Record<string, {
      name?: string;
      bedInfo?: { title?: string };
      areaInfo?: { title?: string };
    }>;
    saleRoomMap?: Record<string, {
      physicalRoomId?: string;
      priceInfo?: {
        displayPrice?: string;
        deletePrice?: string;
        currency?: string;
      };
      bookingStatusInfo?: {
        isBooking?: boolean;
        isFullRoom?: boolean;
        remainRoomQuantity?: number;
        isHidePrice?: boolean;
      };
    }>;
  };
}

/**
 * Parse room data from Ctrip API response
 */
function parseRoomData(apiResponse: CtripApiResponse): CtripRoomData[] {
  const data = apiResponse.data;
  if (!data) return [];

  const physicRooms = data.physicRoomMap || {};
  const saleRooms = data.saleRoomMap || {};

  const results: CtripRoomData[] = [];
  const seen = new Set<string>();

  // Iterate over saleRoomMap to get availability and price
  for (const [saleKey, saleRoom] of Object.entries(saleRooms)) {
    const physicalId = saleRoom.physicalRoomId;
    const physicRoom = physicalId ? physicRooms[physicalId] : null;

    const name = physicRoom?.name || saleKey;
    const bedType = physicRoom?.bedInfo?.title || '';
    const area = physicRoom?.areaInfo?.title || '';

    const status = saleRoom.bookingStatusInfo || {};
    const priceInfo = saleRoom.priceInfo || {};

    const isFullRoom = status.isFullRoom === true || status.remainRoomQuantity === 9999;
    const isAvailable = status.isBooking === true && !isFullRoom;
    const remaining = isFullRoom ? 0 : (status.remainRoomQuantity || 0);

    // Price: if hidden, return null
    let price: number | null = null;
    if (!status.isHidePrice) {
      const displayPrice = priceInfo.displayPrice || priceInfo.deletePrice;
      if (displayPrice) {
        const priceMatch = String(displayPrice).match(/(\d+)/);
        if (priceMatch) {
          price = parseInt(priceMatch[1]);
        }
      }
    }

    const key = `${name}-${price}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ name, price, available: isAvailable, remaining, bedType, area });
    }
  }

  return results;
}

/**
 * Crawl Ctrip hotel by intercepting the internal room list API
 */
export async function crawlCtrip(inn: any): Promise<CrawlResult> {
  const result: CrawlResult = {
    platform: 'ctrip',
    innId: inn.id,
    availabilities: [],
    prices: [],
    success: false,
  };

  const hotelId = extractHotelId(inn.url);
  if (!hotelId) {
    result.error = `Cannot extract hotelId from URL: ${inn.url}`;
    return result;
  }

  const page = await createPage();
  const roomDataByDate = new Map<string, CtripRoomData[]>();

  try {
    const today = startOfDay(new Date());
    const totalRooms = inn.totalRooms || 5;

    // Crawl past 3 days + future 7 days to keep historical data
    const PAST_DAYS = 3;
    const REAL_CRAWL_DAYS = 7;

    for (let dayOffset = -PAST_DAYS; dayOffset < REAL_CRAWL_DAYS; dayOffset++) {
      const checkIn = format(addDays(today, dayOffset), 'yyyy-MM-dd');
      const checkOut = format(addDays(today, dayOffset + 1), 'yyyy-MM-dd');
      const url = buildCtripUrl(inn.url, checkIn, checkOut);

      console.log(`[Ctrip] Day ${dayOffset >= 0 ? '+' : ''}${dayOffset}: ${checkIn}`);

      // Set up API interception
      let apiResponse: CtripApiResponse | null = null;
      const apiPromise = new Promise<void>((resolve) => {
        page.on('response', async (response) => {
          if (response.url().includes('getHotelRoomListInland')) {
            try {
              const json = await response.json();
              apiResponse = json as CtripApiResponse;
              resolve();
            } catch (e) {}
          }
        });

        // Timeout fallback
        setTimeout(() => resolve(), 30000);
      });

      // Navigate
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      await randomDelay(5000, 8000);

      // Wait for API response
      await apiPromise;

      if (apiResponse) {
        const rooms = parseRoomData(apiResponse);
        console.log(`  -> Found ${rooms.length} room types`);
        for (const r of rooms.slice(0, 3)) {
          console.log(`     ${r.name}: ${r.available ? '可订' : '满房'} (剩${r.remaining}) ${r.price ? `¥${r.price}` : '价格隐藏'}`);
        }
        roomDataByDate.set(checkIn, rooms);
      } else {
        console.log(`  -> No API response captured`);
      }

      // Random delay between days
      await randomDelay(3000, 5000);
    }

    // Fill remaining days (7-30) with last known data
    const lastDate = format(addDays(today, REAL_CRAWL_DAYS - 1), 'yyyy-MM-dd');
    const lastData = roomDataByDate.get(lastDate) || [];
    for (let dayOffset = REAL_CRAWL_DAYS; dayOffset < 30; dayOffset++) {
      const dateStr = format(addDays(today, dayOffset), 'yyyy-MM-dd');
      roomDataByDate.set(dateStr, lastData);
    }

    // Build result arrays (from past 3 days to future 30 days = 33 days total)
    for (let dayOffset = -PAST_DAYS; dayOffset < 30; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dateStr = format(date, 'yyyy-MM-dd');
      const rooms = roomDataByDate.get(dateStr) || [];

      // Use actual remaining room quantity from API instead of room type count
      const totalRoomCount = totalRooms;
      const remainingRooms = rooms
        .filter(r => r.available)
        .reduce((sum, r) => sum + r.remaining, 0);
      const availableCount = Math.min(remainingRooms, totalRoomCount);
      const bookedRooms = totalRoomCount - availableCount;
      const occupancyRate = totalRoomCount > 0 ? Number(((bookedRooms / totalRoomCount) * 100).toFixed(1)) : 0;

      // Find lowest price among available rooms
      const availablePrices = rooms.filter(r => r.available && r.price).map(r => r.price!);
      const lowestPrice = availablePrices.length > 0 ? Math.min(...availablePrices) : null;

      result.availabilities.push({
        date,
        availableRooms: availableCount,
        totalRooms: totalRoomCount,
        bookedRooms,
        occupancyRate,
        lowestPrice,
      });

      if (lowestPrice !== null) {
        result.prices.push({
          date,
          price: lowestPrice,
          roomType: rooms.length > 0 ? rooms[0].name : null,
        });
      }
    }

    result.success = roomDataByDate.size > 0;
    if (!result.success) {
      result.error = 'No room data captured from API. Page may require login or have anti-bot measures.';
    }
  } catch (err: any) {
    result.error = err.message;
    console.error(`[Ctrip] Error: ${err.message}`);
  } finally {
    await page.close();
  }

  return result;
}

/**
 * Test helper
 */
export async function testCtripCrawler(url?: string) {
  const testInn = {
    id: 999,
    name: '测试民宿',
    platform: 'ctrip',
    url: url || 'https://hotels.ctrip.com/hotels/12345.html',
    totalRooms: 5,
    isActive: true,
  };

  console.log('=== 携程爬虫测试 ===\n');
  const result = await crawlCtrip(testInn);

  console.log('\n--- Result ---');
  console.log(`Success: ${result.success}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log(`Availabilities: ${result.availabilities.length}`);
  console.log(`Prices: ${result.prices.length}`);

  if (result.availabilities.length > 0) {
    console.log('\n--- 未来7天房态 ---');
    for (let i = 0; i < Math.min(7, result.availabilities.length); i++) {
      const av = result.availabilities[i];
      console.log(
        `${format(av.date, 'yyyy-MM-dd')} | ` +
        `可订: ${av.availableRooms}/${av.totalRooms} | ` +
        `入住率: ${av.occupancyRate}% | ` +
        `最低价: ${av.lowestPrice ?? 'N/A'}`
      );
    }
  }

  await closeBrowser();
  return result;
}

// Direct run support
if (require.main === module) {
  const testUrl = process.env.CTRIP_TEST_URL;
  testCtripCrawler(testUrl).catch(console.error);
}
