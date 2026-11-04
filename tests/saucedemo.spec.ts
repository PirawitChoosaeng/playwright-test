/**
 * ============================================================================
 *  SauceDemo E2E Test ด้วย Playwright (ไฟล์สอนแบบละเอียด)
 * ============================================================================
 *
 *  แนวคิดหลัก (เชื่อมกับบทที่ 3-4 วิชา Software Testing)
 *  ----------------------------------------------------------
 *  Test Case = Tested Condition + Expected Output + Test Data
 *    - Tested Condition -> "การกระทำ" ที่สั่งเบราว์เซอร์ทำ (click, fill, select)
 *    - Expected Output  -> "expect(...)" คือการ Assert ผลลัพธ์
 *    - Test Data        -> ค่าที่ใส่ เช่น username, ชื่อผู้ซื้อ, postal code
 *
 *  ไฟล์นี้คือ "Test Scenario" = Test Case1 + Test Case2 + ... ต่อกันเป็น flow เดียว
 *  (Login -> Sort -> Add to cart -> Cart -> Checkout -> Finish)
 *
 *  คำศัพท์ Playwright ที่ต้องรู้
 *  ----------------------------------------------------------
 *  | คำ          | ความหมาย                                                     |
 *  |-------------|--------------------------------------------------------------|
 *  | page        | แท็บเบราว์เซอร์ 1 แท็บ ที่ Playwright สร้างให้ทุก test          |
 *  | locator     | "ตัวชี้" ไปที่ element บนหน้าเว็บ (ยังไม่ได้ไปหาจริงจนกว่าจะใช้)  |
 *  | action      | คำสั่งกระทำ เช่น click(), fill(), selectOption()               |
 *  | expect      | การตรวจผล ถ้าไม่ตรง test จะ FAIL ทันที                          |
 *  | await       | รอให้คำสั่งนั้นทำเสร็จก่อน (ทุกอย่างที่คุยกับเบราว์เซอร์ต้อง await) |
 *
 *  ทำไมต้อง await?
 *    เบราว์เซอร์ทำงานแยกจากโค้ดเรา (asynchronous) ถ้าไม่ await โค้ดจะวิ่งไปบรรทัดถัดไป
 *    ทั้งที่หน้าเว็บยังโหลดไม่เสร็จ -> test พังแบบสุ่ม (flaky)
 *
 *  Selector ที่ใช้ในไฟล์นี้มี 2 แบบ
 *    1) [data-test="..."]  -> attribute ที่นักพัฒนาใส่ไว้ "เพื่อการทดสอบโดยเฉพาะ"
 *                             เสถียรที่สุด เพราะไม่เปลี่ยนตามการแก้ดีไซน์ (แนะนำ)
 *    2) .class-name        -> CSS class ใช้เมื่อไม่มี data-test ให้
 *
 *  วิธีหา selector เอง: เปิดเว็บ -> คลิกขวา -> Inspect -> ดู attribute ของ element
 *  หรือใช้คำสั่ง  npx playwright codegen https://www.saucedemo.com
 *  (Playwright จะอัดสิ่งที่เราคลิกแล้วเขียนโค้ดให้อัตโนมัติ)
 * ============================================================================
 */

// test   = ฟังก์ชันสร้าง test case
// expect = ฟังก์ชัน Assert
// Page   = type ของ page (ใช้ตอนส่ง page เข้าฟังก์ชันช่วย)
import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// ค่าคงที่ (Test Data) - แยกไว้ด้านบน เวลาจะแก้จะได้แก้จุดเดียว
// ---------------------------------------------------------------------------
const BASE_URL = 'https://www.saucedemo.com';
const TAX_RATE = 0.08; // ภาษี 8% ตามโจทย์

// ---------------------------------------------------------------------------
// ฟังก์ชันช่วย (Helper)
// ---------------------------------------------------------------------------

