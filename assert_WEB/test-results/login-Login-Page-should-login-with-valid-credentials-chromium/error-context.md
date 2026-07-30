# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.test.js >> Login Page >> should login with valid credentials
- Location: tests\login.test.js:12:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForNavigation: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - heading "Wealth OS" [level=1] [ref=e12]
    - paragraph [ref=e13]: 个人精细化资产管理平台
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]: 账号
      - textbox "请输入账号" [ref=e21]: SuperAdmin
    - generic [ref=e22]:
      - generic [ref=e23]: 密码
      - generic [ref=e24]:
        - textbox "请输入密码" [ref=e28]: Super12345
        - button [active] [ref=e29] [cursor=pointer]
    - button "登录" [ref=e35] [cursor=pointer]
  - generic [ref=e36]:
    - button "注册账号" [ref=e37] [cursor=pointer]
    - button "忘记密码" [ref=e38] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login Page', () => {
  4  |   test('should display login form', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     
  7  |     await expect(page.locator('input[type="text"]')).toBeVisible();
  8  |     await expect(page.locator('input[type="password"]')).toBeVisible();
  9  |     await expect(page.locator('button', { hasText: '登录' })).toBeVisible();
  10 |   });
  11 | 
  12 |   test('should login with valid credentials', async ({ page }) => {
  13 |     await page.goto('/');
  14 |     
  15 |     await page.fill('input[type="text"]', 'SuperAdmin');
  16 |     await page.fill('input[type="password"]', 'Super12345');
  17 |     await page.click('button', { hasText: '登录' });
  18 |     
> 19 |     await page.waitForNavigation();
     |                ^ Error: page.waitForNavigation: Test timeout of 30000ms exceeded.
  20 |     await expect(page).toHaveURL(/\/dashboard|\/overview/);
  21 |   });
  22 | 
  23 |   test('should show error for invalid credentials', async ({ page }) => {
  24 |     await page.goto('/');
  25 |     
  26 |     await page.fill('input[type="text"]', 'invalid');
  27 |     await page.fill('input[type="password"]', 'wrong');
  28 |     await page.click('button', { hasText: '登录' });
  29 |     
  30 |     await expect(page.locator('.text-red-500')).toBeVisible();
  31 |   });
  32 | });
  33 | 
  34 | test.describe('Overview Page', () => {
  35 |   test('should display dashboard overview', async ({ page }) => {
  36 |     await page.goto('/');
  37 |     
  38 |     await page.fill('input[type="text"]', 'SuperAdmin');
  39 |     await page.fill('input[type="password"]', 'Super12345');
  40 |     await page.click('button', { hasText: '登录' });
  41 |     
  42 |     await page.waitForNavigation();
  43 |     
  44 |     await expect(page.locator('text=概览')).toBeVisible();
  45 |     await expect(page.locator('text=资产分类排行')).toBeVisible();
  46 |   });
  47 | });
  48 | 
  49 | test.describe('Navigation', () => {
  50 |   test('should navigate to different pages', async ({ page }) => {
  51 |     await page.goto('/');
  52 |     
  53 |     await page.fill('input[type="text"]', 'SuperAdmin');
  54 |     await page.fill('input[type="password"]', 'Super12345');
  55 |     await page.click('button', { hasText: '登录' });
  56 |     
  57 |     await page.waitForNavigation();
  58 |     
  59 |     await page.click('text=理财');
  60 |     await expect(page).toHaveURL(/\/finance/);
  61 |     
  62 |     await page.click('text=记账');
  63 |     await expect(page).toHaveURL(/\/records/);
  64 |     
  65 |     await page.click('text=分析');
  66 |     await expect(page).toHaveURL(/\/analysis/);
  67 |   });
  68 | });
  69 | 
  70 | test.describe('User Profile', () => {
  71 |   test('should navigate to user profile', async ({ page }) => {
  72 |     await page.goto('/');
  73 |     
  74 |     await page.fill('input[type="text"]', 'SuperAdmin');
  75 |     await page.fill('input[type="password"]', 'Super12345');
  76 |     await page.click('button', { hasText: '登录' });
  77 |     
  78 |     await page.waitForNavigation();
  79 |     
  80 |     await page.click('text=我的');
  81 |     await expect(page).toHaveURL(/\/profile/);
  82 |   });
  83 | });
  84 | 
  85 | test.describe('Admin Dashboard', () => {
  86 |   test('should navigate to admin dashboard', async ({ page }) => {
  87 |     await page.goto('/');
  88 |     
  89 |     await page.fill('input[type="text"]', 'SuperAdmin');
  90 |     await page.fill('input[type="password"]', 'Super12345');
  91 |     await page.click('button', { hasText: '登录' });
  92 |     
  93 |     await page.waitForNavigation();
  94 |     
  95 |     await page.click('text=管理');
  96 |     await expect(page).toHaveURL(/\/admin/);
  97 |   });
  98 | });
  99 | 
```