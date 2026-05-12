import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  const url = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

  console.log('[Explore] Navigating to Ctrip page...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('[Explore] Page loaded');

  // Wait for room list to appear
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/ctrip-page.png', fullPage: false });
  console.log('[Explore] Screenshot saved to /tmp/ctrip-page.png');

  // Extract page title and basic info
  const title = await page.title();
  console.log(`[Explore] Page title: ${title}`);

  // Look for price-related elements
  const priceSelectors = [
    '.room_price .price',
    '.roomprice .price',
    '.room-price',
    '.price .num',
    '[class*="price"]',
    '.j-price',
    '.rmb',
    '[data-price]',
    '.room-name + div',
  ];

  console.log('\n--- Price Elements ---');
  for (const sel of priceSelectors) {
    const els = await page.locator(sel).all();
    console.log(`${sel}: ${els.length} elements`);
    for (let i = 0; i < Math.min(els.length, 3); i++) {
      const text = await els[i].textContent().catch(() => '');
      console.log(`  [${i}] ${text.trim().slice(0, 60)}`);
    }
  }

  // Look for room list
  const roomSelectors = [
    '.room-list',
    '.roomlist',
    '[class*="room-list"]',
    '[class*="roomlist"]',
    '.room-item',
    '.roomitem',
    '[class*="room-item"]',
    '[class*="room_name"]',
  ];

  console.log('\n--- Room List Elements ---');
  for (const sel of roomSelectors) {
    const els = await page.locator(sel).all();
    console.log(`${sel}: ${els.length} elements`);
  }

  // Try to find date-related elements
  const dateSelectors = [
    '.date-selector',
    '[class*="date"]',
    '[class*="calendar"]',
    '.checkin',
    '.checkout',
  ];

  console.log('\n--- Date Elements ---');
  for (const sel of dateSelectors) {
    const els = await page.locator(sel).all();
    console.log(`${sel}: ${els.length} elements`);
  }

  // Extract all text containing price patterns (contains "¥" or numbers with ¥)
  console.log('\n--- Price Texts (containing ¥) ---');
  const allElements = await page.locator('body *').all();
  const priceTexts: string[] = [];
  for (const el of allElements) {
    const text = await el.textContent().catch(() => '');
    if (text.includes('¥') && /\d+/.test(text)) {
      priceTexts.push(text.trim().replace(/\s+/g, ' '));
    }
  }
  // Deduplicate and show top 20
  const unique = [...new Set(priceTexts)].filter(t => t.length < 100).slice(0, 20);
  unique.forEach((t, i) => console.log(`  [${i}] ${t}`));

  // Extract room names
  console.log('\n--- Room Names ---');
  const roomNameSelectors = [
    '.room-name',
    '.roomname',
    '[class*="room-name"]',
    '.room_title',
    '.room-info h3',
    '.room-info h4',
  ];
  for (const sel of roomNameSelectors) {
    const els = await page.locator(sel).all();
    console.log(`${sel}: ${els.length}`);
    for (let i = 0; i < Math.min(els.length, 5); i++) {
      const text = await els[i].textContent().catch(() => '');
      console.log(`  [${i}] ${text.trim().slice(0, 80)}`);
    }
  }

  // Save page HTML for analysis
  const html = await page.content();
  await page.evaluate(() => {
    return document.documentElement.outerHTML;
  });
  // Write a snippet of HTML
  console.log('\n--- HTML Snippet (around price area) ---');
  const htmlSnippet = await page.evaluate(() => {
    const body = document.body.innerHTML;
    return body.slice(0, 5000);
  });
  console.log(htmlSnippet);

  await browser.close();
  console.log('\n[Explore] Done');
}

main().catch(console.error);
