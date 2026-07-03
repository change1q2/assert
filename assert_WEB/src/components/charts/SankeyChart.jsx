import { useState, useEffect } from 'react';

export default function SankeyChart({ data }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const totalIncome = data.income || 0;
  const totalExpense = data.expense || 0;
  const balance = totalIncome - totalExpense;
  
  const maxValue = Math.max(totalIncome, totalExpense, Math.abs(balance));
  const width = 600;
  const height = 200;
  const nodeWidth = 30;
  const nodeGap = 80;
  
  const getWidth = (value) => {
    if (maxValue === 0) return 50;
    return Math.max(50, (Math.abs(value) / maxValue) * (width - nodeWidth * 3 - nodeGap * 2));
  };

  const incomeColor = '#10B981';
  const expenseColor = '#EF4444';
  const balanceColor = balance >= 0 ? '#10B981' : '#EF4444';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full h-[300px] flex items-center justify-center">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
        <defs>
          <linearGradient id="incomeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={balanceColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={balanceColor} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y={height / 2 - 20}
          width={nodeWidth}
          height="40"
          fill={incomeColor}
          rx="4"
        />
        <text
          x={nodeWidth / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="600"
        >
          收入
        </text>

        <rect
          x={width - nodeWidth}
          y={height / 2 - 20}
          width={nodeWidth}
          height="40"
          fill={balanceColor}
          rx="4"
        />
        <text
          x={width - nodeWidth / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="600"
        >
          结余
        </text>

        <rect
          x={width / 2 - nodeWidth / 2}
          y={height / 2 - 20}
          width={nodeWidth}
          height="40"
          fill={expenseColor}
          rx="4"
        />
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="600"
        >
          支出
        </text>

        <g className="flow-paths">
          <path
            d={`M ${nodeWidth} ${height / 2} 
                C ${nodeWidth + getWidth(totalIncome) / 3} ${height / 2 - 30}, 
                  ${width / 2 - nodeWidth - getWidth(totalExpense) / 3} ${height / 2 - 30},
                  ${width / 2 - nodeWidth} ${height / 2}`}
            fill="none"
            stroke={incomeColor}
            strokeWidth="24"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
          
          <path
            d={`M ${width / 2 + nodeWidth} ${height / 2} 
                C ${width / 2 + nodeWidth + getWidth(totalExpense) / 3} ${height / 2 + 30}, 
                  ${width - nodeWidth - getWidth(Math.abs(balance)) / 3} ${height / 2 + 30},
                  ${width - nodeWidth} ${height / 2}`}
            fill="none"
            stroke={expenseColor}
            strokeWidth="24"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />

          {balance !== 0 && (
            <path
              d={`M ${nodeWidth} ${height / 2} 
                  C ${nodeWidth + getWidth(Math.abs(balance)) / 2} ${height / 2}, 
                    ${width - nodeWidth - getWidth(Math.abs(balance)) / 2} ${height / 2},
                    ${width - nodeWidth} ${height / 2}`}
              fill="none"
              stroke={balanceColor}
              strokeWidth={Math.max(4, Math.abs(balance) / maxValue * 16)}
              strokeOpacity="0.8"
              strokeDasharray="8,4"
              strokeLinecap="round"
            />
          )}
        </g>

        <text
          x={nodeWidth / 2}
          y={height / 2 + 45}
          textAnchor="middle"
          fill={isDark ? '#D1D5DB' : '#374151'}
          fontSize="12"
        >
          {formatCurrency(totalIncome)}
        </text>

        <text
          x={width / 2}
          y={height / 2 + 45}
          textAnchor="middle"
          fill={isDark ? '#D1D5DB' : '#374151'}
          fontSize="12"
        >
          {formatCurrency(totalExpense)}
        </text>

        <text
          x={width - nodeWidth / 2}
          y={height / 2 + 45}
          textAnchor="middle"
          fill={isDark ? '#D1D5DB' : '#374151'}
          fontSize="12"
        >
          {formatCurrency(balance)}
        </text>
      </svg>
    </div>
  );
}