/**
 * แปลงข้อความราคาบนหน้าเว็บให้เป็นตัวเลข
 *   "$49.99"             -> 49.99
 *   "Item total: $57.98" -> 57.98
 *
 * ทำไมต้องแปลง?
 *   ถ้าเทียบเป็น string จะเทียบทีละตัวอักษร (lexicographic)
 *   เช่น "$9.99" > "$49.99" เป็น true เพราะ "9" > "4" -> ผิดความจริง!
 *   จึงต้องเปลี่ยนเป็น number ก่อนเปรียบเทียบเสมอ
 *
 * Regex /[^0-9.]/g แปลว่า "ทุกตัวที่ไม่ใช่ตัวเลขหรือจุด" -> ลบทิ้งให้หมด
 */
const toNumber = (text: string): number =>
  parseFloat(text.replace(/[^0-9.]/g, ''));

/**
 * ปัดทศนิยม 2 ตำแหน่ง (แบบเงิน)
 *
 * ทำไมต้องมี?
 *   คอมพิวเตอร์เก็บทศนิยมแบบ floating point ซึ่งไม่แม่นยำ 100%
 *   ลองใน console: 0.1 + 0.2  ได้ 0.30000000000000004 ไม่ใช่ 0.3
 *   ถ้าไม่ปัด การเทียบเงินจะ FAIL ทั้งที่ค่าจริงถูกต้อง
 */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Login ด้วย standard_user
 * แยกเป็นฟังก์ชันเพราะถ้ามีหลาย test ทุกตัวต้อง login เหมือนกัน -> ไม่ต้องเขียนซ้ำ
 */
async function login(page: Page) {
  // goto = เปิด URL (เหมือนพิมพ์ในแถบที่อยู่แล้วกด Enter)
  await page.goto(BASE_URL);

  // fill = เคลียร์ช่องแล้วพิมพ์ข้อความลงไป
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');

  // click = คลิกปุ่ม (Playwright จะรอให้ปุ่มพร้อมกดเองอัตโนมัติ = auto-waiting)
  await page.locator('[data-test="login-button"]').click();

  // Assert ว่า login สำเร็จจริงโดยดูจาก URL
  // toHaveURL จะ "รอและลองใหม่" จนกว่าจะตรงหรือหมดเวลา (auto-retry) ไม่ต้องใส่ sleep เอง
  await expect(page).toHaveURL(`${BASE_URL}/inventory.html`);
}

