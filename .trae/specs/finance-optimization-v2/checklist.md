# 理财模块功能优化 - Verification Checklist

## 必填项校验
- [x] Checkpoint 1: 新增持仓时，所有必填字段为空点击保存，系统弹出提示，列出缺失的字段名称
- [x] Checkpoint 2: 编辑持仓时，清空必填字段后点击保存，系统弹出提示
- [x] Checkpoint 3: 所有必填字段填写完整后，点击保存能正常保存数据
- [x] Checkpoint 4: 提示信息使用中文友好字段名称（如"市场"而非"market"）

## CSV 导出
- [x] Checkpoint 5: 持仓列表页面显示"导出"按钮
- [x] Checkpoint 6: 设置筛选条件后点击导出，下载的 CSV 仅包含筛选结果
- [x] Checkpoint 7: CSV 文件用 Excel 打开无乱码（UTF-8 BOM）
- [x] Checkpoint 8: CSV 包含主要字段：代码、名称、市场、货币、持仓成本、现价、数量、当前市值等

## 余额显示修复
- [x] Checkpoint 9: 详情弹窗中账户余额为 90.85 时，显示为 ¥90.850 正数
- [x] Checkpoint 10: 余额颜色根据正负正确显示（蓝色/红色）
- [x] Checkpoint 11: 格式化函数对正数不添加多余负号

## 负份额交易
- [x] Checkpoint 12: 添加 -30 股交易记录后，总份额正确减少
- [x] Checkpoint 13: 负份额交易自动增加账户余额
- [x] Checkpoint 14: 负份额导致归零自动归档
- [x] Checkpoint 15: 负份额交易在交易记录列表中正确显示

## 货币基金详情弹窗
- [x] Checkpoint 16: 货币基金持仓点击详情，弹窗显示 7 日年化、万份收益等专用字段
- [x] Checkpoint 17: 非货币基金持仓详情不显示货币基金专用字段
- [x] Checkpoint 18: 分红方式字段显示，默认值为"红利再投"
- [x] Checkpoint 19: 原有通用字段（持仓天数、交易税费、交易记录）正常显示

## 货币基金计算逻辑
- [x] Checkpoint 20: 货币基金现价字段默认值为 1
- [x] Checkpoint 21: 持有收益 = 1 × 份额 - 成本单价 × 份额 计算正确
- [x] Checkpoint 22: 持仓列表中货币基金现价列显示为 ¥1.000
- [x] Checkpoint 23: 万份收益字段支持输入和显示
