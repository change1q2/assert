# 场内穿透收益率曲线与指数对比 - 任务计划

- [x] Task 1: 后端新增指数历史数据获取接口
  - [x] 在 finance-service.js 中新增 getIndexHistory 函数
  - [x] A股指数优先使用 tencent/mootdx 获取历史K线，fallback 到 eastmoney
  - [x] 美股/港股指数使用 eastmoney 获取历史K线
  - [x] 返回格式：{code, history: [{date, open, high, low, close, changePct}]}
  - [x] 在 finance.js 路由中添加 /api/finance/index-history GET 接口

- [x] Task 2: 前端获取指数历史数据
  - [x] 在 AssetPenetration.jsx 中通过 fetch(`/api/finance/index-history?code=${code}&count=${count}`) 获取数据
  - [x] 处理错误和 loading 状态

- [x] Task 3: 构建收益率曲线组件
  - [x] 在 AssetPenetration.jsx 中内嵌 SVG 图表实现
  - [x] 支持双折线绘制（用户收益线红色、指数线蓝色）
  - [x] X轴日期、Y轴收益率百分比
  - [x] 鼠标悬停 tooltip 显示日期和收益率
  - [x] 图例「用户收益」「指数」
  - [x] 最大收益标注（绿色圆圈+文字）
  - [x] 最大回撤标注（红色圆圈+文字）

- [x] Task 4: 时间区间切换功能
  - [x] 添加时间区间按钮组：当日、本月、近三月、今年、全部、自定义
  - [x] 点击「自定义」弹出日期范围选择器
  - [x] 切换区间时重新获取指数数据并刷新曲线
  - [x] 默认选中「本月」

- [x] Task 5: 指数选择与切换功能
  - [x] 添加快捷标签：上证、深证、创业板、上证50、沪深300、中证500、纳斯达克、标普500
  - [x] 自定义指数输入框 + 确定按钮
  - [x] 切换指数时异步获取新数据并刷新曲线
  - [x] 默认选中「上证」

- [x] Task 6: 曲线/K线视图切换
  - [x] 添加「曲线」「K线」切换按钮
  - [x] 曲线模式：双折线（用户收益 + 指数）
  - [x] K线模式：指数K线柱状图（红涨绿跌）

- [x] Task 7: 用户收益率近似计算逻辑
  - [x] 获取指数历史收益率序列
  - [x] 按当前总持仓收益率进行线性缩放生成用户收益线
  - [x] 起点为0%，终点等于当前总持仓收益率

- [x] Task 8: 集成到资产穿透页面
  - [x] 在 AssetPenetration.jsx 中收益率曲线区域已内嵌实现
  - [x] 样式与现有页面一致（圆角卡片、阴影、边框）
  - [x] 响应式布局适配

- [x] Task 9: 构建验证与浏览器测试
  - [x] npm run build 成功无报错
  - [x] 浏览器测试：切换时间区间、切换指数、曲线/K线切换、自定义指数输入
  - [x] 验证用户收益线终点等于当前总收益率
  - [x] 验证指数线使用真实历史数据
  - [x] 响应式布局在不同屏幕宽度下正常显示

- [x] Task 10: 收益率曲线时间轴刻度规范化
  - [x] 添加 getYieldCurveData 辅助函数，统一生成曲线图和K线图的数据与标签
  - [x] 当日模式生成 9:30-15:00 的7个时间刻度（模拟分时走势）
  - [x] 本月模式每7天显示一个 MM-DD 刻度
  - [x] 近三月模式每月1日显示一个 MM-DD 刻度
  - [x] 今年模式从今年1月到当前月每月1日显示一个 MM-DD 刻度
  - [x] 全部/自定义模式每月1日显示一个刻度
  - [x] 修改曲线图和K线图的X轴标签渲染，避免标签重叠
  - [x] 构建验证通过

# Task Dependencies
- Task 3 depends on Task 1, Task 2
- Task 4, Task 5, Task 6, Task 7 可并行开发
- Task 8 depends on Task 3, Task 4, Task 5, Task 6, Task 7
- Task 9 depends on Task 8
