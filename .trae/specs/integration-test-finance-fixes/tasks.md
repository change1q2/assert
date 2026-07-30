# 理财模块修复后集成测试 - 任务列表

## [x] Task 1: 登录系统
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 访问 http://localhost:5173
  - 使用 SuperAdmin / Super12345 登录
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 登录成功后跳转到系统主页
  - `programmatic` TR-1.2: 顶部导航栏显示用户名

## [ ] Task 2: 测试建仓现金扣减
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 进入理财模块
  - 点击"新增持仓"
  - 创建新持仓：资产分类一级=权益类，资产类型=股票，市场=国内市场，所属账户=test，资产名称=现金测试股，代码=000099，成本价=10.00，数量=100，现价=10.00
  - 保存持仓
  - 打开明细弹窗，查看建仓交易记录是否关联了现金账户
  - 截图
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 持仓创建成功并显示在列表中
  - `programmatic` TR-2.2: 明细弹窗中交易记录关联了现金账户
  - `human-judgement` TR-2.3: 截图显示交易记录和关联账户信息

## [ ] Task 3: 测试清仓归档
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 在明细弹窗中点击添加交易记录
  - 类型选择"清仓"，日期=今天，价格=12.00，数量=100，金额=1200，手续费=5
  - 保存交易记录
  - 检查：交易记录是否成功保存、持仓是否已归档
  - 回到理财主页面，切换到"归档持仓"标签查看数据
  - 截图归档列表
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 交易记录保存成功
  - `programmatic` TR-3.2: 持仓状态变为 archived
  - `programmatic` TR-3.3: 归档列表中显示该记录
  - `human-judgement` TR-3.4: 截图显示归档持仓列表

## [ ] Task 4: 测试现金账户
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 进入账户管理页面
  - 检查是否有自动创建的现金账户
  - 查看余额变化
  - 截图
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 现金账户存在
  - `programmatic` TR-4.2: 余额反映交易结果
  - `human-judgement` TR-4.3: 截图显示现金账户和余额

## [ ] Task 5: 测试卖出部分持仓
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 回到理财模块，新增持仓：资产名称=部分卖出测试，代码=000098，成本价=10，数量=200，现价=10，所属账户=test
  - 保存持仓
  - 打开明细，添加卖出交易：类型=卖出，数量=50，价格=11，金额=550，手续费=5
  - 保存交易
  - 检查：持仓是否仍在活跃列表（剩余150/200）
  - 截图
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 持仓创建成功
  - `programmatic` TR-5.2: 卖出交易保存成功
  - `programmatic` TR-5.3: 持仓仍在活跃列表，剩余数量=150
  - `human-judgement` TR-5.4: 截图显示持仓仍在活跃列表

## [ ] Task 6: 验证交易记录关联
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 在明细弹窗中查看交易记录
  - 确认每条交易记录显示"关联账户"信息
  - 截图
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-6.1: 截图显示交易记录的关联账户信息
