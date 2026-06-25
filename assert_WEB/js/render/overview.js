function overview(data) {
  const dashboard = overviewDashboardData(data);
  return `
    <div class="overview-dashboard">
      <section class="overview-card asset-value" title="计算公式：总资产价值 = Σ(各资产分类当前价值)">
        <span>总资产价值</span>
        <strong>${formatPlainNumber(dashboard.totalAssetValue)}</strong>
        <small>= Σ(资产分类当前价值)</small>
      </section>
      <section class="overview-card progress-goal">
        <div class="progress-goal-head">
          <h2>进度目标</h2>
          <button class="goal-edit-btn" data-action="edit-goals" title="编辑目标">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            编辑
          </button>
        </div>
        <div class="overview-rate-line">
          <span>今年收益额</span>
          <strong class="${dashboard.annualNetGrowth >= 0 ? 'income' : 'expense'}">${money(dashboard.annualNetGrowth)}</strong>
          <span class="overview-rate-divider">|</span>
          <span>今年收益率</span>
          <strong class="${dashboard.annualRate >= 0 ? 'income' : 'expense'}">${percent(dashboard.annualRate)}</strong>
        </div>
        <div class="goal-grid">
          ${dashboard.goals.map(g => `
            <div class="goal-item${g.pct >= 100 ? ' goal-done' : ''}">
              <div class="goal-item-head">
                <span class="goal-item-label">${g.label}</span>
                ${g.pct >= 100
                  ? '<span class="goal-done-badge">已完成</span>'
                  : `<span class="goal-item-pct">${g.pct.toFixed(1)}%</span>`}
              </div>
              <div class="goal-bar-track">
                <i style="--width:${Math.min(g.pct, 100)}%;--tone:${g.pct >= 100 ? '#10b981' : g.pct >= 50 ? '#6366f1' : '#f59e0b'}"></i>
              </div>
              <div class="goal-item-sub">${g.isRate ? `${g.current.toFixed(2)}% / ${g.target.toFixed(2)}%` : `${money(g.current)} / ${money(g.target)}`}</div>
            </div>
          `).join('')}
        </div>
        <div class="annual-goal-progress">
          <div class="annual-goal-progress-head">
            <h3>每年完成情况</h3>
            <span>年度收益目标 = 期初资产 × 目标年化收益率</span>
            <button class="goal-add-btn" data-action="add-annual-goal" title="新增年份">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增年份
            </button>
          </div>
          <div class="annual-goal-table-wrap">
            <table class="annual-goal-table">
              <thead><tr><th>年份</th><th>期初资产</th><th>目标收益额</th><th>实际收益额</th><th>实际收益率</th><th>完成率</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>${dashboard.annualGoalRows.map((row) => `<tr>
                <td>${row.year}</td>
                <td>${money(row.opening)}</td>
                <td>${money(row.targetProfit)}</td>
                <td class="${row.actualProfit >= 0 ? "income" : "expense"}">${money(row.actualProfit)}</td>
                <td class="${row.actualRate >= 0 ? "income" : "expense"}">${percent(row.actualRate)}</td>
                <td><div class="annual-completion-cell"><span>${row.completion.toFixed(1)}%</span><i><b style="--width:${Math.min(Math.max(row.completion, 0), 100)}%"></b></i></div></td>
                <td><span class="annual-goal-status ${row.statusClass}">${row.status}</span></td>
                <td class="annual-goal-actions">
                  <button data-action="edit-annual-goal" data-year="${row.year}" title="编辑">编辑</button>
                  <button data-action="delete-annual-goal" data-year="${row.year}" title="删除">删除</button>
                </td>
              </tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      </section>
      <!-- 第一行：基础收支 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：今年总收入 = 收支分析中的今年收入">
          <span>今年总收入</span>
          <strong class="${dashboard.totalIncome >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.totalIncome)}</strong>
          <small>= 收支分析今年收入</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年净收入 = 今年总收入 - 今年总支出">
          <span>今年净收入</span>
          <strong class="${dashboard.yearNetIncome >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.yearNetIncome)}</strong>
          <small>= 总收入 - 总支出</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年总支出 = 收支分析中的今年支出">
          <span>今年总支出</span>
          <strong class="expense">${formatPlainNumber(dashboard.totalExpense)}</strong>
          <small>= 收支分析今年支出</small>
        </div>
      </section>

      <!-- 第二行：收支分析 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：今年总收支 = 今年总收入 - 今年总消费">
          <span>今年总收支</span>
          <strong class="${dashboard.incomeExpenseBalance >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.incomeExpenseBalance)}</strong>
          <small>= 总收入 - 总消费</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年总消费 = Σ(所有一级分类的消费总额)">
          <span>今年总消费</span>
          <strong class="expense">${formatPlainNumber(dashboard.consumptionTotal)}</strong>
          <small>= Σ(一级分类消费)</small>
        </div>
      </section>

      <!-- 第三行：理财分析 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：今年总盈利 = Σ(今年理财资产盈利部分)">
          <span>今年总盈利</span>
          <strong class="${dashboard.financeIncome >= 0 ? 'income' : 'expense'}">${formatPlainNumber(dashboard.financeIncome)}</strong>
          <small>= Σ(理财盈利资产)</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：今年总亏损 = Σ(今年理财资产亏损部分)">
          <span>今年总亏损</span>
          <strong class="expense">${formatPlainNumber(dashboard.financeLoss)}</strong>
          <small>= Σ(理财亏损资产)</small>
        </div>
      </section>

      <!-- 第四行：债务分析 -->
      <section class="overview-card overview-stat-row">
        <div class="overview-stat-item" title="计算公式：债务总额 = Σ(所有应付债务的本金 + 利息)">
          <span>债务总额</span>
          <strong class="expense">${formatPlainNumber(dashboard.debtTotalAmount)}</strong>
          <small>= Σ(债务本金 + 利息)</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：债务本金 = Σ(所有应付债务的本金)">
          <span>债务本金</span>
          <strong class="expense">${formatPlainNumber(dashboard.debtTotalPrincipal)}</strong>
          <small>= Σ(债务本金)</small>
        </div>
        <div class="overview-stat-divider"></div>
        <div class="overview-stat-item" title="计算公式：债务总利息 = Σ(所有应付债务的利息)">
          <span>债务总利息</span>
          <strong class="expense">${formatPlainNumber(dashboard.debtTotalInterest)}</strong>
          <small>= Σ(债务利息)</small>
        </div>
      </section>

      ${overviewPieCard("收入占比", dashboard.incomeRatio)}
      ${overviewPieCard("支出占比", dashboard.expenseRatio)}
      ${overviewDonutCard("负债占比", dashboard.debtRatio, formatPlainNumber(dashboard.debtTotalAmount), "债务总额", dashboard.debtWarning)}

      ${assetGrowthLineCard(dashboard.assetGrowth)}
      ${annualAssetChangeCard(dashboard.annualChange)}
    </div>`;
}
