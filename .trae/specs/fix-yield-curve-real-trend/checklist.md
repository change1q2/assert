# 收益率曲线真实趋势与时间轴倒序 - 验证清单

- [x] Checkpoint 1: 指数收益率计算逻辑修改为真实涨跌幅度（idxRate = (close - firstClose) / firstClose * 100）
- [x] Checkpoint 2: 用户收益线保持从 0% 到 currentPnlRate 的线性缩放
- [x] Checkpoint 3: Y轴刻度正确显示指数真实涨跌幅度（如 -2%、+3%）
- [x] Checkpoint 4: Y轴刻度方向正确（负值在下、正值在上）
- [x] Checkpoint 5: X轴时间标签显示 MM-DD 格式
- [x] Checkpoint 6: X轴时间标签从左到右时间递增（最早日期在左边）
- [x] Checkpoint 7: 切换指数后曲线图正确显示新标的的涨跌幅度
- [x] Checkpoint 8: npm run build 成功无报错
- [x] Checkpoint 9: 浏览器测试：指数涨跌幅度与右端点收益率一致
- [x] Checkpoint 10: 浏览器测试：时间轴按 MM-DD 倒序排列