// ===========================================================================
//  TEST หลัก
//  test('ชื่อ test', async ({ page }) => { ... })
//    - ชื่อ test จะโชว์ในรายงาน ควรอ่านแล้วรู้ว่าทดสอบอะไร
//    - { page } = Playwright เตรียมแท็บเบราว์เซอร์ใหม่สะอาด ๆ ให้ (เรียกว่า fixture)
// ===========================================================================
test('SauceDemo E2E: sort, cart, checkout calculation, complete', async ({ page }) => {
  await login(page);

  // -------------------------------------------------------------------------
  // ส่วนที่ 1: Sorting Test
  //   Tested Condition : เลือกการเรียง "Price (high to low)"
  //   Expected Output  : ราคาชิ้นแรก >= ราคาชิ้นถัดมา
  //
  // test.step = แบ่ง test ยาว ๆ เป็นช่วง ๆ ในรายงานจะเห็นว่าพังที่ step ไหน
  // -------------------------------------------------------------------------
  await test.step('1. Sort by Price (high to low)', async () => {
    // selectOption ใช้กับ <select> (dropdown)
    // ค่า 'hilo' คือ value ของ <option> "Price (high to low)" (ดูได้จาก Inspect)
    //   az = Name A-Z, za = Name Z-A, lohi = Price low-high, hilo = Price high-low
    await page.locator('[data-test="product-sort-container"]').selectOption('hilo');

    // --- Dynamic Inspection ---
    // คือ "อ่านค่าจริงจากหน้าจอตอนรัน" แทนการ hard-code ว่าชิ้นแรกต้องเป็น $49.99
    // ข้อดี: ถ้าร้านเปลี่ยนราคาสินค้า test ยังใช้ได้ เพราะเราตรวจ "กฎ" ไม่ใช่ "ค่าตายตัว"
    //
    // allTextContents() = ดึงข้อความของ "ทุก" element ที่ตรง selector ออกมาเป็น array
    //   ผลลัพธ์: ["$49.99", "$29.99", "$15.99", ...]
    // .map(toNumber)     -> [49.99, 29.99, 15.99, ...]
    const prices = (await page.locator('.inventory_item_price').allTextContents()).map(toNumber);

    // กันกรณีหน้าเว็บโหลดสินค้าไม่ขึ้น (ถ้า array ว่าง prices[0] จะเป็น undefined)
    expect(prices.length).toBeGreaterThan(1);

    // Assert ตามโจทย์: ชิ้นแรก >= ชิ้นที่สอง
    // ใช้ >= ไม่ใช่ > เพราะสินค้า 2 ชิ้นอาจราคาเท่ากันได้ (เช่น $15.99 มี 2 ชิ้น)
    expect(prices[0]).toBeGreaterThanOrEqual(prices[1]);

    // (ตรวจเพิ่มเกินโจทย์) เช็คว่าเรียงถูก "ทั้งลิสต์" ไม่ใช่แค่ 2 ชิ้นแรก
    // วิธี: เอาลิสต์ไปเรียงเองด้วย sort แล้วเทียบกับที่เว็บแสดง ถ้าเหมือนกัน = เว็บเรียงถูก
    // [...prices] = copy array ก่อน เพราะ sort() แก้ array เดิม (mutate)
    const sorted = [...prices].sort((a, b) => b - a); // b - a = มากไปน้อย
    expect(prices).toEqual(sorted); // toEqual เทียบ "เนื้อหา" ของ array ทุกตัว
  });

  // -------------------------------------------------------------------------
  // ส่วนที่ 2: Multi-Item Selection
  //   Tested Condition : กด Add to cart สินค้าที่แพงที่สุด + ถูกที่สุด
  //   Expected Output  : Badge ตะกร้าแสดง "2"
  //
  // ตรรกะ: หลังเรียง high->low แล้ว
  //   แพงสุด = ชิ้นแรก   -> index 0
  //   ถูกสุด = ชิ้นสุดท้าย -> index (จำนวนทั้งหมด - 1)
  // -------------------------------------------------------------------------
  const items = page.locator('.inventory_item'); // การ์ดสินค้า "ทุกใบ"
  const count = await items.count();             // นับว่ามีกี่ใบ (ปกติ 6)
  const mostExpensive = items.nth(0);            // nth(i) = เลือกตัวที่ i (นับจาก 0)
  const cheapest = items.nth(count - 1);

  // จดชื่อและราคาไว้ก่อน เพื่อเอาไปตรวจในหน้า Cart และ Overview ทีหลัง
  // (เป็นการ "ส่งต่อข้อมูลระหว่าง step" แบบ Dynamic ไม่ hard-code ชื่อสินค้า)
  //
  // mostExpensive.locator(...) = หา element "ภายใน" การ์ดใบนั้นเท่านั้น (chaining)
  //   ทำให้ได้ชื่อของการ์ดใบนี้จริง ๆ ไม่ใช่ชื่อแรกของทั้งหน้า
  // textContent() คืนค่า string | null -> ใส่ ! บอก TypeScript ว่า "ไม่ null แน่นอน"
  // .trim() = ตัดช่องว่างหน้า-หลังทิ้ง
  const selectedNames = [
    (await mostExpensive.locator('.inventory_item_name').textContent())!.trim(),
    (await cheapest.locator('.inventory_item_name').textContent())!.trim(),
  ];
  const selectedPrices = [
    toNumber((await mostExpensive.locator('.inventory_item_price').textContent())!),
    toNumber((await cheapest.locator('.inventory_item_price').textContent())!),
  ];

  await test.step('2. Add most expensive + cheapest to cart', async () => {
    // ในการ์ดแต่ละใบมีปุ่มเดียวคือ "Add to cart" -> ใช้ locator('button') ได้เลย
    await mostExpensive.locator('button').click();
    await cheapest.locator('button').click();

    // ตรวจ Badge (ตัวเลขแดงบนไอคอนตะกร้า)
    // toHaveText = รอจนข้อความตรง (auto-retry) เหมาะกับค่าที่อัปเดตหลังคลิก
    // ค่าที่เทียบเป็น string '2' เพราะบนหน้าเว็บทุกอย่างเป็นข้อความ
    await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
  });

  // -------------------------------------------------------------------------
  // ส่วนที่ 3: Cart Navigation & Validation
  //   Tested Condition : กดไอคอนตะกร้าไปหน้า Cart
  //   Expected Output  : มีสินค้า 2 ชิ้น และ "เป็นชิ้นเดียวกับที่เลือก"
  //
  // ทำไมต้องเช็คชื่อด้วย ไม่ใช่แค่นับจำนวน?
  //   ถ้าระบบมีบั๊กใส่สินค้าผิดชิ้น จำนวนก็ยังเป็น 2 -> นับอย่างเดียวจับบั๊กนี้ไม่ได้
  // -------------------------------------------------------------------------
  await test.step('3. Validate cart contents', async () => {
    await page.locator('.shopping_cart_link').click();
    await expect(page).toHaveURL(`${BASE_URL}/cart.html`);

    const cartItems = page.locator('.cart_item');

    // toHaveCount = ตรวจจำนวน element ที่ตรง selector (auto-retry)
    await expect(cartItems).toHaveCount(2);

    // ดึงชื่อสินค้าในตะกร้าทั้งหมด แล้วเทียบกับชื่อที่จดไว้ตอนเลือก
    // ใช้ .sort() ทั้งสองฝั่ง เพราะลำดับในตะกร้าอาจไม่เหมือนลำดับที่เรากด
    // (เราสนใจว่า "มีครบ" ไม่ได้สนใจลำดับ)
    const cartNames = (await cartItems.locator('.inventory_item_name').allTextContents()).map(s => s.trim());
    expect(cartNames.sort()).toEqual([...selectedNames].sort());
  });

  // -------------------------------------------------------------------------
  // ส่วนที่ 4: Checkout & Calculation Verification
  //   Tested Condition : กด Checkout, กรอกข้อมูลผู้ซื้อ, ไปหน้า Overview
  //   Expected Output  :
  //     (ก) Item Total == ราคาชิ้นที่ 1 + ราคาชิ้นที่ 2
  //     (ข) Tax        == Item Total x 8%
  //     (ค) Total      == Item Total + Tax
  // -------------------------------------------------------------------------
  await test.step('4. Checkout and verify totals', async () => {
    await page.locator('[data-test="checkout"]').click();

    // Test Data ของผู้ซื้อ (ค่าอะไรก็ได้ ขอแค่ไม่ว่าง เพราะฟอร์มบังคับกรอก)
    await page.locator('[data-test="firstName"]').fill('Sun');
    await page.locator('[data-test="lastName"]').fill('Tester');
    await page.locator('[data-test="postalCode"]').fill('20131');
    await page.locator('[data-test="continue"]').click();

    // ยืนยันว่าอยู่หน้า Overview ก่อนดึงตัวเลข (ถ้าฟอร์มผิด จะพังตรงนี้ อ่านง่าย)
    await expect(page).toHaveURL(`${BASE_URL}/checkout-step-two.html`);

    // ดึงราคาสินค้าแต่ละชิ้น "จากหน้า Overview" ตามที่โจทย์สั่ง
    // '.cart_item .inventory_item_price' (มีช่องว่างคั่น) = price ที่อยู่ "ข้างใน" cart_item
    const overviewPrices = (await page.locator('.cart_item .inventory_item_price').allTextContents()).map(toNumber);
    expect(overviewPrices).toHaveLength(2);

    // reduce = รวมค่าใน array:  (ผลรวมสะสม, ค่าปัจจุบัน) => ผลรวมใหม่ , เริ่มที่ 0
    const sumOfItems = round2(overviewPrices.reduce((a, b) => a + b, 0));

    // ดึงตัวเลขสรุปท้ายหน้า (ข้อความจริงเช่น "Item total: $57.98")
    const itemTotal = toNumber((await page.locator('.summary_subtotal_label').textContent())!);
    const tax = toNumber((await page.locator('.summary_tax_label').textContent())!);
    const total = toNumber((await page.locator('.summary_total_label').textContent())!);

    // ---- (ก) Item Total = ผลรวมสินค้า ----
    // toBeCloseTo(ค่า, 2) = "ใกล้เคียงถึงทศนิยม 2 ตำแหน่ง"
    // ใช้แทน toBe เพราะปัญหา floating point (0.1 + 0.2 != 0.3) ที่อธิบายไว้ด้านบน
    expect(itemTotal).toBeCloseTo(sumOfItems, 2);

    // ตรวจเพิ่ม: ราคาในหน้า Overview ต้องตรงกับราคาที่เห็นตอนเลือกสินค้าหน้าแรก
    // (จับบั๊กแบบ "ราคาเปลี่ยนเองระหว่างทาง")
    expect(itemTotal).toBeCloseTo(round2(selectedPrices[0] + selectedPrices[1]), 2);

    // ---- (ข) Tax = 8% ของ Item Total ----
    // เราคำนวณภาษีเอง (Expected) แล้วเทียบกับที่ระบบแสดง (Actual)
    expect(tax).toBeCloseTo(round2(itemTotal * TAX_RATE), 2);

    // ---- (ค) สูตร Item Total + Tax = Total ----
    expect(total).toBeCloseTo(round2(itemTotal + tax), 2);
  });

  // -------------------------------------------------------------------------
  // ส่วนที่ 5: Complete & URL Verification
  //   Tested Condition : กด Finish
  //   Expected Output  : URL = /checkout-complete.html
  //                      และมีข้อความ "Thank you for your order!"
  // -------------------------------------------------------------------------
  await test.step('5. Finish and verify completion', async () => {
    await page.locator('[data-test="finish"]').click();

    // toHaveURL เทียบ URL แบบเต็มตรงตัว
    await expect(page).toHaveURL(`${BASE_URL}/checkout-complete.html`);

    // toHaveText เทียบข้อความแบบตรงทั้งหมด
    // ถ้าอยากเช็คแค่ "มีคำนี้อยู่ข้างใน" ให้ใช้ toContainText แทน
    await expect(page.locator('.complete-header')).toHaveText('Thank you for your order!');
  });
});

