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

  console.log('[Explore Rooms] Navigating...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('[Explore Rooms] URL:', page.url());
  console.log('[Explore Rooms] Title:', await page.title());

  // Scroll down to load room list
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(3000);

  // Try clicking "选择房间" (Choose Room) button
  const chooseBtn = await page.locator('text=选择房间').first();
  if (await chooseBtn.count() > 0) {
    console.log('[Explore Rooms] Clicking 选择房间...');
    await chooseBtn.click();
    await page.waitForTimeout(3000);
  }

  // Scroll down more
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/tmp/ctrip-rooms.png', fullPage: false });
  console.log('[Explore Rooms] Screenshot saved');

  // Extract room info via page.evaluate
  const roomInfo = await page.evaluate(() => {
    const results: any[] = [];
    const allElements = document.querySelectorAll('*');

    for (const el of allElements) {
      const text = el.textContent?.trim() || '';
      // Look for price patterns like ¥XXX or ￥XXX
      const priceMatch = text.match(/[¥￥]\s*(\d{2,5})/);
      if (priceMatch) {
        // Find nearby room name
        let roomName = '';
        let parent = el.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const siblingText = parent.textContent || '';
          const roomMatch = siblingText.match(/(.{2,30}?房[^\d]{0,10})/);
          if (roomMatch && roomMatch[1].length > roomName.length) {
            roomName = roomMatch[1].trim();
          }
          parent = parent.parentElement;
        }
        results.push({
          price: parseInt(priceMatch[1]),
          priceText: text.slice(0, 100),
          roomName,
          tagName: el.tagName,
          className: el.className?.slice(0, 50) || '',
        });
      }
    }
    return results.slice(0, 20);
  });
  console.log('\n--- Room Prices ---');
  roomInfo.forEach((r, i) => console.log(`  [${i}] ${r.roomName || 'N/A'} | ¥${r.price} | ${r.priceText.slice(0, 60)}`));

  // Try to find "sold out" or "no availability" indicators
  const soldOutInfo = await page.evaluate(() => {
    const results: any[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while (node = walker.nextNode() as Text | null) {
      const text = node.textContent?.trim() || '';
      if (text.includes('满房') || text.includes('售完') || text.includes('不可订') || text.includes('已订完') || text.includes(' Sold Out') || text.includes('无房')) {
        const parentEl = node.parentElement;
        results.push({
          text: text.slice(0, 80),
          parentTag: parentEl?.tagName,
          parentClass: parentEl?.className?.slice(0, 50),
        });
      }
    }
    return results.slice(0, 20);
  });
  console.log('\n--- Sold Out Indicators ---');
  soldOutInfo.forEach((s, i) => console.log(`  [${i}] ${s.text} | ${s.parentTag}.${s.parentClass}`));

  // Extract all room-related text blocks
  const roomTexts = await page.evaluate(() => {
    const results: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while (node = walker.nextNode() as Text | null) {
      const text = node.textContent?.trim() || '';
      if ((text.includes('房') || text.includes('Room') || text.includes('room')) && text.length < 60 && text.length > 2) {
        results.push(text);
      }
    }
    return [...new Set(results)].slice(0, 30);
  });
  console.log('\n--- Room-related Texts ---');
  roomTexts.forEach((t, i) => console.log(`  [${i}] ${t}`));

  await browser.close();
}

main().catch(console.error);
