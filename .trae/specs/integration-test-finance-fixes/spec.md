# 理财模块修复后集成测试 PRD

## Overview
- **Summary**: 对理财模块的现金扣减、清仓归档、现金账户、部分卖出、交易记录关联等功能进行端到端集成测试，验证修复代码的正确性。
- **Purpose**: 确保修复后的理财模块在真实浏览器环境下各核心场景工作正常，验证买入扣减现金、清仓归档、卖出增加现金、交易记录关联账户等功能闭环。
- **Target Users**: 个人资产管理系统的 QA 测试人员。

## Goals
- 验证登录流程正常
- 验证建仓时现金账户扣减正确
- 验证清仓后持仓自动归档
- 验证自动创建现金账户功能
- 验证部分卖出后持仓仍活跃
- 验证交易记录显示关联账户信息

## Non-Goals (Out of Scope)
- 不修改代码实现
- 不进行性能压测
- 不测试非理财模块的功能
- 不清除 localStorage 数据

## Background & Context
- 应用地址: http://localhost:5173
- 前端: React + Ant Design + Tailwind CSS
- 后端: Node.js + MySQL
- 已有修复: 明细弹窗可点击、清仓归档、现金账户联动、交易记录关联

## Functional Requirements

### FR-1: 登录验证
- 使用 SuperAdmin / Super12345 登录系统
- 验证登录后进入正确页面

### FR-2: 建仓现金扣减
- 新增持仓时选择所属账户
- 保存建仓记录后现金账户余额应扣减
- 明细弹窗中交易记录应关联现金账户

### FR-3: 清仓归档
- 对持仓添加清仓交易记录
- 清仓后持仓自动归档
- 归档列表中可查看该记录

### FR-4: 现金账户验证
- 账户管理中存在自动创建的现金账户
- 现金账户余额变动正确

### FR-5: 部分卖出
- 对持仓进行部分卖出（数量 < 持仓数量）
- 持仓仍在活跃列表中

### FR-6: 交易记录关联
- 每条交易记录显示关联账户信息

## Non-Functional Requirements

### NFR-1: 数据完整性
- 测试过程中不清除 localStorage
- 所有测试数据正确保存和读取

### NFR-2: 可重复性
- 测试步骤可重复执行
- 结果可验证

## Constraints
- **技术**: 浏览器自动化测试
- **数据**: 使用测试账户 test，测试资产名称以"现金测试股"、"部分卖出测试"标识
- **环境**: http://localhost:5173

## Assumptions
- 后端服务正常运行
- 数据库连接正常
- 测试账户 test 已存在
- 浏览器自动化工具可用

## Acceptance Criteria

### AC-1: 登录成功
- **Given**: 用户在登录页面
- **When**: 输入 SuperAdmin / Super12345 并点击登录
- **Then**: 成功进入系统主页
- **Verification**: `programmatic`

### AC-2: 建仓现金扣减
- **Given**: 用户在理财模块且已登录
- **When**: 新增持仓并保存建仓记录
- **Then**: 现金账户余额扣减对应金额，交易记录关联现金账户
- **Verification**: `programmatic`

### AC-3: 清仓归档
- **Given**: 用户持有某个活跃持仓
- **When**: 添加清仓交易记录
- **Then**: 持仓自动归档，归档列表可查看
- **Verification**: `programmatic`

### AC-4: 现金账户存在且余额正确
- **Given**: 已完成建仓和清仓操作
- **When**: 进入账户管理页面
- **Then**: 存在自动创建的现金账户，余额反映交易结果
- **Verification**: `programmatic`

### AC-5: 部分卖出后持仓仍活跃
- **Given**: 用户持有 200 股的持仓
- **When**: 卖出 50 股
- **Then**: 持仓仍在活跃列表，剩余数量为 150
- **Verification**: `programmatic`

### AC-6: 交易记录显示关联账户
- **Given**: 用户查看持仓明细的交易记录
- **When**: 查看交易记录列表
- **Then**: 每条记录显示关联账户信息
- **Verification**: `human-judgment`

## Open Questions
- 无
