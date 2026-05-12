import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Try mobile H5 hotel detail page
  const url = 'https://m.ctrip.com/webapp/hotel/hoteldetail/35936850.html?checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0';

  console.log('[Explore] Navigating to Ctrip Mobile H5...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('[Explore] Page loaded');

  await page.waitForTimeout(5000);

  await page.screenshot({ path: '/tmp/ctrip-mobile.png', fullPage: false });
  console.log('[Explore] Screenshot saved');

  const title = await page.title();
  console.log(`[Explore] Title: ${title}`);

  // Check if we have room prices using text content search
  const priceTexts = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const results: { text: string; tag: string; className: string }[] = [];
    for (const el of all) {
      const text = el.textContent?.trim() || '';
      if ((text.includes('¥') || text.includes('起')) && /\d/.test(text)) {
        results.push({ text: text.slice(0, 100), tag: el.tagName, className: el.className.slice(0, 60) });
      }
    }
    return results.slice(0, 30);
  });
  console.log('\n--- Price texts ---');
  priceTexts.forEach((p, i) => console.log(`  [${i}] ${p.tag} | ${p.className} | ${p.text}`));

  // Look for room names
  const roomTexts = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const results: { text: string; tag: string }[] = [];
    for (const el of all) {
      const text = el.textContent?.trim() || '';
      if ((text.includes('房') || text.includes('Room') || text.includes('Suite') || text.includes('room')) && text.length < 50) {
        results.push({ text: text.slice(0, 80), tag: el.tagName });
      }
    }
    return results.slice(0, 20);
  });
  console.log('\n--- Room name texts ---');
  roomTexts.forEach((r, i) => console.log(`  [${i}] ${r.tag} | ${r.text}`));

  // Check if page requires login
  const hasLogin = await page.locator('text=登录').count() > 0 || await page.locator('text=手机号').count() > 0;
  console.log(`\n--- Has login page: ${hasLogin}`);

  // Get HTML structure around prices
  const html = await page.content();
  const lines = html.split('\n').filter(l => l.includes('¥') || l.includes('price') || l.includes('calendar')).slice(0, 20);
  console.log('\n--- HTML lines with price keywords ---');
  lines.forEach((l, i) => console.log(`  [${i}] ${l.trim().slice(0, 200)}`));

  await browser.close();
}

main().catch(console.error);
