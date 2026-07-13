# 持仓资产页面A股相关功能增强 - 产品需求文档

## Overview
- **Summary**: 持仓资产页面需要增强多项A股相关功能，包括资产类型列显示、A股场内股票/基金交易记录新增表单定制、图片识别人工校验等。
- **Purpose**: 提升用户在A股场内股票/基金交易记录管理的准确性和便捷性。
- **Target Users**: 个人投资者，持有A股场内股票或基金的用户。

## Goals
- 资产类型列在持仓列表中默认显示
- 当二级分类为A股、三级分类为场内、资产类型为股票或基金时，交易记录新增表单显示6个字段（类型、时间、价格、数量、金额、费用）
- 图片识别时提供人工字段校验功能，确认无误后才导入

## Non-Goals (Out of Scope)
- 其他分类的交易记录表单修改
- 实现真实交易功能
- 移动端适配优化

## Background & Context
- 当前持仓资产页面位于 `assert_WEB/src/pages/Finance.jsx`
- 资产类型列（assetType）当前默认隐藏（visible: false）
- DetailModal组件已有交易记录表单，但需要根据分类条件显示不同字段
- 图片识别校验模态框已存在，但字段布局需要优化

## Functional Requirements
- **FR-1**: 资产类型列显示 - 资产类型列在持仓列表中默认可见
- **FR-2**: A股场内股票/基金交易记录新增表单 - 当categoryL2=A股、categoryL3=场内、assetType=股票或基金时，交易记录新增表单显示6个字段：类型（买入/卖出/分红/建仓）、时间（年月日）、价格（购买价）、数量、金额（价格*数量）、费用
- **FR-3**: 图片识别人工校验 - 图片识别后显示校验模态框，用户可对每个字段进行人工校验确认，无误后点击确认导入

## Non-Functional Requirements
- **NFR-1**: 表单字段校验逻辑流畅
- **NFR-2**: 图片识别校验模态框字段布局清晰

## Constraints
- **Technical**: React + JavaScript, Tailwind CSS
- **Dependencies**: 现有Finance.jsx组件结构

## Assumptions
- 用户已安装现代浏览器（Chrome/Firefox/Edge）
- 资产数据包含categoryL2、categoryL3、assetType字段

## Acceptance Criteria

### AC-1: 资产类型列显示
- **Given**: 用户在持仓资产页面
- **When**: 页面加载完成
- **Then**: 表格中显示"资产类型"列，显示股票、基金等资产类型
- **Verification**: `human-judgment`

### AC-2: A股场内股票/基金交易记录新增表单
- **Given**: 用户打开资产明细弹窗，且该资产的categoryL2=A股、categoryL3=场内、assetType=股票或基金
- **When**: 用户点击"新增记录"
- **Then**: 显示包含6个字段的表单：类型（下拉选择：买入、卖出、分红、建仓）、日期（年月日选择）、价格（输入框）、数量（输入框）、金额（输入框，显示价格*数量）、费用（输入框）
- **Verification**: `human-judgment`

### AC-3: 图片识别人工校验
- **Given**: 用户上传交易记录图片进行识别
- **When**: 识别完成后
- **Then**: 显示识别结果校验模态框，每个识别记录的6个字段（类型、日期、价格、数量、金额、费用）均可编辑，用户确认无误后点击"确认导入"按钮完成导入
- **Verification**: `human-judgment`

## Open Questions
- [ ] 金额字段是否需要自动计算（价格*数量）？
