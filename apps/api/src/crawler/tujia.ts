import { chromium, Browser, BrowserContext } from 'playwright';
import { format, addDays, startOfDay } from 'date-fns';
import type { CrawlResult, AvailabilityData, PriceData } from './index';

const TUJIA_API_URL = 'https://www.tujia.com/bingo/pc/searchUnitDetail';
const TUJIA_MOBILE_API_URL = 'https://m.tujia.com/bingo/pc/searchUnitDetail';

interface TujiaRoom {
  unitId: number;
  roomId: number;
  roomName: string;
  roomTypeName?: string;
  maxGuestNum?: number;
}

interface TujiaSaleRoom {
  unitId: number;
  roomId: number;
  roomName: string;
  saleDate: string;
  price: number;
  promotionPrice?: number;
  status: number; // 0=可订, others=不可订
  stockCount?: number;
}

interface TujiaApiResponse {
  success?: boolean;
  ret?: boolean;
  errorCode?: string;
  errorMessage?: string;
  errmsg?: string;
  errcode?: number;
  data?: {
    unitRoomList?: TujiaRoom[];
    saleRoomList?: TujiaSaleRoom[];
  };
}

/**
 * Extract unitId from Tujia detail URL
 * Supports:
 * - https://www.tujia.com/detail/123456.html
 * - https://m.tujia.com/detail/123456.html
 */
export function extractUnitId(url: string): string | null {
  const match = url.match(/\/detail\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Attempt 1: Direct API call (no browser)
 * This works if the IP is not blocked and cookies are fresh.
 */
async function fetchTujiaDirect(unitId: string, startDate: string, endDate: string): Promise<TujiaApiResponse | null> {
  const body = {
    unitId,
    startDate,
    endDate,
    adultNum: 2,
    childNum: 0,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Referer': `https://www.tujia.com/detail/${unitId}.html`,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Origin': 'https://www.tujia.com',
    'X-Requested-With': 'XMLHttpRequest',
  };

  for (const url of [TUJIA_API_URL, TUJIA_MOBILE_API_URL]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue; // Likely returned HTML login page
      }

      const json = (await res.json()) as TujiaApiResponse;
      if (json.success || json.ret || (json.data?.unitRoomList && json.data.unitRoomList.length > 0)) {
        return json;
      }
    } catch (e) {
      // Try next endpoint
    }
  }

  return null;
}

/**
 * Attempt 2: Browser-based API call via Playwright (mobile H5 context)
 * Tujia PC detail pages redirect to login, but mobile H5 sometimes works.
 * We open the mobile detail page in a browser and call the API from the same origin.
 */
async function fetchTujiaViaBrowser(unitId: string, startDate: string, endDate: string): Promise<TujiaApiResponse | null> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 812 },
      locale: 'zh-CN',
    });

    const page = await context.newPage();

    // Visit mobile homepage first to establish session cookies
    await page.goto('https://m.tujia.com', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Visit detail page (even if it's a redirect/404, we just need the cookies)
    await page.goto(`https://m.tujia.com/detail/${unitId}.html`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Call API from within the browser context (same origin, same cookies)
    const result = await page.evaluate(async ({ apiUrl, reqBody }: { apiUrl: string; reqBody: any }) => {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(reqBody),
        });
        return {
          status: res.status,
          contentType: res.headers.get('content-type') || '',
          text: await res.text(),
        };
      } catch (e: any) {
        return { status: 0, contentType: '', text: e.message };
      }
    }, {
      apiUrl: TUJIA_MOBILE_API_URL,
      reqBody: { unitId, startDate, endDate, adultNum: 2, childNum: 0 },
    });

    if (result.status === 200 && result.contentType.includes('application/json')) {
      try {
        const json = JSON.parse(result.text) as TujiaApiResponse;
        if (json.success || json.ret || (json.data?.unitRoomList && json.data.unitRoomList.length > 0)) {
          return json;
        }
      } catch (e) {
        // Invalid JSON
      }
    }

    // Fallback: try PC API endpoint in browser too
    const result2 = await page.evaluate(async ({ apiUrl, reqBody }: { apiUrl: string; reqBody: any }) => {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(reqBody),
        });
        return {
          status: res.status,
          contentType: res.headers.get('content-type') || '',
          text: await res.text(),
        };
      } catch (e: any) {
        return { status: 0, contentType: '', text: e.message };
      }
    }, {
      apiUrl: TUJIA_API_URL,
      reqBody: { unitId, startDate, endDate, adultNum: 2, childNum: 0 },
    });

    if (result2.status === 200 && result2.contentType.includes('application/json')) {
      try {
        const json = JSON.parse(result2.text) as TujiaApiResponse;
        if (json.success || json.ret || (json.data?.unitRoomList && json.data.unitRoomList.length > 0)) {
          return json;
        }
      } catch (e) {
        // Invalid JSON
      }
    }

    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Main Tujia crawler
 */
