# SauceDemo Playwright E2E

E2E test ของ https://www.saucedemo.com ด้วย Playwright + TypeScript

| ส่วน | สิ่งที่ตรวจ |
|---|---|
| Sorting | เรียง Price (high to low) แล้วราคา[0] ≥ ราคา[1] |
| Multi-Item | เพิ่มสินค้าแพงสุด + ถูกสุด, Badge = 2 |
| Cart | มีสินค้า 2 ชิ้นตรงกับที่เลือก |
| Checkout | Item Total = ผลรวม, Tax = 8%, Total = Item Total + Tax |
| Complete | URL = checkout-complete.html และข้อความ "Thank you for your order!" |

## วิธีรัน
```bash
npm install
npx playwright install chromium
npm test            # headless
npm run test:headed # เห็นเบราว์เซอร์
npm run report      # เปิด HTML report
```
