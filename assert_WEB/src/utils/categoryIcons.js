export const CATEGORY_ICON_OPTIONS = [
  '🍔', '🍱', '🍜', '☕', '🍎', '🚗', '🚇', '🚌',
  '✈️', '🚕', '🛒', '👕', '📱', '💻', '🎮', '📚',
  '🎬', '🎵', '🏠', '💡', '💧', '📞', '💊', '🏥',
  '💰', '💳', '📈', '🎁', '💼', '📝',
];

const DEFAULT_CATEGORY_ICONS = {
  '餐饮': '🍔',
  '交通': '🚗',
  '购物': '🛒',
  '娱乐': '🎮',
  '医疗': '💊',
  '教育': '📚',
  '居住': '🏠',
  '住房': '🏠',
  '通讯': '📞',
  '投资': '📈',
  '工资': '💰',
  '理财': '💹',
  '其他收入': '🎁',
  '其他支出': '📝',
  '其他': '📝',
  '早餐': '🍳',
  '午餐': '🍱',
  '晚餐': '🍜',
  '零食': '🍪',
  '饮料': '☕',
  '水果': '🍎',
  '公交': '🚌',
  '地铁': '🚇',
  '出租车': '🚕',
  '加油': '⛽',
  '停车': '🅿️',
  '房租': '🏠',
  '水电费': '💡',
  '物业费': '🏢',
  '日用品': '🧴',
  '服装': '👕',
  '电子产品': '📱',
  '门诊': '🏥',
  '药品': '💊',
  '学费': '🎓',
  '书籍': '📖',
  '培训': '🎯',
  '电影': '🎬',
  '游戏': '🎮',
  '旅游': '✈️',
  '股票': '📈',
  '基金': '📊',
  '债券': '📜',
  '奖金': '🎁',
  '补贴': '💵',
  '利息': '💹',
  '分红': '💰',
  '红包': '🧧',
  '退款': '↩️',
  '捐赠': '❤️',
  '丢失': '💔',
  '转账': '💸',
  '还款': '💳',
  '收款': '💵',
  '应付/借入': '📥',
  '应收/借出': '📤',
  '手续费': '💸',
  '报销': '📋',
  '优惠': '🏷️',
};

export function getCategoryIcon(categoryName, customIcons) {
  if (!categoryName) return '📝';
  if (customIcons && customIcons[categoryName]) {
    return customIcons[categoryName];
  }
  if (DEFAULT_CATEGORY_ICONS[categoryName]) {
    return DEFAULT_CATEGORY_ICONS[categoryName];
  }
  return '📝';
}

export function getSubCategoryIcon(subCategoryName, categoryName, customSubIcons) {
  if (!subCategoryName) return '📝';
  if (customSubIcons && customSubIcons[categoryName] && customSubIcons[categoryName][subCategoryName]) {
    return customSubIcons[categoryName][subCategoryName];
  }
  if (DEFAULT_CATEGORY_ICONS[subCategoryName]) {
    return DEFAULT_CATEGORY_ICONS[subCategoryName];
  }
  return '📝';
}

export const defaultCategories = {
  income: {
    '工资': ['工资', '奖金', '补贴'],
    '理财': ['利息', '分红'],
    '其他收入': ['红包', '退款', '其他'],
  },
  expense: {
    '餐饮': ['早餐', '午餐', '晚餐', '零食', '饮料', '水果'],
    '交通': ['公交', '地铁', '出租车', '加油', '停车'],
    '居住': ['房租', '水电费', '物业费'],
    '购物': ['日用品', '服装', '电子产品'],
    '医疗': ['门诊', '药品'],
    '教育': ['学费', '书籍', '培训'],
    '娱乐': ['电影', '游戏', '旅游'],
    '投资': ['股票', '基金', '债券'],
    '其他支出': ['捐赠', '丢失', '其他'],
  },
};

export function getDefaultCategoryIcon(categoryName) {
  return DEFAULT_CATEGORY_ICONS[categoryName] || '📝';
}