export async function crawlTujia(inn: any): Promise<CrawlResult> {
  const result: CrawlResult = {
    platform: 'tujia',
    innId: inn.id,
    availabilities: [],
    prices: [],
    success: false,
  };

  const unitId = extractUnitId(inn.url);
  if (!unitId) {
    result.error = `Cannot extract unitId from URL: ${inn.url}`;
    return result;
  }

  try {
    const today = startOfDay(new Date());
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(addDays(today, 30), 'yyyy-MM-dd');

    console.log(`[Tujia] Fetching unitId=${unitId}, range=${startDate} ~ ${endDate}`);

    // Attempt 1: Direct API
    let apiResult = await fetchTujiaDirect(unitId, startDate, endDate);

    // Attempt 2: Browser-based API
    if (!apiResult) {
      console.log('[Tujia] Direct API failed, trying browser context...');
      apiResult = await fetchTujiaViaBrowser(unitId, startDate, endDate);
    }

    if (!apiResult) {
      result.error = 'Tujia API returned non-JSON response (likely login page or anti-bot). Consider providing login cookies or testing from a different IP.';
      return result;
    }

    const rooms = apiResult.data?.unitRoomList || [];
    const sales = apiResult.data?.saleRoomList || [];

    console.log(`[Tujia] Got ${rooms.length} rooms, ${sales.length} sale records`);

    if (rooms.length === 0) {
      result.error = 'No rooms found from API. The unitId may be invalid or the listing is inactive.';
      return result;
    }

    const totalRooms = inn.totalRooms || rooms.length;

    // Build a map: date -> roomId -> saleRecord
    const saleMap = new Map<string, Map<number, TujiaSaleRoom>>();
    for (const sale of sales) {
      const dateKey = sale.saleDate;
      if (!saleMap.has(dateKey)) {
        saleMap.set(dateKey, new Map());
      }
      saleMap.get(dateKey)!.set(sale.roomId, sale);
    }

    // For each date in the next 30 days, compute availability and lowest price
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      let availableCount = 0;
      let lowestPrice: number | null = null;

      for (const room of rooms) {
        const sale = saleMap.get(dateStr)?.get(room.roomId);
        if (sale) {
          const isAvailable = sale.status === 0;
          if (isAvailable) {
            availableCount++;
            const price = sale.promotionPrice ?? sale.price;
            if (price != null && price > 0) {
              if (lowestPrice === null || price < lowestPrice) {
                lowestPrice = price;
              }
            }
          }
        } else {
          availableCount++;
        }
      }

      const bookedRooms = totalRooms - Math.min(availableCount, totalRooms);
      const occupancyRate = totalRooms > 0 ? Number(((bookedRooms / totalRooms) * 100).toFixed(1)) : 0;

      result.availabilities.push({
        date,
        availableRooms: availableCount,
        totalRooms,
        bookedRooms,
        occupancyRate,
        lowestPrice,
      });

      if (lowestPrice !== null) {
        result.prices.push({
          date,
          price: lowestPrice,
          roomType: rooms.length > 0 ? rooms[0].roomName : null,
        });
      }
    }

    result.success = true;
  } catch (err: any) {
    result.error = err.message;
  }

  return result;
}
