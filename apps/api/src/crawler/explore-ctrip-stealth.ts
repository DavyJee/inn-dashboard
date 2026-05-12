import { chromium } from 'playwright';

async function main() {
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
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    permissions: [],
    colorScheme: 'light',
  });

  const page = await context.newPage();

  // Hide webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: {} };
    // @ts-ignore
    delete window.__proto__.cdc_;
  });

  const url = 'https://hotels.ctrip.com/hotels/detail/?hotelId=35936850';

  console.log('[Explore Stealth] Navigating...');
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
  } catch (e: any) {
    console.log('[Explore Stealth] Navigation error:', e.message);
  }

  console.log('[Explore Stealth] URL:', page.url());
  console.log('[Explore Stealth] Title:', await page.title());

  // Check if redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('passport')) {
    console.log('[Explore Stealth] ❌ Redirected to login page');
  } else {
    console.log('[Explore Stealth] ✅ Not redirected to login');
  }

  // Screenshot
  await page.screenshot({ path: '/tmp/ctrip-stealth.png', fullPage: false });

  // Check for price elements via page.evaluate (no CSS selector dependency)
  const pageInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasPrice = bodyText.includes('¥') || bodyText.includes('元');
    const hasRoom = bodyText.includes('房') || bodyText.includes('room') || bodyText.includes('Room');
    const hasLogin = bodyText.includes('登录') || bodyText.includes('手机号');
    return { hasPrice, hasRoom, hasLogin, textLength: bodyText.length };
  });
  console.log('[Explore Stealth] Page info:', pageInfo);

  // Try to find all text containing numbers that look like prices
  const prices = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const results: string[] = [];
    let node: Text | null;
    while (node = walker.nextNode() as Text | null) {
      const text = node.textContent?.trim() || '';
      if (/[¥￥]\s*\d{2,5}/.test(text) || /\d{2,5}\s*元/.test(text)) {
        results.push(text);
      }
    }
    return [...new Set(results)].slice(0, 30);
  });
  console.log('\n--- Prices found ---');
  prices.forEach((p, i) => console.log(`  [${i}] ${p}`));

  await browser.close();
}

main().catch(console.error);
