import re

with open('assert_WEB/src/pages/Analysis.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={{
                    nodes: [
                      { name: '收入', color: '#10B981' },
                      ...currentCategoryData.income.slice(0, 3).map(cat => ({ name: cat.name, color: cat.color })),
                      ...currentCategoryData.expense.slice(0, 3).map(cat => ({ name: cat.name, color: cat.color })),
                      { name: '支出', color: '#EF4444' },
                    ],
                    links: [
                      ...currentCategoryData.income.slice(0, 3).map((cat, idx) => ({
                        source: 0,
                        target: idx + 1,
                        value: cat.value,
                        color: cat.color,
                      })),
                      ...currentCategoryData.expense.slice(0, 3).map((cat, idx) => ({
                        source: idx + 4,
                        target: 7,
                        value: cat.value,
                        color: cat.color,
                      })),
                    ],
                  }}
                  layout="horizontal"
                  nodeWidth={12}
                  nodeGap={8}
                  nodeLabel={{ fontSize: 10 }}
                >
                  <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                </Sankey>
              </ResponsiveContainer>
            </div>'''

new_code = '''            <div className="w-full h-[200px]">
              {(currentCategoryData.income.length > 0 || currentCategoryData.expense.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <Sankey
                    data={{
                      nodes: [
                        { name: '收入', color: '#10B981' },
                        ...currentCategoryData.income.slice(0, 3).map(cat => ({ name: cat.name, color: cat.color })),
                        ...currentCategoryData.expense.slice(0, 3).map(cat => ({ name: cat.name, color: cat.color })),
                        { name: '支出', color: '#EF4444' },
                      ],
                      links: [
                        ...currentCategoryData.income.slice(0, 3).map((cat, idx) => ({
                          source: 0,
                          target: idx + 1,
                          value: cat.value,
                          color: cat.color,
                        })),
                        ...currentCategoryData.expense.slice(0, 3).map((cat, idx) => ({
                          source: idx + 4,
                          target: 7,
                          value: cat.value,
                          color: cat.color,
                        })),
                      ],
                    }}
                    layout="horizontal"
                    nodeWidth={12}
                    nodeGap={8}
                    nodeLabel={{ fontSize: 10 }}
                  >
                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  </Sankey>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">暂无收支数据</div>
              )}
            </div>'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('assert_WEB/src/pages/Analysis.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('FIXED: Added data check for Sankey component')
else:
    print('ERROR: Could not find the code to replace')
