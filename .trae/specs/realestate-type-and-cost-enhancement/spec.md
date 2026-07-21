# 房产资产类型下拉与自用字段增强 - Product Requirement Document

## Overview
- **Summary**: 房产类型改为可管理的下拉选项，并为自用模式增加每平方米价格、面积、税费、中介费字段，购买价自动计算
- **Purpose**: 用户需要标准化的房产类型管理，以及更详细的自用房产成本计算
- **Target Users**: 拥有多套房产的资产管理者

## Goals
- 房产类型改为纯下拉选项，禁止手动输入
- 支持增删改类型选项
- 自用模式增加每平方米价格、面积、税费、中介费字段
- 购买价自动计算 = 每平方米价格 × 面积
- 新增字段显示在列表中

## Non-Goals (Out of Scope)
- 不修改其他资产类型的表单
- 不做批量导入功能

## Background & Context
- 当前类型字段使用 input+datalist，用户可以自由输入任意值
- 用户需要标准化的类型管理，避免数据混乱
- 自用房产需要更详细的成本记录

## Functional Requirements
- **FR-1**: 类型字段改为纯下拉选择（select），禁止手动输入
- **FR-2**: 支持增删改类型选项
- **FR-3**: 自用模式增加"每平方米价格"字段（数字输入）
- **FR-4**: 自用模式增加"面积"字段（数字输入，单位：平方米）
- **FR-5**: 自用模式增加"税费"字段（数字输入）
- **FR-6**: 自用模式增加"中介费"字段（数字输入）
- **FR-7**: 购买价自动计算 = 每平方米价格 × 面积，不可手动修改
- **FR-8**: 列表新增每平方米价格、面积、税费、中介费列

## Non-Functional Requirements
- **NFR-1**: 暗色模式兼容
- **NFR-2**: 类型选项数据持久化（保存到 localStorage）
- **NFR-3**: 自动计算实时更新

## Constraints
- **Technical**: React + Vite + Tailwind CSS
- **Storage**: 类型选项存储在 localStorage 或 state 中

## Assumptions
- 类型选项存储在 localStorage 的 `realestateTypes` key 中
- 初始类型选项：住宅、工厂、商铺、公寓
- 面积单位为平方米

## Acceptance Criteria

### AC-1: 类型纯下拉选择
- **Given**: 用户打开房产新增/编辑表单
- **When**: 查看类型字段
- **Then**: 显示为纯下拉选择，不能手动输入
- **Verification**: `human-judgment`

### AC-2: 类型选项管理
- **Given**: 用户打开房产表单
- **When**: 查看类型下拉
- **Then**: 有管理类型选项的入口（如"管理类型"按钮），可以增删改选项
- **Verification**: `human-judgment`

### AC-3: 自用模式新增字段
- **Given**: 方式选择"自用"
- **When**: 查看表单
- **Then**: 显示每平方米价格、面积、税费、中介费字段
- **Verification**: `human-judgment`

### AC-4: 购买价自动计算
- **Given**: 输入每平方米价格和面积
- **When**: 输入完成
- **Then**: 购买价自动显示 = 每平方米价格 × 面积，为只读状态
- **Verification**: `human-judgment`

### AC-5: 列表新增字段
- **Given**: 查看房产列表
- **When**: 查看表头
- **Then**: 新增每平方米价格、面积、税费、中介费列
- **Verification**: `human-judgment`

## Open Questions
- 类型选项管理弹窗的位置和样式？
- 购买价只读时是否需要显示计算公式提示？
