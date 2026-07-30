import { test, expect } from '@playwright/test';

const mockState = {
  debts: [],
  records: [],
  accounts: [
    {
      id: 'acc_1',
      name: '工商银行储蓄卡',
      category: '银行',
      subCategory: '工商银行',
      currency: 'CNY',
      liability: false,
      type: '资产',
    },
    {
      id: 'acc_2',
      name: '招商银行信用卡',
      category: '银行',
      subCategory: '招商银行',
      currency: 'CNY',
      liability: true,
      type: '负债',
    },
  ],
  assetClasses: [],
  overviewGoals: {},
  books: [],
  tags: [],
  debtCategories: [],
  accountCategories: {
    '银行': ['招商银行', '工商银行', '建设银行'],
    '券商': ['东方财富', '同花顺'],
    '基金平台': ['天天基金', '支付宝基金'],
    '其他': ['支付宝', '微信支付', '储蓄'],
  },
  accountTypes: ['资产', '负债', '打新', '生活', '死期', '活期'],
  user: { name: '管理员', phone: '13896375671', email: 'admin@example.com', avatar: '' },
  financeAssets: [
    {
      id: 'asset_1',
      code: '000001',
      name: '平安银行',
      accountId: 'acc_1',
      kind: 'stock',
      shares: 1000,
      costPrice: 10.5,
      currentPrice: 12.3,
      currentValue: 12300,
      totalCost: 10500,
      category: '股票',
      assetType: 'stock',
      holdingDays: 180,
    },
    {
      id: 'asset_2',
      code: '110022',
      name: '易方达消费行业',
      accountId: 'acc_1',
      kind: 'fund',
      shares: 500,
      costPrice: 2.1,
      currentPrice: 2.5,
      currentValue: 1250,
      totalCost: 1050,
      category: '基金',
      assetType: 'fund',
      holdingDays: 90,
    },
  ],
  independentAssets: {},
};

async function setupApp(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: mockState.user, isAdmin: false }),
    });
  });

  await page.route('**/api/state', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ state: mockState }),
    });
  });

  await page.route('**/api/accounts/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/api/sync', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, synced: 0 }),
    });
  });

  await page.goto('http://localhost:5173/');
  await page.evaluate((stateStr) => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('state', stateStr);
  }, JSON.stringify(mockState));
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function goToAccounts(page) {
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '账户管理' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('账户管理功能测试', () => {

  test('步骤1-2: 登录系统并进入账户管理页面', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await expect(page.getByRole('heading', { name: '账户管理' })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/01-account-list.png', fullPage: true });
  });

  test('步骤3: 验证账户列表表头字段', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);

    const expectedHeaders = ['账户名称', '大类', '类名', '类型', '当前市值', '持有成本', '盈亏额', '收益率', '余额', '操作'];
    const headerRow = page.locator('thead').first().locator('tr');
    for (const header of expectedHeaders) {
      await expect(headerRow.getByText(header)).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/screenshots/03-table-headers.png', fullPage: true });
  });

  test('步骤4: 验证列表下方有合计行', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await expect(page.getByText(/合计/).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/04-total-row.png', fullPage: true });
  });

  test('步骤5: 点击账户进入详情页', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await page.getByText('工商银行储蓄').click();
    await expect(page.getByRole('heading', { name: /工商银行储蓄/ })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/screenshots/05-detail-page.png', fullPage: true });
  });

  test('步骤6: 验证详情页核心组件', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await page.getByText('工商银行储蓄').click();

    await expect(page.getByRole('button', { name: '返回' })).toBeVisible();
    await expect(page.getByText('总市值')).toBeVisible();
    await expect(page.getByText('总成本')).toBeVisible();
    await expect(page.getByText('总盈亏')).toBeVisible();
    await expect(page.getByText('总收益率')).toBeVisible();
    await expect(page.getByText('现有余额')).toBeVisible();
    await expect(page.getByRole('heading', { name: '资产列表' })).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/06-detail-components.png', fullPage: true });
  });

  test('步骤7: 验证资产列表显示理财持仓数据', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await page.getByText('工商银行储蓄').click();

    const expectedColumns = ['代码', '数量', '现价', '当前市值'];
    const headerRow = page.locator('thead').last().locator('tr');
    for (const col of expectedColumns) {
      await expect(headerRow.getByText(col)).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/screenshots/07-asset-list.png', fullPage: true });
  });

  test('步骤8: 勾选资产验证归入余额', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await page.getByText('工商银行储蓄').click();

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    await checkboxes.first().check();
    await expect(page.getByText(/项资产计入/).first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/screenshots/08-check-asset.png', fullPage: true });
  });

  test('步骤9: 返回列表页测试添加账户弹窗类型下拉框', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);

    const addBtn = page.getByRole('button', { name: /添加账户/ });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page.getByRole('heading', { name: '添加账户' })).toBeVisible({ timeout: 5000 });

    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/screenshots/09-add-account-modal.png', fullPage: true });
  });

  test('步骤10: 全页面截图', async ({ page }) => {
    await setupApp(page);
    await goToAccounts(page);
    await page.screenshot({ path: 'test-results/screenshots/01-account-list-final.png', fullPage: true });

    await page.getByText('工商银行储蓄').click();
    await page.screenshot({ path: 'test-results/screenshots/02-account-detail-final.png', fullPage: true });
  });

});