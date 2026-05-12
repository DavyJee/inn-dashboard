import { chromium } from 'playwright';

const REAL_URL = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

async function main() {
  console.log('=== 携程页面调试 ===\n');

  const browser = await chromium.launch({
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
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });

  const page = await context.newPage();

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: {} };
    // @ts-ignore
    const originalQuery = window.navigator.permissions.query;
    // @ts-ignore
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  });

  console.log('Loading page...');
  await page.goto(REAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('\n--- Page Info ---');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Check if redirected
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('passport') || currentUrl.includes('verify')) {
    console.log('\n⚠️ REDIRECTED to login/passport!');
    await browser.close();
    return;
  }

  // Take screenshot
  await page.screenshot({ path: '/tmp/ctrip-debug.png', fullPage: false });
  console.log('\nScreenshot saved: /tmp/ctrip-debug.png');

  // Get page text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n--- Page text (first 500 chars) ---');
  console.log(bodyText.slice(0, 500));

  // Check for price symbols
  const hasPrice = /[¥￥]\s*\d/.test(bodyText);
  console.log('\nHas price data:', hasPrice);

  // Check for room-related keywords
  const keywords = ['房', '价格', '预订', '房型', '满房', '可订', '日历', '入住', '离店'];
  console.log('\n--- Keyword search ---');
  for (const kw of keywords) {
    const idx = bodyText.indexOf(kw);
    if (idx !== -1) {
      console.log(`  "${kw}" found at position ${idx}`);
    }
  }

  // Find all clickable elements with text containing price or room
  console.log('\n--- Interactive elements with 房/价格/预订 ---');
  const buttons = await page.locator('button, a, div[role="button"], [class*="btn"]').all();
  let found = 0;
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    if (text && (/房|价格|预订|日历|入住/.test(text))) {
      const tagName = await btn.evaluate(el => el.tagName);
      console.log(`  ${tagName}: ${text.trim().slice(0, 60)}`);
      found++;
      if (found > 20) break;
    }
  }

  // Scroll down
  console.log('\nScrolling down...');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/ctrip-debug-scroll.png', fullPage: false });
  console.log('Screenshot scrolled: /tmp/ctrip-debug-scroll.png');

  // Check for any elements containing price after scroll
  const priceElements = await page.locator('text=/[¥￥]\\s*\\d/').all();
  console.log(`\nElements containing price (after scroll): ${priceElements.length}`);
  for (const el of priceElements.slice(0, 10)) {
    const text = await el.textContent();
    console.log(`  ${text?.trim().slice(0, 80)}`);
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
