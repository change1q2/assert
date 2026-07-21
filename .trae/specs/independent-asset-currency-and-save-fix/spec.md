# 独立资产货币单位与保存修复 - Product Requirement Document

## Overview
- **Summary**: 为独立资产所有表单增加货币单位选择功能，并修复新增保单保存无效果的bug
- **Purpose**: 1）用户需要在不同资产中记录不同货币单位的金额；2）当前保险资产新增保单点击保存无反应，导致无法正常使用
- **Target Users**: 所有使用独立资产模块的用户

## Goals
- 修复保险资产新增/编辑保存无效果的bug
- 为所有独立资产类型（保险、房产、车辆、固定投资、股权、定期存）的表单增加货币单位选择
- 金额字段显示对应货币符号
- 货币单位选项包含：CNY（人民币）、USD（美元）、HKD（港币）、JPY（日元）、EUR（欧元）、GBP（英镑）
- 默认货币单位为 CNY

## Non-Goals (Out of Scope)
- 不做汇率转换
- 不修改汇总统计的货币显示（汇总仍按数字累加）
- 不修改后端数据库schema（数据存在 state JSON 中即可）

## Background & Context
- 保险资产表单最近重构为新的字段结构（policyNumber, policyName 等），可能导致保存逻辑有问题
- 用户有管理多币种资产的需求（如港股保单、美元保单等）
- 现有 `fixeddeposit` 类型已经有 `currency` 字段，可以参考

## Functional Requirements
- **FR-1**: 修复保险资产新增/编辑保存功能，点击保存后数据正确写入列表
- **FR-2**: 所有独立资产类型表单新增"货币单位"下拉选择字段（CNY, USD, HKD, JPY, EUR, GBP）
- **FR-3**: 金额列表列显示对应货币符号（如¥200,000 或 $50,000）
- **FR-4**: 默认货币单位为 CNY
- **FR-5**: 货币单位在列表中有单独列展示
- **FR-6**: 编辑时货币单位正确回显

## Non-Functional Requirements
- **NFR-1**: 暗色模式兼容
- **NFR-2**: 所有资产类型保持UI风格一致
- **NFR-3**: 向后兼容，没有货币字段的旧数据默认显示为 CNY

## Constraints
- **Technical**: React + Vite + Tailwind CSS
- **Storage**: 数据存储在 state JSON 中，无需修改后端schema

## Assumptions
- 保存无效果的原因是表单字段名与数据结构不匹配导致的问题
- 货币单位信息作为字符串字段存储在每个资产对象中（字段名 `currency`）

## Acceptance Criteria

### AC-1: 保险资产保存功能修复
- **Given**: 用户在保险资产标签页点击"新增"
- **When**: 填写表单并点击"保存"
- **Then**: 弹窗关闭，新保单项正确显示在列表中
- **Verification**: `human-judgment`

### AC-2: 货币单位选择字段
- **Given**: 用户打开任意独立资产类型的新增/编辑表单
- **When**: 查看表单
- **Then**: 表单中有"货币单位"下拉选择字段，选项为 CNY/USD/HKD/JPY/EUR/GBP
- **Verification**: `human-judgment`

### AC-3: 金额显示货币符号
- **Given**: 用户选择了非人民币的货币单位并保存
- **When**: 查看列表中的金额列
- **Then**: 金额前显示对应货币符号（¥ $ HK$ ¥ € £）
- **Verification**: `human-judgment`

### AC-4: 货币单位列表列
- **Given**: 用户查看任意独立资产列表
- **When**: 查看列表表头
- **Then**: 有"币种"列，显示每条记录的货币单位
- **Verification**: `human-judgment`

### AC-5: 默认值和编辑回显
- **Given**: 用户新增资产
- **When**: 打开表单
- **Then**: 货币单位默认为 CNY
- **Verification**: `human-judgment`

### AC-6: 旧数据兼容
- **Given**: 存在没有 currency 字段的旧数据
- **When**: 加载列表
- **Then**: 旧数据默认显示为 CNY
- **Verification**: `human-judgment`

## Open Questions
- 无
