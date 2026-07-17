# 场外基金明细弹窗公式与字段口径规范

## Why
明细弹窗和持仓列表中"持有收益/持有收益率/持仓收益/持仓收益率"在计算口径上需要与用户业务认知保持一致，并明确标注明细字段到列表字段的对应关系，避免后续维护歧义。

## What Changes
- 明确场外基金明细弹窗与列表的字段映射关系
- 固定收益与收益率的计算公式
- 不修改后端存储结构，仅作为前端计算口径的规范

## Impact
- Affected specs: outdoor-fund-detail-calc、finance-detail-modal
- Affected code: assert_WEB/src/pages/Finance.jsx（DetailModal 组件）、assert_WEB/src/api/index.js（如有相关数据映射）

## ADDED Requirements
### Requirement: 字段对应关系（明细 ↔ 列表）
The system SHALL 按以下对应关系显示场外基金明细字段（明细在括号内，列表为外层字段名）：
- 持有收益 = 持有市值（明细「当前市值」） - 持有成本（明细「持仓成本」）
- 持有收益率 = 持有收益（明细「持仓盈亏」） / 持有成本（明细「持仓成本」） × 100%
- 持仓收益 = 持有市值（明细「当前市值」） - 持有成本（明细「持仓成本」）
- 持仓收益率 = 持仓收益 / 持仓成本 × 100%

#### Scenario: 弹窗显示校验
- **WHEN** 用户打开场外基金资产明细弹窗
- **THEN** 「持有收益」「持有收益率」与「持仓收益」「持仓收益率」按上述公式计算并与列表字段口径一致

### Requirement: 计算公式一致性
The system SHALL 保证：
- 持有收益 ≡ 持仓收益（数值一致）
- 持有收益率 ≡ 持仓收益率（数值一致）

#### Scenario: 等值校验
- **WHEN** 净值数据已加载
- **THEN** 明细弹窗中持有收益与持仓收益数值相同，持有收益率与持仓收益率数值相同

## MODIFIED Requirements
### Requirement: 场外基金明细弹窗数据计算
[继承 outdoor-fund-detail-calc 中的计算逻辑，本次仅固化口径，不修改实现]

## REMOVED Requirements
无