/**
 * ============================================================================
 *  สรุป expect ที่ใช้ในไฟล์นี้
 * ============================================================================
 *  | Matcher                    | ใช้ตรวจ                    | รอ/ลองใหม่อัตโนมัติ? |
 *  |----------------------------|---------------------------|--------------------|
 *  | toHaveURL(url)             | URL ของหน้า                | ใช่ (ต้อง await)    |
 *  | toHaveText(text)           | ข้อความของ element         | ใช่ (ต้อง await)    |
 *  | toHaveCount(n)             | จำนวน element              | ใช่ (ต้อง await)    |
 *  | toBeGreaterThanOrEqual(n)  | ตัวเลข >=                  | ไม่ (ค่าธรรมดา)     |
 *  | toBeGreaterThan(n)         | ตัวเลข >                   | ไม่                 |
 *  | toBeCloseTo(n, digits)     | ตัวเลขทศนิยม (เงิน)          | ไม่                 |
 *  | toEqual(value)             | เนื้อหา array/object       | ไม่                 |
 *  | toHaveLength(n)            | ความยาว array              | ไม่                 |
 *
 *  กฎจำง่าย:
 *    - expect(locator หรือ page)  -> "Web-first assertion" ต้อง await และรอเองได้
 *    - expect(ตัวเลข/array ธรรมดา) -> ตรวจทันที ไม่ต้อง await
 *
 *  คำสั่งรันที่ใช้บ่อย
 *    npx playwright test                 รันแบบไม่เห็นหน้าจอ (headless)
 *    npx playwright test --headed        รันแบบเห็นเบราว์เซอร์
 *    npx playwright test --ui            โหมด UI ดูทีละ step ย้อนดูได้ (แนะนำตอนเรียน)
 *    npx playwright test --debug         หยุดทีละบรรทัดเพื่อ debug
 *    npx playwright show-report          เปิดรายงาน HTML หลังรันเสร็จ
 *    npx playwright codegen <url>        อัดการคลิกแล้วเจนโค้ดให้
 * ============================================================================
 */
