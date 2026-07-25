import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button', { hasText: '登录' })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="text"]', 'SuperAdmin');
    await page.fill('input[type="password"]', 'Super12345');
    await page.click('button', { hasText: '登录' });
    
    await page.waitForNavigation();
    await expect(page).toHaveURL(/\/dashboard|\/overview/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button', { hasText: '登录' });
    
    await expect(page.locator('.text-red-500')).toBeVisible();
  });
});

test.describe('Overview Page', () => {
  test('should display dashboard overview', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="text"]', 'SuperAdmin');
    await page.fill('input[type="password"]', 'Super12345');
    await page.click('button', { hasText: '登录' });
    
    await page.waitForNavigation();
    
    await expect(page.locator('text=概览')).toBeVisible();
    await expect(page.locator('text=资产分类排行')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="text"]', 'SuperAdmin');
    await page.fill('input[type="password"]', 'Super12345');
    await page.click('button', { hasText: '登录' });
    
    await page.waitForNavigation();
    
    await page.click('text=理财');
    await expect(page).toHaveURL(/\/finance/);
    
    await page.click('text=记账');
    await expect(page).toHaveURL(/\/records/);
    
    await page.click('text=分析');
    await expect(page).toHaveURL(/\/analysis/);
  });
});

test.describe('User Profile', () => {
  test('should navigate to user profile', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="text"]', 'SuperAdmin');
    await page.fill('input[type="password"]', 'Super12345');
    await page.click('button', { hasText: '登录' });
    
    await page.waitForNavigation();
    
    await page.click('text=我的');
    await expect(page).toHaveURL(/\/profile/);
  });
});

test.describe('Admin Dashboard', () => {
  test('should navigate to admin dashboard', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="text"]', 'SuperAdmin');
    await page.fill('input[type="password"]', 'Super12345');
    await page.click('button', { hasText: '登录' });
    
    await page.waitForNavigation();
    
    await page.click('text=管理');
    await expect(page).toHaveURL(/\/admin/);
  });
});
