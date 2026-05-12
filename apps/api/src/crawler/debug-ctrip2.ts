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
  await page.goto(REAL_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('\nURL:', page.url());
  console.log('Title:', await page.title());

  // Strategy: Find all "预订" buttons, then traverse up to find room card
  const bookBtns = await page.locator('button, a, div[role="button"]').filter({ hasText: /预订|立即预订/ }).all();
  console.log(`\nFound ${bookBtns.length} book buttons`);

  for (let i = 0; i < Math.min(10, bookBtns.length); i++) {
    const btn = bookBtns[i];
    const btnText = await btn.textContent();
    console.log(`\n[${i}] Button: "${btnText?.trim()}"`);

    // Traverse up to find room card (max 10 levels)
    let parent = btn;
    let foundCard = false;
    for (let level = 0; level < 10; level++) {
      try {
        parent = parent.locator('xpath=..');
        const tagName = await parent.evaluate(el => el.tagName).catch(() => 'DIV');
        const pText = await parent.textContent().catch(() => '');
        const pHtml = await parent.evaluate(el => el.outerHTML.slice(0, 300)).catch(() => '');

        // Look for price in this container
        const priceMatch = pText?.match(/[¥￥]\s*(\d+)/);

        if (priceMatch && pText && pText.length > 30 && pText.length < 800) {
          console.log(`  Level ${level} (${tagName}) - PRICE: ¥${priceMatch[1]}`);
          console.log(`  Text: ${pText.trim().slice(0, 200)}`);
          foundCard = true;
          break;
        }
      } catch (e) {
        break;
      }
    }
    if (!foundCard) {
      console.log('  No room card found');
    }
  }

  // Also try finding elements with both price and room name patterns
  console.log('\n--- Alternative: Search by text pattern ---');
  const allText = await page.evaluate(() => {
    const results: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent?.trim() || '';
      if (text.length > 2 && text.length < 100) {
        results.push(text);
      }
    }
    return results;
  });

  // Find text that might be room names
  const roomNameTexts = allText.filter(t => /房/.test(t) && t.length < 20 && t.length > 2);
  console.log(`Found ${roomNameTexts.length} potential room names`);
  for (const t of roomNameTexts.slice(0, 15)) {
    console.log(`  "${t}"`);
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
