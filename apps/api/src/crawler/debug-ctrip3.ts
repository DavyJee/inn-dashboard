import { chromium } from 'playwright';

const REAL_URL = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('Loading...');
  await page.goto(REAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('\nURL:', page.url());
  console.log('Title:', await page.title());

  if (page.url().includes('login') || page.url().includes('passport')) {
    console.log('REDIRECTED to login!');
    await browser.close();
    return;
  }

  // Try to find window.__INITIAL_STATE__ or similar data stores
  const windowData = await page.evaluate(() => {
    const keys = Object.keys(window).filter(k =>
      k.toLowerCase().includes('data') ||
      k.toLowerCase().includes('state') ||
      k.toLowerCase().includes('initial') ||
      k.toLowerCase().includes('room') ||
      k.toLowerCase().includes('hotel')
    );
    const data: Record<string, any> = {};
    for (const k of keys.slice(0, 10)) {
      try {
        const v = (window as any)[k];
        if (v && typeof v === 'object') {
          data[k] = JSON.stringify(v).slice(0, 500);
        } else {
          data[k] = String(v).slice(0, 100);
        }
      } catch (e) {}
    }
    return data;
  });

  console.log('\n--- Window data keys ---');
  for (const [k, v] of Object.entries(windowData)) {
    console.log(`  ${k}: ${v}`);
  }

  // Try to extract from script tags
  const scripts = await page.evaluate(() => {
    const results: Array<{ id: string; src: string; len: number; preview: string }> = [];
    document.querySelectorAll('script').forEach((s, i) => {
      const text = s.textContent || '';
      if (text.includes('hotel') || text.includes('room') || text.includes('price') || text.includes('data')) {
        results.push({
          id: s.id || `script-${i}`,
          src: s.src || 'inline',
          len: text.length,
          preview: text.slice(0, 300),
        });
      }
    });
    return results;
  });

  console.log(`\n--- Scripts with hotel/room/price/data (${scripts.length}) ---`);
  for (const s of scripts.slice(0, 5)) {
    console.log(`\n  Script ${s.id} (src=${s.src}, len=${s.len}):`);
    console.log(`    ${s.preview}`);
  }

  // Find elements containing "房型" text
  const roomTypeElements = await page.locator('text=房型').all();
  console.log(`\n--- Elements containing "房型": ${roomTypeElements.length} ---`);
  for (let i = 0; i < Math.min(10, roomTypeElements.length); i++) {
    const el = roomTypeElements[i];
    try {
      const text = await el.textContent();
      const tag = await el.evaluate(e => e.tagName);
      console.log(`  [${i}] ${tag}: "${text?.trim().slice(0, 80)}"`);
    } catch (e) {}
  }

  // Find elements near prices that might be room names
  const priceEls = await page.locator('text=/[¥￥]\\s*\\d/').all();
  console.log(`\n--- Price elements: ${priceEls.length} ---`);
  for (let i = 0; i < Math.min(10, priceEls.length); i++) {
    const el = priceEls[i];
    try {
      const text = await el.textContent();
      const parent = el.locator('xpath=..').locator('xpath=..').locator('xpath=..');
      const parentText = await parent.textContent().catch(() => '');
      console.log(`\n  [${i}] Price: "${text?.trim()}"`);
      console.log(`      Parent: "${parentText?.trim().slice(0, 200)}"`);
    } catch (e) {}
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
