# 理财模块性能优化与编码修复 - 验证清单

## 性能优化检查点
- [x] Checkpoint 1: 理财模块首屏在 2 秒内完成基础数据渲染（loading 状态消失）
- [x] Checkpoint 2: 当前页 10 条数据的行情在 3 秒内显示完整（现价、涨跌幅等字段有值）
- [x] Checkpoint 3: 非当前页数据在 8 秒内陆续加载完毕
- [x] Checkpoint 4: 页面切换到其他功能不受后台加载影响

## 编码修复检查点
- [x] Checkpoint 5: 资产种类下拉选项中无"??"乱码项
- [x] Checkpoint 6: 行情返回后，资产名称、市场、资产种类等"??"字段被自动替换为正确中文
- [x] Checkpoint 7: 后端行情解码（GBK/GB18030）添加了 fallback 机制
- [x] Checkpoint 8: safeDecode 工具函数在后端正确实现，覆盖所有 GBK 解码场景
- [x] Checkpoint 9: 全局页面（Overview, Accounts, Finance, IndependentAssets 等）中文字段无"??"显示
- [x] Checkpoint 10: localStorage 中存储的选项数据经过去重和"??"清理

## 余额一致性检查点
- [x] Checkpoint 11: 账户余额为正数时，资产列表中的市值/余额计算结果不为负
- [x] Checkpoint 12: 账户余额为负数时，允许新增资产操作成功
- [x] Checkpoint 13: 移除了 `Math.max(0, ...)` 强制非负逻辑后，余额显示与实际一致
- [x] Checkpoint 14: 资产列表中现金类资产的 currentValue 正确反映余额（包括负值）

## 构建与部署检查点
- [x] Checkpoint 15: `npm run build` 无错误通过
- [x] Checkpoint 16: 版本号正确更新到 V1.0.42
- [x] Checkpoint 17: 构建产物大小与前版本对比在 ±5% 以内
- [x] Checkpoint 18: 启动开发服务器后所有功能正常可用
