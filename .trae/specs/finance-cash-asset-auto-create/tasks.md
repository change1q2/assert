# Tasks

- [ ] Task 1: 明细弹窗账户余额卡片 UI
  - [ ] SubTask 1.1: 在 DetailModal 顶部信息区域增加账户余额卡片（位于浮动盈亏卡片下方）
  - [ ] SubTask 1.2: 从 stateData.accounts 中按 latestData.account/accountId 匹配获取余额
  - [ ] SubTask 1.3: 卡片样式与现有浮动盈亏卡片一致，余额为负时显示红色
  - [ ] SubTask 1.4: 交易保存后卡片实时刷新（依赖 stateData 更新）

- [ ] Task 2: 交易记录保存时关联账户余额联动
  - [ ] SubTask 2.1: 在 handleAddRecord（DetailModal 内）保存交易后调用 updateAccountBalance
  - [ ] SubTask 2.2: 在 handleSaveAccount（主组件内）保存新建资产时调用 updateAccountBalance
  - [ ] SubTask 2.3: 确保买入/建仓时余额减少量 = 金额 + 费用，卖出/清仓时余额增加量 = 金额 - 费用
  - [ ] SubTask 2.4: 分红交易不影响关联账户余额

- [ ] Task 3: 新建资产时自动创建现金类持仓资产
  - [ ] SubTask 3.1: 在 handleSaveAccount 中保存前检查关联账户下是否已有 categoryL1 === '现金类' 的持仓
  - [ ] SubTask 3.2: 若不存在，按规范生成现金类资产数据（名称、代码、分类、成本、数量等）
  - [ ] SubTask 3.3: 资产代码生成逻辑：{账户名称}01，已存在则顺延 02、03...
  - [ ] SubTask 3.4: 市场与货币与新建资产一致，二级分类按市场映射（国内→A股、港股→港股、美股→美股）
  - [ ] SubTask 3.5: 将现金类资产一并存入 financeAssets，然后统一 saveState

- [ ] Task 4: 验证与边界处理
  - [ ] SubTask 4.1: 确保不重复创建现金类资产（幂等性检查）
  - [ ] SubTask 4.2: 验证明细弹窗中余额卡片在交易后实时更新
  - [ ] SubTask 4.3: 验证买入/卖出后关联账户余额正确增减
  - [ ] SubTask 4.4: vite build 构建通过，无语法错误
  - [ ] SubTask 4.5: 本地运行验证（前后端服务启动，功能点逐一测试）

# Task Dependencies
- Task 2 依赖 Task 1（余额卡片先展示，再验证联动后更新）
- Task 3 可独立于 Task 1/2 并行开发
- Task 4 依赖 Task 1、Task 2、Task 3 全部完成
