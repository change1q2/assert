# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account-e2e.test.js >> 账户管理功能测试 >> 步骤7: 验证资产列表显示理财持仓数据
- Location: tests\account-e2e.test.js:174:3

# Error details

```
Error: page.goto: net::ERR_NETWORK_CHANGED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e6]:
      - heading "连接已中断" [level=1] [ref=e7]
      - paragraph [ref=e8]: 检测到网络更改。
      - generic [ref=e9]: ERR_NETWORK_CHANGED
    - button "刷新" [ref=e12] [cursor=pointer]
  - generic [ref=e13]: Microsoft Edge
```

# Test source

```ts
  7   |     {
  8   |       id: 'acc_1',
  9   |       name: '工商银行储蓄卡',
  10  |       category: '银行',
  11  |       subCategory: '工商银行',
  12  |       currency: 'CNY',
  13  |       liability: false,
  14  |       type: '资产',
  15  |     },
  16  |     {
  17  |       id: 'acc_2',
  18  |       name: '招商银行信用卡',
  19  |       category: '银行',
  20  |       subCategory: '招商银行',
  21  |       currency: 'CNY',
  22  |       liability: true,
  23  |       type: '负债',
  24  |     },
  25  |   ],
  26  |   assetClasses: [],
  27  |   overviewGoals: {},
  28  |   books: [],
  29  |   tags: [],
  30  |   debtCategories: [],
  31  |   accountCategories: {
  32  |     '银行': ['招商银行', '工商银行', '建设银行'],
  33  |     '券商': ['东方财富', '同花顺'],
  34  |     '基金平台': ['天天基金', '支付宝基金'],
  35  |     '其他': ['支付宝', '微信支付', '储蓄'],
  36  |   },
  37  |   accountTypes: ['资产', '负债', '打新', '生活', '死期', '活期'],
  38  |   user: { name: '管理员', phone: '13896375671', email: 'admin@example.com', avatar: '' },
  39  |   financeAssets: [
  40  |     {
  41  |       id: 'asset_1',
  42  |       code: '000001',
  43  |       name: '平安银行',
  44  |       accountId: 'acc_1',
  45  |       kind: 'stock',
  46  |       shares: 1000,
  47  |       costPrice: 10.5,
  48  |       currentPrice: 12.3,
  49  |       currentValue: 12300,
  50  |       totalCost: 10500,
  51  |       category: '股票',
  52  |       assetType: 'stock',
  53  |       holdingDays: 180,
  54  |     },
  55  |     {
  56  |       id: 'asset_2',
  57  |       code: '110022',
  58  |       name: '易方达消费行业',
  59  |       accountId: 'acc_1',
  60  |       kind: 'fund',
  61  |       shares: 500,
  62  |       costPrice: 2.1,
  63  |       currentPrice: 2.5,
  64  |       currentValue: 1250,
  65  |       totalCost: 1050,
  66  |       category: '基金',
  67  |       assetType: 'fund',
  68  |       holdingDays: 90,
  69  |     },
  70  |   ],
  71  |   independentAssets: {},
  72  | };
  73  | 
  74  | async function setupApp(page) {
  75  |   await page.route('**/api/auth/me', async (route) => {
  76  |     await route.fulfill({
  77  |       status: 200,
  78  |       contentType: 'application/json',
  79  |       body: JSON.stringify({ user: mockState.user, isAdmin: false }),
  80  |     });
  81  |   });
  82  | 
  83  |   await page.route('**/api/state', async (route) => {
  84  |     await route.fulfill({
  85  |       status: 200,
  86  |       contentType: 'application/json',
  87  |       body: JSON.stringify({ state: mockState }),
  88  |     });
  89  |   });
  90  | 
  91  |   await page.route('**/api/accounts/**', async (route) => {
  92  |     await route.fulfill({
  93  |       status: 200,
  94  |       contentType: 'application/json',
  95  |       body: JSON.stringify({ success: true }),
  96  |     });
  97  |   });
  98  | 
  99  |   await page.route('**/api/sync', async (route) => {
  100 |     await route.fulfill({
  101 |       status: 200,
  102 |       contentType: 'application/json',
  103 |       body: JSON.stringify({ success: true, synced: 0 }),
  104 |     });
  105 |   });
  106 | 
> 107 |   await page.goto('http://localhost:5173/');
      |              ^ Error: page.goto: net::ERR_NETWORK_CHANGED at http://localhost:5173/
  108 |   await page.evaluate((stateStr) => {
  109 |     localStorage.setItem('token', 'mock-token');
  110 |     localStorage.setItem('state', stateStr);
  111 |   }, JSON.stringify(mockState));
  112 |   await page.reload();
  113 |   await page.waitForLoadState('networkidle');
  114 | }
  115 | 
  116 | async function goToAccounts(page) {
  117 |   await page.waitForTimeout(1000);
  118 |   await page.getByRole('button', { name: '账户管理' }).click();
  119 |   await page.waitForLoadState('networkidle');
  120 |   await page.waitForTimeout(2000);
  121 | }
  122 | 
  123 | test.describe('账户管理功能测试', () => {
  124 | 
  125 |   test('步骤1-2: 登录系统并进入账户管理页面', async ({ page }) => {
  126 |     await setupApp(page);
  127 |     await goToAccounts(page);
  128 |     await expect(page.getByRole('heading', { name: '账户管理' })).toBeVisible();
  129 |     await page.screenshot({ path: 'test-results/screenshots/01-account-list.png', fullPage: true });
  130 |   });
  131 | 
  132 |   test('步骤3: 验证账户列表表头字段', async ({ page }) => {
  133 |     await setupApp(page);
  134 |     await goToAccounts(page);
  135 | 
  136 |     const expectedHeaders = ['账户名称', '大类', '类名', '类型', '当前市值', '持有成本', '盈亏额', '收益率', '余额', '操作'];
  137 |     const headerRow = page.locator('thead').first().locator('tr');
  138 |     for (const header of expectedHeaders) {
  139 |       await expect(headerRow.getByText(header)).toBeVisible();
  140 |     }
  141 |     await page.screenshot({ path: 'test-results/screenshots/03-table-headers.png', fullPage: true });
  142 |   });
  143 | 
  144 |   test('步骤4: 验证列表下方有合计行', async ({ page }) => {
  145 |     await setupApp(page);
  146 |     await goToAccounts(page);
  147 |     await expect(page.getByText(/合计/).first()).toBeVisible({ timeout: 10000 });
  148 |     await page.screenshot({ path: 'test-results/screenshots/04-total-row.png', fullPage: true });
  149 |   });
  150 | 
  151 |   test('步骤5: 点击账户进入详情页', async ({ page }) => {
  152 |     await setupApp(page);
  153 |     await goToAccounts(page);
  154 |     await page.getByText('工商银行储蓄').click();
  155 |     await expect(page.getByRole('heading', { name: /工商银行储蓄/ })).toBeVisible({ timeout: 10000 });
  156 |     await page.screenshot({ path: 'test-results/screenshots/05-detail-page.png', fullPage: true });
  157 |   });
  158 | 
  159 |   test('步骤6: 验证详情页核心组件', async ({ page }) => {
  160 |     await setupApp(page);
  161 |     await goToAccounts(page);
  162 |     await page.getByText('工商银行储蓄').click();
  163 | 
  164 |     await expect(page.getByRole('button', { name: '返回' })).toBeVisible();
  165 |     await expect(page.getByText('总市值')).toBeVisible();
  166 |     await expect(page.getByText('总成本')).toBeVisible();
  167 |     await expect(page.getByText('总盈亏')).toBeVisible();
  168 |     await expect(page.getByText('总收益率')).toBeVisible();
  169 |     await expect(page.getByText('现有余额')).toBeVisible();
  170 |     await expect(page.getByRole('heading', { name: '资产列表' })).toBeVisible();
  171 |     await page.screenshot({ path: 'test-results/screenshots/06-detail-components.png', fullPage: true });
  172 |   });
  173 | 
  174 |   test('步骤7: 验证资产列表显示理财持仓数据', async ({ page }) => {
  175 |     await setupApp(page);
  176 |     await goToAccounts(page);
  177 |     await page.getByText('工商银行储蓄').click();
  178 | 
  179 |     const expectedColumns = ['代码', '数量', '现价', '当前市值'];
  180 |     const headerRow = page.locator('thead').last().locator('tr');
  181 |     for (const col of expectedColumns) {
  182 |       await expect(headerRow.getByText(col)).toBeVisible();
  183 |     }
  184 |     await page.screenshot({ path: 'test-results/screenshots/07-asset-list.png', fullPage: true });
  185 |   });
  186 | 
  187 |   test('步骤8: 勾选资产验证归入余额', async ({ page }) => {
  188 |     await setupApp(page);
  189 |     await goToAccounts(page);
  190 |     await page.getByText('工商银行储蓄').click();
  191 | 
  192 |     const checkboxes = page.locator('input[type="checkbox"]');
  193 |     const count = await checkboxes.count();
  194 |     expect(count).toBeGreaterThan(0);
  195 | 
  196 |     await checkboxes.first().check();
  197 |     await expect(page.getByText(/项资产计入/).first()).toBeVisible({ timeout: 5000 });
  198 |     await page.screenshot({ path: 'test-results/screenshots/08-check-asset.png', fullPage: true });
  199 |   });
  200 | 
  201 |   test('步骤9: 返回列表页测试添加账户弹窗类型下拉框', async ({ page }) => {
  202 |     await setupApp(page);
  203 |     await goToAccounts(page);
  204 | 
  205 |     const addBtn = page.getByRole('button', { name: /添加账户/ });
  206 |     await expect(addBtn).toBeVisible();
  207 |     await addBtn.click();
```