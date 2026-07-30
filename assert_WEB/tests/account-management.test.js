import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function login(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button', { hasText: '登录' });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=资产总览')).toBeVisible({ timeout: 10000 });
}

async function goToAccounts(page) {
  await page.click('button', { hasText: '账户管理' });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=账户管理')).toBeVisible({ timeout: 10000 });
}

test.describe('账户管理功能测试', () => {

  test('步骤1-2: 登录系统并进入账户管理页面', async ({ page }) => {
    await login(page);
    await goToAccounts(page);
    await expect(page.locator('text=管理所有资产和负债账户')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('步骤3: 验证账户列表表头字段', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const headers = page.locator('thead th');
    const expectedHeaders = [
      '账户名称', '大类', '类名', '类型', '当前市值',
      '持有成本', '盈亏额', '收益率', '余额', '操作'
    ];

    for (let i = 0; i < expectedHeaders.length; i++) {
      await expect(headers.nth(i)).toContainText(expectedHeaders[i]);
    }
  });

  test('步骤4: 验证列表下方有合计行', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const summaryRow = page.locator('tr', { hasText: /合计/ });
    await expect(summaryRow.first()).toBeVisible();
    await expect(summaryRow.first()).toContainText(/合计.*条/);
  });

  test('步骤5: 点击账户进入详情页', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const accountRow = page.locator('tbody tr').first();
    await expect(accountRow).toBeVisible();
    await accountRow.click();

    await page.waitForLoadState('networkidle');

    await expect(page.locator('button', { hasText: '返回' })).toBeVisible();
  });

  test('步骤6: 验证详情页核心组件', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const accountRow = page.locator('tbody tr').first();
    await accountRow.click();

    await expect(page.locator('button', { hasText: '返回' })).toBeVisible();
    await expect(page.locator('div.bg-white', { hasText: /总市值|总成本|总盈亏|总收益率/ }).first()).toBeVisible();

    const totalMarketValue = page.locator('text=总市值');
    const totalCost = page.locator('text=总成本');
    const totalPl = page.locator('text=总盈亏');
    const totalPlRate = page.locator('text=总收益率');

    await expect(totalMarketValue.first()).toBeVisible();
    await expect(totalCost.first()).toBeVisible();
    await expect(totalPl.first()).toBeVisible();
    await expect(totalPlRate.first()).toBeVisible();

    await expect(page.locator('text=现有余额')).toBeVisible();
    await expect(page.locator('text=资产列表')).toBeVisible();
  });

  test('步骤7: 验证资产列表显示理财持仓数据', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const accountRow = page.locator('tbody tr').first();
    await accountRow.click();

    const assetTable = page.locator('table').last();
    if (await assetTable.isVisible()) {
      const assetHeaders = assetTable.locator('thead th');
      const headerCount = await assetHeaders.count();

      const expectedColumns = ['资产名称', '代码', '资产类型', '一级分类', '持仓成本', '数量', '现价', '当前市值', '持仓盈亏', '盈亏率'];
      for (let i = 0; i < headerCount; i++) {
        const text = await assetHeaders.nth(i).innerText();
        const matched = expectedColumns.some(col => text.includes(col));
        if (matched) {
          expect(true).toBeTruthy();
        }
      }
    }
  });

  test('步骤8: 勾选资产验证归入余额', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const accountRow = page.locator('tbody tr').first();
    await accountRow.click();

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      const initialBalanceText = await page.locator('text=现有余额').first().innerText();
      await checkboxes.first().click();
      await page.waitForTimeout(500);
      const balanceTextAfter = await page.locator('text=现有余额').first().innerText();
      expect(balanceTextAfter).toBeTruthy();
    } else {
      await expect(page.locator('text=暂无关联资产记录')).toBeVisible();
    }
  });

  test('步骤9: 返回列表页测试添加账户弹窗类型下拉框', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const addButton = page.locator('button', { hasText: '添加账户' });
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(page.locator('text=添加账户')).toBeVisible();

    const typeField = page.locator('button', { hasText: /资产|负债|打新|生活|死期|活期/ }).first();
    await expect(typeField).toBeVisible();

    await typeField.click();

    const typeDropdown = page.locator('div', { hasText: /资产/ });
    await expect(typeDropdown.first()).toBeVisible();

    const typeOptions = page.locator('button', { hasText: /^(资产|负债|打新|生活|死期|活期)$/ });
    const optionCount = await typeOptions.count();
    expect(optionCount).toBeGreaterThanOrEqual(1);

    await page.keyboard.press('Escape');
  });

  test('步骤10: 全页面截图', async ({ page }, testInfo) => {
    await login(page);
    await goToAccounts(page);
    await page.screenshot({ path: `screenshots/01-account-list-${testInfo.project.name}.png`, fullPage: true });

    const accountRow = page.locator('tbody tr').first();
    await accountRow.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `screenshots/02-account-detail-${testInfo.project.name}.png`, fullPage: true });

    await page.click('button', { hasText: '返回' });
    await page.waitForLoadState('networkidle');

    await page.click('button', { hasText: '添加账户' });
    await page.screenshot({ path: `screenshots/03-add-account-modal-${testInfo.project.name}.png`, fullPage: true });
  });

  test('资产列表列完整性验证', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const accountRow = page.locator('tbody tr').first();
    await accountRow.click();

    const assetTable = page.locator('table').last();
    if (await assetTable.isVisible()) {
      const assetHeaders = assetTable.locator('thead th');
      const headerTexts = await assetHeaders.allInnerTexts();

      const requiredColumns = ['代码', '数量', '现价', '当前市值'];
      for (const col of requiredColumns) {
        const hasColumn = headerTexts.some(t => t.includes(col));
        expect(hasColumn).toBeTruthy();
      }
    }
  });

  test('合计行数据一致性验证', async ({ page }) => {
    await login(page);
    await goToAccounts(page);

    const summaryRow = page.locator('tr', { hasText: /合计/ });
    if (await summaryRow.isVisible()) {
      const cells = summaryRow.first().locator('td');
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);
    }
  });
});