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

  console.log('[RoomList] Navigating...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for page to stabilize
  await page.waitForTimeout(8000);

  // Click "选择房间" button (blue button on the right side)
  const chooseRoomBtn = await page.locator('button:has-text("选择房间"), a:has-text("选择房间")').first();
  if (await chooseRoomBtn.count() > 0) {
    console.log('[RoomList] Clicking 选择房间...');
    await chooseRoomBtn.click();
    await page.waitForTimeout(5000);
  }

  // Also try clicking 房间 tab
  const roomTab = await page.locator('[role="tab"]:has-text("房间"), text=房间').first();
  if (await roomTab.count() > 0) {
    console.log('[RoomList] Clicking 房间 tab...');
    await roomTab.click();
    await page.waitForTimeout(5000);
  }

  // Scroll down multiple times
  for (let i = 0; i < 5; i++) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), i * 800);
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: '/tmp/ctrip-roomlist.png', fullPage: true });
  console.log('[RoomList] Screenshot saved');

  // Extract all visible text and look for price patterns
  const pageText = await page.evaluate(() => document.body.innerText);

  // Find lines with prices
  const lines = pageText.split('\n').filter(l => l.trim());
  const priceLines = lines.filter(l => /[¥￥]\s*\d{2,5}/.test(l) || /\d{2,5}\s*元/.test(l));
  console.log('\n--- Price Lines ---');
  priceLines.slice(0, 30).forEach((l, i) => console.log(`  [${i}] ${l.trim().slice(0, 100)}`));

  // Look for "满房" or sold out indicators
  const soldOutLines = lines.filter(l => /满房|售完|不可订|已订完|Sold Out|无房/.test(l));
  console.log('\n--- Sold Out Lines ---');
  soldOutLines.slice(0, 20).forEach((l, i) => console.log(`  [${i}] ${l.trim().slice(0, 100)}`));

  // Try to find structured room data via class names
  const roomData = await page.evaluate(() => {
    const results: any[] = [];
    // Get all elements and their computed styles
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.textContent?.trim() || '';
      const styles = window.getComputedStyle(el);
      // Look for elements that might be room cards (has price and is reasonably sized)
      if (text.includes('¥') && text.length < 500 && text.length > 20) {
        results.push({
          tag: el.tagName,
          className: el.className?.slice(0, 60),
          text: text.slice(0, 200),
          rect: el.getBoundingClientRect(),
        });
      }
    }
    return results.slice(0, 20);
  });
  console.log('\n--- Room Card Candidates ---');
  roomData.forEach((r, i) => console.log(`  [${i}] ${r.tag}.${r.className} | y:${r.rect.y.toFixed(0)} | ${r.text.slice(0, 80)}`));

  await browser.close();
}

main().catch(console.error);
