# 分页样式改造与场外基金数据修复 - 验证清单

- [x] Checkpoint 1: 交易记录分页左侧显示"共X条记录"（X为实际记录数）
- [x] Checkpoint 2: 交易记录分页支持每页条数下拉选择（5/10/20/50）
- [x] Checkpoint 3: 切换每页条数后，交易记录列表和分页正确更新
- [x] Checkpoint 4: 持仓明细（CategoryTable）分页左侧显示"共X条记录"
- [x] Checkpoint 5: 后端 `/api/finance/fund-nav` 接口返回的数据包含非 null 的 `prevNav`
- [x] Checkpoint 6: 页面加载后，场外基金资产的 `stateData.financeAssets[i].prevPrice` > 0
- [x] Checkpoint 7: 打开场外基金明细弹窗，昨日收益显示非0值（份额 × (currentPrice - prevPrice)）
- [x] Checkpoint 8: 打开场外基金明细弹窗，持仓收益显示正确值（currentValue - costTotal）
- [x] Checkpoint 9: 打开场外基金明细弹窗，日涨幅显示正确值（(currentPrice - prevPrice) / prevPrice × 100%）
- [x] Checkpoint 10: 明细弹窗中"最新净值"下方显示"数据获取时间: 同步天天基金网 MM月DD日"
- [x] Checkpoint 11: 前端 `npm run build` 构建成功无错误
