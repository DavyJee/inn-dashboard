import { chromium } from 'playwright';

const REAL_URL = 'https://hotels.ctrip.com/hotels/detail/?cityEnName=Hangzhou&cityId=17&hotelId=35936850&checkIn=2026-05-08&checkOut=2026-05-09&adult=1&children=0&crn=1&ages=&curr=CNY&barcurr=CNY&masterhotelid_tracelogid=100053755-0a143143-493958-57128&detailFilters=17%7C1~17~1*31%7C35936850~31~35936850*80%7C2~80~2*29%7C1~29~1%7C1&display=incavg&subStamp=806&isCT=true&isFlexible=F&isFirstEnterDetail=T';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Intercept the specific room list API
  let roomApiRequest: any = null;
  let roomApiResponse: any = null;

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('getHotelRoomListInland')) {
      roomApiRequest = {
        url: url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
      };
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('getHotelRoomListInland')) {
      try {
        const json = await response.json();
        roomApiResponse = json;
      } catch (e) {}
    }
  });

  console.log('Loading page...');
  await page.goto(REAL_URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(10000);

  console.log('\n--- Room API Request ---');
  if (roomApiRequest) {
    console.log('URL:', roomApiRequest.url);
    console.log('Method:', roomApiRequest.method);
    console.log('PostData:', roomApiRequest.postData?.slice(0, 500));
  } else {
    console.log('Room API request not captured');
  }

  console.log('\n--- Room API Response ---');
  if (roomApiResponse) {
    const data = roomApiResponse.data;
    console.log('Data keys:', Object.keys(data));

    // Extract room list
    if (data.roomList) {
      console.log(`\nRoom List (${data.roomList.length} items):`);
      for (const room of data.roomList) {
        console.log(`  - ${room.roomName || room.name || 'Unnamed'} (ID: ${room.roomId})`);
        if (room.priceInfo) {
          console.log(`    Price: ${JSON.stringify(room.priceInfo).slice(0, 200)}`);
        }
      }
    }

    // Extract physic rooms
    if (data.physicRoomMap) {
      console.log(`\nPhysic Room Map (${Object.keys(data.physicRoomMap).length} keys):`);
      for (const [key, room] of Object.entries(data.physicRoomMap)) {
        const r = room as any;
        console.log(`  [${key}] ${r.roomName || r.name || 'Unnamed'}`);
      }
    }

    // Extract sale rooms
    if (data.saleRoomMap) {
      console.log(`\nSale Room Map (${Object.keys(data.saleRoomMap).length} keys):`);
      for (const [key, room] of Object.entries(data.saleRoomMap)) {
        const r = room as any;
        console.log(`  [${key}] ${r.roomName || r.name || 'Unnamed'}`);
        if (r.priceInfo) {
          console.log(`    Price: ${JSON.stringify(r.priceInfo).slice(0, 200)}`);
        }
        if (r.bookingStatusInfo) {
          console.log(`    Status: ${JSON.stringify(r.bookingStatusInfo)}`);
        }
      }
    }

    // Save full response for inspection
    const fs = require('fs');
    fs.writeFileSync('/tmp/ctrip-room-api.json', JSON.stringify(roomApiResponse, null, 2));
    console.log('\nFull response saved to /tmp/ctrip-room-api.json');
  } else {
    console.log('Room API response not captured');
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(console.error);
