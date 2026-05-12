import { chromium } from 'playwright';

const REAL_URL = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
    ],
  });

  // More realistic context
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    // Simulate coming from search page
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  const page = await context.newPage();

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [{ name: 'Chrome PDF Plugin' }, { name: 'Native Client' }] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] });
    // @ts-ignore
    window.chrome = { runtime: {} };
    // @ts-ignore
    window.navigator.hardwareConcurrency = 8;
  });

  console.log('Step 1: Visiting search page first...');
  await page.goto('https://hotels.ctrip.com/hotels/listPage?city=17&checkin=2026-05-08&checkout=2026-05-09', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  console.log('Step 2: Clicking on hotel from search results...');
  // Simulate clicking on the hotel link
  const hotelLink = await page.locator(`a[href*="hotelId=35936850"], [data-hotelid="35936850"]`).first();
  if (await hotelLink.count() > 0) {
    await hotelLink.click();
    await page.waitForTimeout(5000);
  } else {
    console.log('Hotel not found in search results, navigating directly...');
    await page.goto(REAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
  }

  console.log('\nURL:', page.url());
  console.log('Title:', await page.title());

  if (page.url().includes('login') || page.url().includes('passport')) {
    console.log('REDIRECTED to login!');
    await browser.close();
    return;
  }

  // Get all text content
  const bodyText = await page.evaluate(() => document.body.innerText);

  // Count prices
  const priceMatches = bodyText.match(/[¥￥]\s*\d+/g);
  console.log(`\nFound ${priceMatches?.length || 0} price mentions`);
  if (priceMatches) {
    for (const p of priceMatches.slice(0, 10)) {
      console.log(`  ${p}`);
    }
  }

  // Find all divs containing both a price and some room-like text
  const roomCards = await page.evaluate(() => {
    const cards: Array<{ text: string; hasPrice: boolean; hasRoomName: boolean }> = [];
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const text = div.textContent || '';
      if (text.length > 30 && text.length < 600) {
        const hasPrice = /[¥￥]\s*\d{2,5}/.test(text);
        const hasRoomName = /房/.test(text) || /Room/.test(text);
        if (hasPrice && hasRoomName) {
          cards.push({ text: text.slice(0, 300), hasPrice, hasRoomName });
        }
      }
    }
    return cards;
  });

  console.log(`\n--- Room card candidates: ${roomCards.length} ---`);
  for (let i = 0; i < Math.min(5, roomCards.length); i++) {
    console.log(`\n[${i}] ${roomCards[i].text}`);
  }

  // Save HTML for inspection
  const html = await page.content();
  require('fs').writeFileSync('/tmp/ctrip-hotel.html', html);
  console.log('\nHTML saved to /tmp/ctrip-hotel.html');

  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
