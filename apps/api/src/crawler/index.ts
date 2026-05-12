import { chromium, Browser, Page } from 'playwright';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns/startOfDay';
import { addDays } from 'date-fns/addDays';
import { format } from 'date-fns/format';

export interface AvailabilityData {
  date: Date;
  availableRooms: number;
  totalRooms: number;
  bookedRooms: number;
  occupancyRate: number;
  lowestPrice: number | null;
}

export interface PriceData {
  date: Date;
  price: number;
  roomType: string | null;
}

export interface CrawlResult {
  platform: string;
  innId: number;
  availabilities: AvailabilityData[];
  prices: PriceData[];
  success: boolean;
  error?: string;
}

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

const userAgents = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

function randomDelay(min = 2000, max = 5000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

async function createPage(): Promise<Page> {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
  });
  return context.newPage();
}

// Booking.com crawler
async function crawlBooking(inn: any): Promise<CrawlResult> {
  const page = await createPage();
  const result: CrawlResult = { platform: 'booking', innId: inn.id, availabilities: [], prices: [], success: false };

  try {
    await page.goto(inn.url, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay(2000, 4000);

    // Try to find calendar or availability info
    // Booking.com typically shows availability in a calendar widget
    const calendarVisible = await page.$('[data-testid="availability-calendar"]') !== null
      || await page.$('.bui-calendar') !== null
      || await page.$('[data-testid="date-display-field-start"]') !== null;

    if (!calendarVisible) {
      // Try clicking on date selector
      const dateField = await page.$('[data-testid="date-display-field-start"]');
      if (dateField) await dateField.click();
      await randomDelay(1000, 2000);
    }

    const today = startOfDay(new Date());
    const totalRooms = inn.totalRooms;

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // This is a simplified approach - actual implementation depends on page structure
      // We try to find price and availability indicators
      const priceEl = await page.$(`[data-date="${dateStr}"] .bui-calendar__price, [data-date="${dateStr}"] .bui-price-display__value`);
      const priceText = priceEl ? await priceEl.textContent() : null;
      const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;

      // Check for "no availability" indicators
      const unavailable = await page.$(`[data-date="${dateStr}"].bui-calendar__date--unavailable, [data-date="${dateStr}"].sold-out`) !== null;

      const availableRooms = unavailable ? 0 : totalRooms;
      const bookedRooms = unavailable ? totalRooms : 0;
      const occupancyRate = totalRooms > 0 ? (bookedRooms / totalRooms) * 100 : 0;

      result.availabilities.push({
        date,
        availableRooms,
        totalRooms,
        bookedRooms,
        occupancyRate: Number(occupancyRate.toFixed(1)),
        lowestPrice: price,
      });

      if (price) {
        result.prices.push({ date, price, roomType: null });
      }
    }

    result.success = true;
  } catch (err: any) {
    result.error = err.message;
  } finally {
    await page.close();
  }

  return result;
}

import { crawlCtrip } from './ctrip';
import { crawlTujia } from './tujia';

// Re-export for convenience
export { crawlCtrip, crawlTujia };

export async function crawlInn(inn: any, retryCount = 0): Promise<CrawlResult> {
  let result: CrawlResult;

  switch (inn.platform) {
    case 'booking':
      result = await crawlBooking(inn);
      break;
    case 'ctrip':
      result = await crawlCtrip(inn);
      break;
    case 'tujia':
      result = await crawlTujia(inn);
      break;
    default:
      result = { platform: inn.platform, innId: inn.id, availabilities: [], prices: [], success: false, error: 'Unknown platform' };
  }

  if (!result.success && retryCount < 3) {
    console.log(`[Crawler] Retrying ${inn.name} (${inn.platform}), attempt ${retryCount + 1}`);
    await new Promise(r => setTimeout(r, 5000 * (retryCount + 1)));
    return crawlInn(inn, retryCount + 1);
  }

  return result;
}

export async function saveCrawlResult(result: CrawlResult) {
  if (!result.success || result.availabilities.length === 0) return;

  const capturedAt = new Date();

  await prisma.$transaction(async (tx) => {
    for (const av of result.availabilities) {
      await tx.roomAvailability.create({
        data: {
          innId: result.innId,
          date: av.date,
          availableRooms: av.availableRooms,
          totalRooms: av.totalRooms,
          bookedRooms: av.bookedRooms,
          occupancyRate: av.occupancyRate,
          lowestPrice: av.lowestPrice,
          capturedAt,
        },
      });
    }

    for (const pr of result.prices) {
      await tx.priceHistory.create({
        data: {
          innId: result.innId,
          date: pr.date,
          price: pr.price,
          roomType: pr.roomType,
          capturedAt,
        },
      });
    }
  });
}

export async function runCrawl(innId?: number): Promise<{ results: CrawlResult[]; logs: any[] }> {
  const inns = innId
    ? await prisma.inn.findMany({ where: { id: innId, isActive: true } })
    : await prisma.inn.findMany({ where: { isActive: true } });

  const results: CrawlResult[] = [];
  const logs: any[] = [];

  for (const inn of inns) {
    const startedAt = new Date();
    const result = await crawlInn(inn);
    const completedAt = new Date();

    const log = await prisma.captureLog.create({
      data: {
        platform: inn.platform,
        status: result.success ? 'success' : 'failed',
        recordCount: result.availabilities.length,
        errorMessage: result.error || null,
        startedAt,
        completedAt,
      },
    });
    logs.push(log);

    if (result.success) {
      await saveCrawlResult(result);
    }

    results.push(result);
    await randomDelay(3000, 6000);
  }

  await closeBrowser();
  return { results, logs };
}
