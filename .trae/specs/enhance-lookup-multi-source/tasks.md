# 搜索增强-多数据源全网匹配 - 任务计划

- [x] Task 1: 后端 lookupSecurities 增加腾讯直接查询
  - [x] 在 `finance-service.js` 中修改 `lookupSecurities` 函数
  - [x] 东方财富搜索后，若输入是纯 6 位数字且结果为空/不足，调用腾讯接口 `http://qt.gtimg.cn/q=shXXXXXX,szXXXXXX`
  - [x] 解析腾讯返回，提取名称和价格，构造搜索候选项
  - [x] 同时调用同花顺搜索 API 补充结果（如果可用）

- [x] Task 2: 后端 lookupSecurities 增加同花顺搜索
  - [x] 调用同花顺搜索接口 `http://searchapi.10jqka.com.cn/...` 或模拟搜索
  - [x] 解析返回结果，提取代码和名称
  - [x] 合并去重后返回

- [x] Task 3: 前端搜索过滤优化
  - [x] 修改 `handleSearchInput`：不过滤 Index 类型（显示所有类型）
  - [x] 修改添加按钮逻辑：只要输入格式有效（6位数字或 sh/sz 前缀），即使搜索无结果也允许添加
  - [x] 优化提示文字："无匹配项，可直接按代码添加"

- [x] Task 4: 构建验证与测试
  - [x] npm run build 成功无报错
  - [x] 测试搜索 159943 能返回结果
  - [x] 测试搜索 510100 能返回结果
  - [x] 测试无搜索结果时仍可直接添加代码

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 独立可并行
- Task 4 依赖 Task 1-3
