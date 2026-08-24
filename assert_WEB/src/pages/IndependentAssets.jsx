import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchState, saveState, lookupFinance, fetchFinanceQuotes, peekCachedState, invalidateStateCache, fetchExchangeRates } from '../api';
import { convertAmount, DEFAULT_EXCHANGE_RATES } from '../utils/currency';
import sanitizeText from '../utils/sanitizeText';
import FinanceHoldingsTable from '../components/FinanceHoldingsTable';
import { computeHoldingDays } from '../components/FinanceHoldingsTable.utils';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Building2,
  Car,
  Landmark,
  Briefcase,
  Clock,
  DollarSign,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Upload,
  Calculator,
  FileText,
  Download,
  PiggyBank,
  Coins,
} from 'lucide-react';
import { VEHICLE_TYPES, VEHICLE_BRANDS, VEHICLE_MODELS } from '../data/vehicle-data';

export const CURRENCY_OPTIONS = [
  { code: 'CNY', symbol: '¥', label: '人民币 (CNY)' },
  { code: 'USD', symbol: '$', label: '美元 (USD)' },
  { code: 'HKD', symbol: 'HK$', label: '港币 (HKD)' },
  { code: 'JPY', symbol: '¥', label: '日元 (JPY)' },
  { code: 'EUR', symbol: '€', label: '欧元 (EUR)' },
  { code: 'GBP', symbol: '£', label: '英镑 (GBP)' },
];

const FIXED_INVESTMENT_EVENT_TYPES = [
  { value: '投入本金', label: '投入本金' },
  { value: '追加', label: '追加' },
  { value: '分红', label: '分红' },
];

const FIXED_INVESTMENT_OUTFLOW_EVENTS = ['投入本金', '追加'];

export function formatCurrency(value, currency = 'CNY') {
  if (value === null || value === undefined) return '—';
  const option = CURRENCY_OPTIONS.find(c => c.code === currency) || CURRENCY_OPTIONS[0];
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${option.symbol}${formatted}`;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// XIRR 算法：输入现金流数组和日期数组，输出年化收益率
function calculateXIRR(cashflows, dates) {
  if (!cashflows || !dates || cashflows.length !== dates.length || cashflows.length < 2) {
    return null;
  }

  const hasPositive = cashflows.some(amount => amount > 0);
  const hasNegative = cashflows.some(amount => amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const baseDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const msPerDay = 1000 * 60 * 60 * 24;

  const npv = (rate) => {
    return cashflows.reduce((sum, amount, index) => {
      const days = (dates[index] - baseDate) / msPerDay;
      return sum + amount / Math.pow(1 + rate, days / 365);
    }, 0);
  };

  const derivative = (rate) => {
    return cashflows.reduce((sum, amount, index) => {
      const days = (dates[index] - baseDate) / msPerDay;
      return sum - (amount * days / 365) / Math.pow(1 + rate, days / 365 + 1);
    }, 0);
  };

  // 牛顿迭代法
  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const n = npv(rate);
    const d = derivative(rate);
    if (Math.abs(n) < 1e-10) return rate;
    if (Math.abs(d) < 1e-10) break;
    const newRate = rate - n / d;
    if (newRate <= -1) break;
    if (Math.abs(newRate - rate) < 1e-10) return newRate;
    rate = newRate;
  }

  // 二分法兜底
  let low = -0.9999;
  let high = 1;
  let nLow = npv(low);
  let nHigh = npv(high);

  while (nLow * nHigh > 0 && high < 1e6) {
    high *= 2;
    nHigh = npv(high);
  }
  if (nLow * nHigh > 0) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const nMid = npv(mid);
    if (Math.abs(nMid) < 1e-10) return mid;
    if (nLow * nMid < 0) {
      high = mid;
      nHigh = nMid;
    } else {
      low = mid;
      nLow = nMid;
    }
  }

  const result = (low + high) / 2;
  return isFinite(result) && !isNaN(result) ? result : null;
}

const ASSET_TABS = [
  { id: 'insurance', label: '保险', icon: Briefcase },
  { id: 'realestate', label: '房产', icon: Building2 },
  { id: 'vehicle', label: '车辆', icon: Car },
  { id: 'fixedinvestment', label: '固定投资', icon: Landmark },
  { id: 'equity', label: '股权', icon: DollarSign },
  { id: 'fixeddeposit', label: '定期资产', icon: Clock },
  { id: 'forex', label: '外汇', icon: Coins },
];

// 股权模块 - 同步理财模块的字段选项
const EQUITY_MARKET_OPTIONS = ['国内市场', '港股市场', '美股市场'];
const EQUITY_CURRENCY_SUGGESTIONS = ['CNY', 'CNH', 'HKD', 'USD', 'EUR', 'JPY', 'GBP', 'SGD'];
const EQUITY_DEFAULT_ASSET_KIND_OPTIONS = ['流动资产', '非流动资产'];
const EQUITY_DEFAULT_CATEGORY_L1_OPTIONS = ['权益类', '债权类', '现金类', '商品类', '分红类', '固收类', '另类投资'];
const EQUITY_DEFAULT_CATEGORY_L2_OPTIONS = {
  '权益类': ['A股', '港股', '美股', '其他'],
  '债权类': ['中债', '美债'],
  '现金类': ['活期存款', '定期存款', 'A股', '其他'],
  '商品类': ['A股', '其他'],
  '分红类': ['A股', '固定投资', '其他'],
  '固收类': ['A股', '其他'],
  '另类投资': ['A股', '其他'],
};
const EQUITY_DEFAULT_POSITION_GROUP_OPTIONS = ['核心仓位', '卫星仓位', '观察仓位', '套利仓位', '现金仓位'];
const EQUITY_DEFAULT_POSITION_TYPE_OPTIONS = ['成长股', '价值股', '周期股', '消费股', '核心股票仓位', 'ETF仓位', '基金定投', '打新仓位', '波段操作', '其他'];

// 与理财模块一致的市场分组结构
const EQUITY_MARKET_GROUPS = [
  { label: '国内市场', options: ['国内市场'] },
  { label: '港澳台市场', options: ['港股市场'] },
  { label: '海外市场', options: ['美股市场'] },
];

const COUNTRY_REGION_DATA = {
  '中国': {
    '北京': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区', '大兴区', '顺义区'],
    '上海': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '松江区', '青浦区', '奉贤区'],
    '广东': ['广州市', '深圳市', '珠海市', '佛山市', '东莞市', '中山市', '惠州市', '江门市', '肇庆市'],
    '浙江': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '台州市'],
    '江苏': ['南京市', '苏州市', '无锡市', '常州市', '徐州市', '南通市', '扬州市', '镇江市', '盐城市'],
    '四川': ['成都市', '绵阳市', '德阳市', '南充市', '宜宾市', '泸州市'],
    '湖北': ['武汉市', '宜昌市', '襄阳市', '荆州市', '黄冈市'],
    '湖南': ['长沙市', '株洲市', '湘潭市', '衡阳市', '岳阳市'],
    '福建': ['福州市', '厦门市', '泉州市', '漳州市', '莆田市'],
    '山东': ['济南市', '青岛市', '烟台市', '潍坊市', '临沂市', '淄博市'],
    '河南': ['郑州市', '洛阳市', '开封市', '新乡市', '南阳市'],
    '河北': ['石家庄市', '唐山市', '保定市', '廊坊市', '沧州市'],
    '重庆': ['渝中区', '江北区', '南岸区', '九龙坡区', '沙坪坝区', '渝北区', '巴南区', '北碚区'],
    '天津': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '滨海新区', '西青区', '武清区'],
    '陕西': ['西安市', '宝鸡市', '咸阳市', '渭南市', '汉中市'],
    '辽宁': ['沈阳市', '大连市', '鞍山市', '抚顺市', '锦州市'],
    '安徽': ['合肥市', '芜湖市', '蚌埠市', '马鞍山市', '安庆市'],
    '江西': ['南昌市', '九江市', '上饶市', '抚州市', '宜春市'],
    '广西': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市'],
    '云南': ['昆明市', '曲靖市', '大理市', '丽江市'],
    '贵州': ['贵阳市', '遵义市', '六盘水市', '安顺市'],
    '海南': ['海口市', '三亚市', '三沙市', '儋州市'],
    '甘肃': ['兰州市', '天水市', '酒泉市'],
    '青海': ['西宁市', '海东市'],
    '宁夏': ['银川市', '石嘴山市', '吴忠市'],
    '新疆': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市'],
    '内蒙古': ['呼和浩特市', '包头市', '鄂尔多斯市'],
    '西藏': ['拉萨市', '日喀则市', '林芝市'],
    '黑龙江': ['哈尔滨市', '齐齐哈尔市', '大庆市', '牡丹江市'],
    '吉林': ['长春市', '吉林市', '四平市', '延边州'],
    '山西': ['太原市', '大同市', '运城市', '临汾市'],
  },
  '美国': {
    '加利福尼亚州': ['洛杉矶', '旧金山', '圣地亚哥', '圣何塞', '萨克拉门托'],
    '纽约州': ['纽约市', '布法罗', '罗切斯特', '奥尔巴尼'],
    '得克萨斯州': ['休斯顿', '达拉斯', '奥斯汀', '圣安东尼奥'],
    '佛罗里达州': ['迈阿密', '奥兰多', '坦帕', '杰克逊维尔'],
    '华盛顿州': ['西雅图', '斯波坎', '塔科马'],
    '伊利诺伊州': ['芝加哥', '斯普林菲尔德', '皮奥里亚'],
    '马萨诸塞州': ['波士顿', '剑桥', '伍斯特'],
    '新泽西州': ['纽瓦克', '泽西市', '普林斯顿'],
    '宾夕法尼亚州': ['费城', '匹兹堡', '阿伦敦'],
    '佐治亚州': ['亚特兰大', '萨凡纳', '奥古斯塔'],
  },
  '中国香港': {
    '香港岛': ['中西区', '湾仔区', '东区', '南区'],
    '九龙': ['油尖旺区', '深水埗区', '九龙城区', '黄大仙区', '观塘区'],
    '新界': ['荃湾区', '屯门区', '元朗区', '北区', '大埔区', '西贡区', '沙田区', '葵青区', '离岛区'],
  },
  '中国澳门': {
    '澳门半岛': ['花地玛堂区', '圣安多尼堂区', '大堂区', '望德堂区', '风顺堂区'],
    '氹仔': ['嘉模堂区'],
    '路环': ['圣方济各堂区'],
  },
  '中国台湾': {
    '台北市': ['中正区', '大同区', '中山区', '松山区', '大安区', '万华区', '信义区', '士林区', '北投区', '内湖区', '南港区', '文山区'],
    '新北市': ['板桥区', '三重区', '中和区', '永和区', '新庄区', '新店区', '土城区', '芦洲区'],
    '台中市': ['中区', '东区', '南区', '西区', '北区', '西屯区', '南屯区', '北屯区'],
    '高雄市': ['盐埕区', '鼓山区', '左营区', '楠梓区', '三民区', '新兴区', '前金区'],
    '桃园市': ['桃园区', '中坜区', '平镇区', '八德区', '杨梅区'],
  },
  '日本': {
    '东京都': ['千代田区', '中央区', '港区', '新宿区', '文京区', '台东区', '墨田区', '江东区', '品川区', '涩谷区'],
    '大阪府': ['大阪市', '堺市', '岸和田市', '丰中市', '吹田市'],
    '京都府': ['京都市', '宇治市', '龟冈市', '城阳市'],
    '神奈川县': ['横滨市', '川崎市', '相模原市', '横须贺市'],
    '千叶县': ['千叶市', '船桥市', '松户市', '柏市'],
  },
  '新加坡': {
    '中央区': ['滨海湾', '乌节路', '牛车水', '小印度', '克拉码头'],
    '东区': ['淡滨尼', '巴耶利峇', '樟宜', '勿洛'],
    '西区': ['裕廊', '文礼', '大士', '金文泰'],
    '北区': ['兀兰', '三巴旺', '义顺'],
    '东北区': ['后港', '盛港', '榜鹅', '实里达'],
  },
  '英国': {
    '大伦敦': ['伦敦市', '威斯敏斯特', '卡姆登', '伊斯灵顿', '南华克'],
    '曼彻斯特': ['曼彻斯特市', '索尔福德', '特拉福德'],
    '伯明翰': ['伯明翰市', '索利哈尔', '考文垂'],
  },
  '澳大利亚': {
    '新南威尔士州': ['悉尼', '纽卡斯尔', '卧龙岗'],
    '维多利亚州': ['墨尔本', '吉朗', '巴拉瑞特'],
    '昆士兰州': ['布里斯班', '黄金海岸', '凯恩斯'],
  },
  '加拿大': {
    '安大略省': ['多伦多', '渥太华', '密西沙加', '汉密尔顿'],
    '不列颠哥伦比亚省': ['温哥华', '维多利亚', '素里', '本拿比'],
    '魁北克省': ['蒙特利尔', '魁北克市', '拉瓦尔'],
  },
};

export default function IndependentAssets() {
  // SWR: 同步预填缓存数据，避免"加载中"闪烁；若无缓存才显示loading
  const [stateData, setStateData] = useState(() => peekCachedState() || null);
  const [loading, setLoading] = useState(() => !peekCachedState());
  const [activeTab, setActiveTab] = useState('insurance');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [filters, setFilters] = useState({});
  const [showVehicleDetailModal, setShowVehicleDetailModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showPropertyDetailModal, setShowPropertyDetailModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set([new Date().getFullYear().toString()]));
  const [showSelfUseDetailModal, setShowSelfUseDetailModal] = useState(false);
  const [selectedSelfUseProperty, setSelectedSelfUseProperty] = useState(null);
  const [selfUseMarketPricePerSqm, setSelfUseMarketPricePerSqm] = useState('');
  const [selfUseMarketArea, setSelfUseMarketArea] = useState('');
  const [customVehicleTypes, setCustomVehicleTypes] = useState([]);
  const [customVehicleBrands, setCustomVehicleBrands] = useState({});
  const [customVehicleModels, setCustomVehicleModels] = useState({});
  const [customFixedInvestmentTypes, setCustomFixedInvestmentTypes] = useState([]);
  const [customFixedDepositTypes, setCustomFixedDepositTypes] = useState([]);
  const [showInsuranceDetailModal, setShowInsuranceDetailModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const [insuranceDetailDirty, setInsuranceDetailDirty] = useState(false);
  const [insurancePaginationPage, setInsurancePaginationPage] = useState(1);
  const INSURANCE_PAGE_SIZE = 20;
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [calculationData, setCalculationData] = useState(null);
  const [showInsuranceTransactionModal, setShowInsuranceTransactionModal] = useState(false);
  // 保险取用弹窗
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawRecordId, setWithdrawRecordId] = useState(null);
  const [withdrawTargetAccountId, setWithdrawTargetAccountId] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionFormData, setTransactionFormData] = useState({});
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedOcrRecords, setSelectedOcrRecords] = useState([]);
  // 股权模块字段选项（同步理财模块）
  const [equityAssetKindOptions, setEquityAssetKindOptions] = useState(() => {
    const saved = localStorage.getItem('ia_equity_asset_kind_options');
    return saved ? JSON.parse(saved) : EQUITY_DEFAULT_ASSET_KIND_OPTIONS;
  });
  const [equityCategoryL1Options, setEquityCategoryL1Options] = useState(() => {
    const saved = localStorage.getItem('ia_equity_category_l1_options');
    return saved ? JSON.parse(saved) : EQUITY_DEFAULT_CATEGORY_L1_OPTIONS;
  });
  const [equityCategoryL2OptionsMap, setEquityCategoryL2OptionsMap] = useState(() => {
    const saved = localStorage.getItem('ia_equity_category_l2_options');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 迁移：清理债权类的旧选项，仅保留中债/美债及用户自定义项
        if (parsed && Array.isArray(parsed['债权类'])) {
          const l2 = parsed['债权类'];
          const bondOptions = ['中债', '美债'];
          const filtered = l2.filter(x => !['A股', '港股通', '港股', '美股', '其他'].includes(x));
          const remaining = filtered.filter(x => !bondOptions.includes(x));
          const migrated = [...bondOptions, ...remaining];
          if (migrated.length !== l2.length || !bondOptions.every(o => l2.includes(o))) {
            parsed['债权类'] = migrated;
            localStorage.setItem('ia_equity_category_l2_options', JSON.stringify(parsed));
          }
        }
        // 清理其他类目中残留的 A 股等不相关选项
        if (parsed && Array.isArray(parsed['固收类'])) {
          const cleaned = parsed['固收类'].filter(x => !['A股', '港股通'].includes(x));
          if (cleaned.length !== parsed['固收类'].length) {
            parsed['固收类'] = cleaned.length > 0 ? cleaned : ['其他'];
            localStorage.setItem('ia_equity_category_l2_options', JSON.stringify(parsed));
          }
        }
        if (parsed && Array.isArray(parsed['现金类'])) {
          const cleaned = parsed['现金类'].filter(x => x !== 'A股');
          if (cleaned.length !== parsed['现金类'].length) {
            parsed['现金类'] = cleaned;
            localStorage.setItem('ia_equity_category_l2_options', JSON.stringify(parsed));
          }
        }
        if (parsed && Array.isArray(parsed['商品类'])) {
          const cleaned = parsed['商品类'].filter(x => x !== 'A股');
          if (cleaned.length !== parsed['商品类'].length) {
            parsed['商品类'] = cleaned.length > 0 ? cleaned : ['其他'];
            localStorage.setItem('ia_equity_category_l2_options', JSON.stringify(parsed));
          }
        }
        return parsed;
      } catch {}
    }
    return EQUITY_DEFAULT_CATEGORY_L2_OPTIONS;
  });
  const [equityPositionGroupOptions, setEquityPositionGroupOptions] = useState(() => {
    const saved = localStorage.getItem('ia_equity_position_group_options');
    return saved ? JSON.parse(saved) : EQUITY_DEFAULT_POSITION_GROUP_OPTIONS;
  });
  const [equityPositionTypeOptions, setEquityPositionTypeOptions] = useState(() => {
    const saved = localStorage.getItem('ia_equity_position_type_options');
    return saved ? JSON.parse(saved) : EQUITY_DEFAULT_POSITION_TYPE_OPTIONS;
  });
  // 持久化股权模块选项
  useEffect(() => { localStorage.setItem('ia_equity_asset_kind_options', JSON.stringify(equityAssetKindOptions)); }, [equityAssetKindOptions]);
  useEffect(() => { localStorage.setItem('ia_equity_category_l1_options', JSON.stringify(equityCategoryL1Options)); }, [equityCategoryL1Options]);
  useEffect(() => { localStorage.setItem('ia_equity_category_l2_options', JSON.stringify(equityCategoryL2OptionsMap)); }, [equityCategoryL2OptionsMap]);
  useEffect(() => { localStorage.setItem('ia_equity_position_group_options', JSON.stringify(equityPositionGroupOptions)); }, [equityPositionGroupOptions]);
  useEffect(() => { localStorage.setItem('ia_equity_position_type_options', JSON.stringify(equityPositionTypeOptions)); }, [equityPositionTypeOptions]);

  // 股权模块 - 资产名称/代码实时搜索联想
  const [equityLookupResults, setEquityLookupResults] = useState([]);
  const [equityShowLookupDropdown, setEquityShowLookupDropdown] = useState(false);
  const [equityLookupLoading, setEquityLookupLoading] = useState(false);
  const equityLookupTimerRef = useRef(null);

  const handleEquityCodeSearch = (q) => {
    if (equityLookupTimerRef.current) {
      clearTimeout(equityLookupTimerRef.current);
    }
    if (!q || q.trim().length < 1) {
      setEquityLookupResults([]);
      setEquityShowLookupDropdown(false);
      return;
    }
    setEquityLookupLoading(true);
    setEquityShowLookupDropdown(true);
    equityLookupTimerRef.current = setTimeout(async () => {
      try {
        const results = await lookupFinance(q.trim(), formData.market);
        setEquityLookupResults(results);
      } catch (e) {
        console.error('Equity lookup failed:', e);
        setEquityLookupResults([]);
      } finally {
        setEquityLookupLoading(false);
      }
    }, 300);
  };

  const handleEquitySelectLookup = async (item) => {
    setEquityShowLookupDropdown(false);
    const code = item.code || formData.code || '';
    const name = item.name || formData.name || '';
    const price = item.price ? parseFloat(item.price) : null;

    setFormData(prev => {
      const qty = parseFloat(prev.quantity) || 0;
      const cost = parseFloat(prev.cost) || 0;
      const currentPrice = price !== null ? price : (parseFloat(prev.currentPrice) || 0);
      const marketValue = qty * currentPrice;
      const pnl = marketValue - cost * qty;
      const pnlRate = cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0;
      return {
        ...prev,
        code,
        name,
        currentPrice: currentPrice ? String(currentPrice) : prev.currentPrice,
        marketValue: marketValue ? marketValue.toFixed(2) : prev.marketValue,
        pnl: pnl ? pnl.toFixed(2) : prev.pnl,
        pnlRate: pnlRate ? pnlRate.toFixed(2) : prev.pnlRate,
      };
    });

    // 如果没拿到价格，再补一次实时报价
    if (price === null && code) {
      try {
        const quotes = await fetchFinanceQuotes([code]);
        if (quotes && quotes.length > 0 && quotes[0].price) {
          setFormData(prev => {
            const qty = parseFloat(prev.quantity) || 0;
            const cost = parseFloat(prev.cost) || 0;
            const cp = parseFloat(quotes[0].price) || 0;
            const mv = qty * cp;
            const p = mv - cost * qty;
            const pr = cost > 0 ? ((cp - cost) / cost) * 100 : 0;
            return {
              ...prev,
              currentPrice: String(quotes[0].price),
              marketValue: mv ? mv.toFixed(2) : prev.marketValue,
              pnl: p ? p.toFixed(2) : prev.pnl,
              pnlRate: pr ? pr.toFixed(2) : prev.pnlRate,
            };
          });
        }
      } catch (e) {
        console.error('Equity fetch quotes failed:', e);
      }
    }
  };
  const [showFixedDepositDetailModal, setShowFixedDepositDetailModal] = useState(false);
  const [selectedFixedDeposit, setSelectedFixedDeposit] = useState(null);
  const [showFixedInvestmentTypeModal, setShowFixedInvestmentTypeModal] = useState(false);
  const [editingFixedInvestmentType, setEditingFixedInvestmentType] = useState(null);
  const [fixedInvestmentTypeInput, setFixedInvestmentTypeInput] = useState('');
  const [showFixedInvestmentDetailModal, setShowFixedInvestmentDetailModal] = useState(false);
  const [selectedFixedInvestment, setSelectedFixedInvestment] = useState(null);
  const [fixedInvestmentExpandedYears, setFixedInvestmentExpandedYears] = useState(new Set([new Date().getFullYear().toString()]));
  const [dividendRecords, setDividendRecords] = useState([]);
  const [showDividendAddForm, setShowDividendAddForm] = useState(false);
  const [newDividendRecord, setNewDividendRecord] = useState({
    dividendDate: '',
    eventType: '分红',
    cashflow: '',
  });
  const [editingDividendRecordId, setEditingDividendRecordId] = useState(null);
  const [editDividendRecord, setEditDividendRecord] = useState({
    dividendDate: '',
    eventType: '分红',
    cashflow: '',
  });
  const [fixedInvestmentCashflowStartDate, setFixedInvestmentCashflowStartDate] = useState('');
  const [fixedInvestmentCashflowEndDate, setFixedInvestmentCashflowEndDate] = useState('');
  const [fixedInvestmentCashflowEventType, setFixedInvestmentCashflowEventType] = useState('');
  const [fixedInvestmentCashflowSign, setFixedInvestmentCashflowSign] = useState('all');
  const [fixedInvestmentCashflowPage, setFixedInvestmentCashflowPage] = useState(1);
  // 汇率（用于多币种金额折算到统一显示货币：人民币 CNY）
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_EXCHANGE_RATES);
  // 保险资产合计行的统计币种（可切换，默认人民币）
  const [insuranceTotalCurrency, setInsuranceTotalCurrency] = useState('CNY');
  const [vehicleTotalCurrency, setVehicleTotalCurrency] = useState('CNY');
  const [realEstateTotalCurrency, setRealEstateTotalCurrency] = useState('CNY');
  const [fixedInvestmentTotalCurrency, setFixedInvestmentTotalCurrency] = useState('CNY');
  const [fixedDepositTotalCurrency, setFixedDepositTotalCurrency] = useState('CNY');
  const [forexTotalCurrency, setForexTotalCurrency] = useState('CNY');
  const [forexRateLoading, setForexRateLoading] = useState(false);
  const [survivalFundTotalCurrency, setSurvivalFundTotalCurrency] = useState('CNY');

  const { accounts = [], independentAssets = {} } = stateData || {};

  // 独立资产-股权 → 理财模块 holdings 格式的映射，使列显示与理财模块完全一致
  const equityHoldings = useMemo(() => {
    const items = independentAssets.equity || [];
    return items.map(item => {
      const accountName = item.accountName ||
        accounts.find(a => (a.id || a.name) === item.accountId)?.name ||
        item.accountId ||
        '';
      const qty = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.cost) || 0;
      const currentPrice = parseFloat(item.currentPrice) || 0;
      const marketValue = parseFloat(item.marketValue) || qty * currentPrice;
      const pnl = parseFloat(item.pnl);
      const pnlRate = parseFloat(item.pnlRate);
      const holdingCost = qty * unitCost;
      return {
        id: item.id,
        market: item.market || '',
        currency: item.currency || 'CNY',
        assetKind: item.assetKind || '',
        assetType: item.assetType || '股票',
        name: item.name || '',
        code: item.code || '',
        categoryL1: item.categoryL1 || '',
        categoryL2: item.categoryL2 || '',
        categoryL3: item.categoryL3 || '',
        categoryL4: item.categoryL4 || '',
        positionGroup: item.positionGroup || '',
        positionType: item.positionType || '',
        cost: holdingCost,
        costPrice: unitCost,
        quantity: qty,
        currentPrice,
        currentValue: marketValue,
        balance: marketValue,
        holdingPnl: isNaN(pnl) ? (marketValue - holdingCost) : pnl,
        holdingPnlRate: isNaN(pnlRate) ? (holdingCost > 0 ? ((marketValue - holdingCost) / holdingCost) * 100 : 0) : pnlRate,
        dailyPnl: 0,
        dailyPnlRate: 0,
        holdingDaysDate: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '',
        account: accountName,
        tags: item.tags && Array.isArray(item.tags) ? [...item.tags] : [],
        isArchived: false,
      };
    });
  }, [independentAssets.equity, accounts]);

  // 股权模块汇总用 financeAccounts（持仓汇总卡片统计）
  const equityFinanceAccounts = useMemo(() => equityHoldings, [equityHoldings]);

  // 股权模块全部二级分类选项（扁平数组，供FinanceHoldingsTable筛选下拉使用）
  const equityAllCategoryL2Options = useMemo(() => {
    const set = new Set();
    Object.values(equityCategoryL2OptionsMap).forEach(arr => (arr || []).forEach(o => set.add(o)));
    return Array.from(set);
  }, [equityCategoryL2OptionsMap]);

  // 股权模块标签集合（所有item的tags去重）
  const equityTags = useMemo(() => {
    const set = new Set();
    (independentAssets.equity || []).forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [independentAssets.equity]);

  // loadData 后，如果后端提供了汇率，则用后端汇率覆盖默认
  useEffect(() => {
    if (stateData && stateData.exchangeRates && typeof stateData.exchangeRates === 'object') {
      setExchangeRates(prev => ({ ...prev, ...stateData.exchangeRates }));
    }
  }, [stateData]);

  // 把任意币种的金额折算成人民币（账户本卡片 & 顶部汇总卡片统一显示为人民币）
  const toCNY = (value, fromCurrency) =>
    convertAmount(parseFloat(value) || 0, (fromCurrency || 'CNY'), 'CNY', exchangeRates);

  // 防止并发重复加载（mount、window focus、saveData 触发可能重叠）
  const loadingRef = useRef(false);

  // mount 时加载一次，并监听 window focus：从 Accounts 等其他页面切回时会触发 focus，
  // 从而重新拉取 accounts，保证账户本下拉与账户管理同步。
  useEffect(() => {
    loadData();
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    setFixedInvestmentCashflowPage(1);
  }, [fixedInvestmentCashflowStartDate, fixedInvestmentCashflowEndDate, fixedInvestmentCashflowEventType, fixedInvestmentCashflowSign]);

  const loadData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    // SWR: 已有数据时不显示loading spinner，后台静默更新；无数据时才显示
    const hasExistingData = !!stateData;
    if (!hasExistingData) setLoading(true);
    try {
      const data = await fetchState();
      if (!data.accounts || data.accounts.length === 0) {
        try {
          const savedAccounts = localStorage.getItem('wealth_os_accounts');
          if (savedAccounts) {
            data.accounts = JSON.parse(savedAccounts);
          }
        } catch (e) {
          console.error('Failed to parse accounts from localStorage:', e);
        }
      }
      // 合并本地缓存的独立资产数据（后端为空或失败时兜底）
      try {
        const savedAssets = localStorage.getItem('wealth_os_independent_assets');
        if (savedAssets) {
          data.independentAssets = { ...(data.independentAssets || {}), ...JSON.parse(savedAssets) };
        }
      } catch (e) {
        console.error('Failed to parse independent assets from localStorage:', e);
      }
      setStateData(data);
    } catch (err) {
      console.error('Failed to load data:', err);
      try {
        const savedAccounts = localStorage.getItem('wealth_os_accounts');
        const savedAssets = localStorage.getItem('wealth_os_independent_assets');
        setStateData({
          accounts: savedAccounts ? JSON.parse(savedAccounts) : [],
          independentAssets: savedAssets ? JSON.parse(savedAssets) : {},
        });
      } catch (e) {
        console.error('Failed to restore data from localStorage:', e);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const saveData = async (data) => {
    const newState = { ...stateData, ...data };
    const result = await saveState(newState);
    localStorage.setItem('wealth_os_independent_assets', JSON.stringify(newState.independentAssets || {}));
    setStateData(newState);
    invalidateStateCache();
    if (!result.cached) {
      await loadData();
    }
  };

  const calculateXIRR = (dates, cashflows, guess = 0.1) => {
    const maxIterations = 300;
    const tolerance = 1e-7;

    if (!dates || !cashflows || dates.length < 2 || cashflows.length < 2) return null;
    if (dates.length !== cashflows.length) return null;

    const hasPositive = cashflows.some(c => c > 0);
    const hasNegative = cashflows.some(c => c < 0);
    if (!hasPositive || !hasNegative) return null;

    const t0 = dates[0].getTime();
    const years = dates.map(d => (d.getTime() - t0) / (365 * 24 * 60 * 60 * 1000));

    if (years.some(y => y < 0)) return null;

    const npv = (rate) => {
      let total = 0;
      for (let i = 0; i < cashflows.length; i++) {
        if (rate <= -1) return NaN;
        total += cashflows[i] / Math.pow(1 + rate, years[i]);
      }
      return total;
    };

    if (dates.length === 2) {
      const pv0 = cashflows[0];
      const pv1 = cashflows[1];
      const t = years[1];
      if (t <= 0 || pv0 >= 0 || pv1 <= 0) return null;
      return (Math.pow(pv1 / -pv0, 1 / t) - 1) * 100;
    }

    const npvDerivative = (rate) => {
      let total = 0;
      for (let i = 0; i < cashflows.length; i++) {
        total -= cashflows[i] * years[i] / Math.pow(1 + rate, years[i] + 1);
      }
      return total;
    };

    const bisect = (lo, hi) => {
      let flowLo = npv(lo);
      let flowHi = npv(hi);
      if (isNaN(flowLo) || isNaN(flowHi)) return null;
      if (flowLo * flowHi > 0) return null;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const fMid = npv(mid);
        if (isNaN(fMid)) return null;
        if (Math.abs(fMid) < tolerance) return mid;
        if (fMid * flowLo < 0) {
          hi = mid;
          flowHi = fMid;
        } else {
          lo = mid;
          flowLo = fMid;
        }
      }
      return (lo + hi) / 2;
    };

    let rate = null;
    const candidates = [-0.999, -0.99, -0.9, -0.5, -0.25, 0, 0.1, 0.25, 0.5, 1, 2, 5, 10, 50, 100];
    for (const g of candidates) {
      const f = npv(g);
      if (!isNaN(f) && Math.abs(f) < 1e6) {
        if (Math.abs(f) < tolerance) { rate = g; break; }
      }
    }
    if (rate === null) {
      for (const lo of candidates) {
        for (const hi of candidates) {
          if (lo >= hi) continue;
          const fLo = npv(lo);
          const fHi = npv(hi);
          if (isNaN(fLo) || isNaN(fHi)) continue;
          if (fLo * fHi < 0) {
            const root = bisect(lo, hi);
            if (root !== null) { rate = root; break; }
          }
        }
        if (rate !== null) break;
      }
    }
    if (rate === null) {
      for (let i = 0; i < maxIterations; i++) {
        const f = npv(guess);
        if (isNaN(f)) break;
        if (Math.abs(f) < tolerance) { rate = guess; break; }
        const d = npvDerivative(guess);
        if (isNaN(d) || Math.abs(d) < 1e-12) break;
        const next = guess - f / d;
        if (!isFinite(next) || next <= -1) {
          guess = (guess - 0.99) / 2;
        } else {
          guess = next;
        }
      }
      rate = guess;
    }

    if (!isFinite(rate) || rate <= -1) return null;
    return rate * 100;
  };

  const getAssets = (type) => {
    return independentAssets[type] || [];
  };

  const updateAssets = async (type, items) => {
    await saveData({
      independentAssets: {
        ...independentAssets,
        [type]: items,
      },
    });
  };

  const getDefaultFormData = (type) => {
    const defaults = {
      insurance: {
        policyNumber: '',
        insuranceType: '',
        insurancePurpose: '',
        policyName: '',
        insured: '',
        insuredAge: '',
        beneficiary: '',
        policyDate: '',
        policyStatus: '待生效',
        paymentMethod: '年付',
        monthlyPaymentAmount: '',
        annualPaymentAmount: '',
        paidPeriods: '',
        paidAmount: '',
        cashValue: '',
        currency: 'CNY',
        accountId: '',
        accountName: '',
        attachments: [],
      },
      realestate: {
        country: '',
        province: '',
        city: '',
        district: '',
        type: '',
        usage: '自用',
        purchaseType: '新房',
        pricePerSqm: '',
        area: '',
        purchasePrice: '',
        taxRate: '',
        taxAmount: '',
        agencyFeeRate: '',
        agencyFeeAmount: '',
        rentMethod: '押一付一',
        rentAmount: '',
        depositAmount: '',
        startDate: '',
        endDate: '',
        isRented: '是',
        currency: 'CNY',
        accountId: '',
        accountName: '',
      },
      vehicle: {
        vehicleType: '2轮电动车',
        manufacturer: '',
        model: '',
        purchasePrice: '',
        purchaseDate: '',
        mileage: '',
        currency: 'CNY',
        accountId: '',
        accountName: '',
      },
      fixedinvestment: {
        country: '',
        province: '',
        district: '',
        type: '',
        investmentCost: '',
        dividendFrequency: '每年',
        annualContribution: '',
        startYear: '',
        endYear: '',
        currency: 'CNY',
        accountId: '',
        accountName: '',
      },
      survivalfund: {
        name: '',
        currency: 'CNY',
        amount: '',
        accountId: '',
        accountName: '',
      },
      equity: {
        name: '',
        code: '',
        cost: '',
        quantity: '',
        currentPrice: '',
        marketValue: '',
        pnl: '',
        pnlRate: '',
        currency: 'CNY',
        accountId: '',
        accountName: '',
      },
      fixeddeposit: {
        market: '国内市场',
        location: '',
        type: '',
        usage: '',
        termType: '长期',
        currency: 'CNY',
        amount: '',
        interestRate: '',
        startDate: '',
        endDate: '',
        expectedReturn: '',
        actualReturn: '',
        accountId: '',
        accountName: '',
      },
      forex: {
        name: '',
        buyCurrency: 'USD',
        sellCurrency: 'CNY',
        buyAmount: '',
        buyRate: '',
        currentRate: '',
        sellRmb: '',
        purchaseDate: '',
        accountId: '',
        accountName: '',
        note: '',
      },
    };
    return defaults[type] || {};
  };

  const handleAdd = () => {
    const defaults = getDefaultFormData(activeTab);
    if (activeTab === 'realestate') {
      if (stateData.realestateAddType === 'rental') {
        defaults.usage = '出租';
      } else {
        defaults.usage = '自用';
      }
    }
    setEditingItem(null);
    setFormData(defaults);
    setShowModal(true);
  };

  const handleAddSelfUse = () => {
    const defaults = getDefaultFormData('realestate');
    defaults.usage = '自用';
    setEditingItem(null);
    setFormData(defaults);
    setShowModal(true);
  };

  const handleAddRental = () => {
    const defaults = getDefaultFormData('realestate');
    defaults.usage = '出租';
    setEditingItem(null);
    setFormData(defaults);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    const defaults = getDefaultFormData(activeTab);
    if (activeTab === 'insurance' && showInsuranceDetailModal && selectedInsurance && selectedInsurance.id === item.id) {
      setShowInsuranceDetailModal(false);
    }
    const editData = { ...defaults, ...item };
    if (activeTab === 'insurance' && item.insuranceType === '年金险') {
      const records = item.transactionRecords || [];
      editData.paidAmount = records.reduce((sum, r) => sum + parseFloat(r.annualPremium || 0), 0);
      if (records.length > 0) {
        const latestRecord = [...records].sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0)).pop();
        editData.cashValue = parseFloat(latestRecord.yearEndCashValue || 0);
      }
    }
    setEditingItem(item);
    setFormData(editData);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!confirm('确定删除该资产吗？')) return;
    const items = getAssets(activeTab);
    await updateAssets(activeTab, items.filter(i => i.id !== item.id));
  };

  const handleShowVehicleDetail = (item) => {
    setSelectedVehicle(item);
    setShowVehicleDetailModal(true);
  };

  const handleShowInsuranceDetail = (item) => {
    setSelectedInsurance(item);
    setInsurancePaginationPage(1);
    setShowInsuranceDetailModal(true);
  };

  const handleAddInsuranceTransaction = () => {
    setEditingTransaction(null);
    const isAnnuity = selectedInsurance?.insuranceType === '年金险';
    if (isAnnuity) {
      setTransactionFormData({
        year: '',
        annualPremium: '',
        cumulativePremium: '',
        annualGuaranteedAnnuity: '',
        cumulativeGuaranteedReceived: '',
        yearEndCashValue: '',
        annualDividendDemo: '',
        cumulativeDividendDemo: '',
        annualActualDividend: '',
        cumulativeActualDividend: '',
      });
    } else {
      setTransactionFormData({
        year: '',
        premiumPaid: '',
        guaranteedCashValue: '',
        bonusDividend: '',
        midTermDividend: '',
        demoProfitAmount: '',
        demoProfitRate: '',
        actualProfitAmount: '',
        actualProfitRate: '',
        irr: '',
        dividendRealizationRate: '',
      });
    }
    setOcrImage(null);
    setOcrResult(null);
    setOcrLoading(false);
    setSelectedOcrRecords([]);
    setShowInsuranceTransactionModal(true);
  };

  const handleEditInsuranceTransaction = (record) => {
    setEditingTransaction(record);
    setTransactionFormData({ ...record });
    setOcrImage(null);
    setOcrResult(null);
    setOcrLoading(false);
    setShowInsuranceTransactionModal(true);
  };

  const handleOCRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrImage(event.target.result);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOCR = async () => {
    if (!ocrImage) return;
    setOcrLoading(true);

    setTimeout(() => {
      const mockResult = [
        {
          year: '1',
          premiumPaid: '50000',
          guaranteedCashValue: '38334',
          bonusDividend: '0',
          midTermDividend: '0',
          demoProfitAmount: '',
          demoProfitRate: '',
        },
        {
          year: '2',
          premiumPaid: '50000',
          guaranteedCashValue: '38334',
          bonusDividend: '0',
          midTermDividend: '492',
          demoProfitAmount: '',
          demoProfitRate: '',
        },
        {
          year: '3',
          premiumPaid: '50000',
          guaranteedCashValue: '40251',
          bonusDividend: '0',
          midTermDividend: '5394',
          demoProfitAmount: '',
          demoProfitRate: '',
        },
        {
          year: '4',
          premiumPaid: '50000',
          guaranteedCashValue: '42167',
          bonusDividend: '0',
          midTermDividend: '7698',
          demoProfitAmount: '',
          demoProfitRate: '',
        },
        {
          year: '5',
          premiumPaid: '50000',
          guaranteedCashValue: '45468',
          bonusDividend: '0',
          midTermDividend: '9078',
          demoProfitAmount: '',
          demoProfitRate: '',
        },
      ];
      setOcrResult(mockResult);
      setOcrLoading(false);
    }, 1500);
  };

  const handleRunOCRFromAttachment = async () => {
    if (!selectedInsurance || !selectedInsurance.attachments || selectedInsurance.attachments.length === 0) return;
    const imageAttachments = selectedInsurance.attachments.filter(a => a.type && a.type.startsWith('image/'));
    if (imageAttachments.length === 0) {
      alert('附件中没有图片文件，无法识别');
      return;
    }
    const firstImage = imageAttachments[0];
    try {
      const response = await fetch(firstImage.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = (event) => {
        setOcrImage(event.target.result);
        setOcrResult(null);
        setShowInsuranceTransactionModal(true);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load attachment image:', err);
      alert('加载附件图片失败，请手动上传');
    }
  };

  const handleApplyOCRResult = (record) => {
    if (!record) return;
    setTransactionFormData(prev => ({
      ...prev,
      ...record,
    }));
    setOcrImage(null);
    setOcrResult(null);
  };

  const handleApplySelectedOcrRecords = async () => {
    if (!selectedInsurance || selectedOcrRecords.length === 0 || !ocrResult) return;

    const recordsToSave = selectedOcrRecords.map(index => ocrResult[index])
      .filter(record => record.year);

    const currentItems = independentAssets.insurance || [];
    const nextItems = currentItems.map(item => {
      if (item.id === selectedInsurance.id) {
        const existingRecords = item.transactionRecords || [];
        const newRecords = recordsToSave.map(r => ({
          ...r,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${r.year}`,
        }));
        return {
          ...item,
          transactionRecords: [...existingRecords, ...newRecords],
        };
      }
      return item;
    });

    try {
      try {
        await updateAssets('insurance', nextItems);
      } catch (err) {
        console.error('Failed to save OCR transactions:', err);
        try {
          const saved = localStorage.getItem('wealth_os_independent_assets');
          const localAssets = saved ? JSON.parse(saved) : {};
          localAssets.insurance = nextItems;
          localStorage.setItem('wealth_os_independent_assets', JSON.stringify(localAssets));
          const currentData = stateData || {};
          setStateData({
            ...currentData,
            independentAssets: {
              ...(currentData.independentAssets || {}),
              insurance: nextItems,
            },
          });
        } catch (storageErr) {
          console.error('Failed to write fallback to localStorage:', storageErr);
        }
      }
      setSelectedInsurance(nextItems.find(i => i.id === selectedInsurance.id));
    } finally {
      setOcrImage(null);
      setOcrResult(null);
      setSelectedOcrRecords([]);
      setShowInsuranceTransactionModal(false);
      loadData();
    }
  };

  const handleCalculateProjection = () => {
    if (!selectedInsurance) return;
    const records = selectedInsurance.transactionRecords || [];
    if (records.length === 0) {
      alert('暂无交易记录，无法测算');
      return;
    }

    const sortedRecords = records.slice().sort((a, b) => {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      return yearA - yearB;
    });

    const year6Record = sortedRecords.find(r => parseInt(r.year) === 6) || sortedRecords[sortedRecords.length - 1];
    const baseAmount = parseFloat(year6Record.guaranteedCashValue || 0) + parseFloat(year6Record.bonusDividend || 0) + parseFloat(year6Record.midTermDividend || 0);
    const baseGuaranteedCV = parseFloat(year6Record.guaranteedCashValue || 0);
    const totalPremium = parseFloat(selectedInsurance.paidAmount || 0);
    const policyDate = selectedInsurance.policyDate;

    const cvRecords = sortedRecords.filter(r => parseFloat(r.guaranteedCashValue || 0) > 0);
    let cvGrowthRate = 0.005;
    if (cvRecords.length >= 2) {
      const firstCV = parseFloat(cvRecords[0].guaranteedCashValue || 0);
      const lastCV = parseFloat(cvRecords[cvRecords.length - 1].guaranteedCashValue || 0);
      const yearDiff = parseInt(cvRecords[cvRecords.length - 1].year || 0) - parseInt(cvRecords[0].year || 0);
      if (yearDiff > 0 && firstCV > 0) {
        cvGrowthRate = Math.pow(lastCV / firstCV, 1 / yearDiff) - 1;
      }
    }

    const projectionYears = 30;
    const data = [];

    for (let y = 1; y <= projectionYears; y++) {
      const record = sortedRecords.find(r => parseInt(r.year) === y);
      let guaranteedCV, conservativeAmount, neutralAmount, optimisticAmount;

      if (record) {
        guaranteedCV = parseFloat(record.guaranteedCashValue || 0);
        const bonus = parseFloat(record.bonusDividend || 0);
        const midTerm = parseFloat(record.midTermDividend || 0);
        const total = guaranteedCV + bonus + midTerm;
        if (y <= 6) {
          conservativeAmount = total;
          neutralAmount = total;
          optimisticAmount = total;
        } else {
          conservativeAmount = Math.max(baseAmount * Math.pow(1.04, y - 6), guaranteedCV);
          neutralAmount = Math.max(baseAmount * Math.pow(1.05, y - 6), guaranteedCV);
          optimisticAmount = Math.max(baseAmount * Math.pow(1.06, y - 6), guaranteedCV);
        }
      } else {
        const lastRecordYear = sortedRecords.length > 0 ? parseInt(sortedRecords[sortedRecords.length - 1].year || 0) : 0;
        const lastRecordCV = sortedRecords.length > 0 ? parseFloat(sortedRecords[sortedRecords.length - 1].guaranteedCashValue || 0) : 0;
        if (lastRecordYear > 0 && lastRecordCV > 0) {
          guaranteedCV = lastRecordCV * Math.pow(1 + cvGrowthRate, y - lastRecordYear);
        } else {
          guaranteedCV = 0;
        }
        if (y <= 6) {
          conservativeAmount = guaranteedCV;
          neutralAmount = guaranteedCV;
          optimisticAmount = guaranteedCV;
        } else {
          conservativeAmount = Math.max(baseAmount * Math.pow(1.04, y - 6), guaranteedCV);
          neutralAmount = Math.max(baseAmount * Math.pow(1.05, y - 6), guaranteedCV);
          optimisticAmount = Math.max(baseAmount * Math.pow(1.06, y - 6), guaranteedCV);
        }
      }

      let guaranteedXIRR = null, conservativeXIRR = null, neutralXIRR = null, optimisticXIRR = null;
      if (policyDate && totalPremium > 0) {
        const startDate = new Date(policyDate);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + y);

        const gcvXIRR = calculateXIRR([startDate, endDate], [-totalPremium, guaranteedCV]);
        guaranteedXIRR = gcvXIRR;

        const conXIRR = calculateXIRR([startDate, endDate], [-totalPremium, conservativeAmount]);
        conservativeXIRR = conXIRR;

        const neuXIRR = calculateXIRR([startDate, endDate], [-totalPremium, neutralAmount]);
        neutralXIRR = neuXIRR;

        const optXIRR = calculateXIRR([startDate, endDate], [-totalPremium, optimisticAmount]);
        optimisticXIRR = optXIRR;
      }

      let neutralGrowthRate = 0;
      if (y > 1 && data[y - 2] && data[y - 2].neutralAmount > 0) {
        neutralGrowthRate = (neutralAmount - data[y - 2].neutralAmount) / data[y - 2].neutralAmount * 100;
      }

      data.push({
        year: y,
        age: selectedInsurance.insuredAge ? parseInt(selectedInsurance.insuredAge) + y : null,
        guaranteedCV,
        conservativeAmount,
        neutralAmount,
        optimisticAmount,
        guaranteedXIRR,
        conservativeXIRR,
        neutralXIRR,
        optimisticXIRR,
        neutralGrowthRate,
      });
    }

    setCalculationData({
      policyName: selectedInsurance.policyName,
      policyNumber: selectedInsurance.policyNumber,
      insured: selectedInsurance.insured,
      insuredAge: selectedInsurance.insuredAge,
      premium: totalPremium,
      currency: selectedInsurance.currency,
      baseAmount,
      years: data,
    });
    setShowCalculationModal(true);
  };

  const handleDeleteInsuranceTransaction = async (record) => {
    if (!confirm('确定删除该交易记录吗？')) return;
    if (!selectedInsurance) return;
    const currentItems = independentAssets.insurance || [];
    const nextItems = currentItems.map(item => {
      if (item.id === selectedInsurance.id) {
        return {
          ...item,
          transactionRecords: (item.transactionRecords || []).filter(r => r.id !== record.id),
        };
      }
      return item;
    });
    try {
      await updateAssets('insurance', nextItems);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      try {
        const saved = localStorage.getItem('wealth_os_independent_assets');
        const localAssets = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          'wealth_os_independent_assets',
          JSON.stringify({ ...localAssets, insurance: nextItems })
        );
        const currentData = stateData || {};
        setStateData({
          ...currentData,
          independentAssets: {
            ...(currentData.independentAssets || {}),
            insurance: nextItems,
          },
        });
      } catch (storageErr) {
        console.error('Failed to write fallback to localStorage:', storageErr);
      }
    }
    setSelectedInsurance(nextItems.find(i => i.id === selectedInsurance.id));
  };

  const handleSaveInsuranceTransaction = async () => {
    if (!selectedInsurance) return;
    const record = {
      ...transactionFormData,
      id: editingTransaction ? editingTransaction.id : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    const currentItems = independentAssets.insurance || [];
    const nextItems = currentItems.map(item => {
      if (item.id === selectedInsurance.id) {
        const records = item.transactionRecords || [];
        if (editingTransaction) {
          return { ...item, transactionRecords: records.map(r => r.id === record.id ? record : r) };
        }
        return { ...item, transactionRecords: [...records, record] };
      }
      return item;
    });
    try {
      try {
        await updateAssets('insurance', nextItems);
      } catch (err) {
        console.error('Failed to save transaction:', err);
        try {
          const saved = localStorage.getItem('wealth_os_independent_assets');
          const localAssets = saved ? JSON.parse(saved) : {};
          localAssets.insurance = nextItems;
          localStorage.setItem('wealth_os_independent_assets', JSON.stringify(localAssets));
          const currentData = stateData || {};
          const nextState = {
            ...currentData,
            independentAssets: {
              ...(currentData.independentAssets || {}),
              insurance: nextItems,
            },
          };
          setStateData(nextState);
        } catch (storageErr) {
          console.error('Failed to write fallback to localStorage:', storageErr);
        }
      }
      setSelectedInsurance(nextItems.find(i => i.id === selectedInsurance.id));
    } finally {
      setShowInsuranceTransactionModal(false);
      setEditingTransaction(null);
      setTransactionFormData({});
    }
  };

  const handleUpdateTransactionField = async (newRecords) => {
    if (!selectedInsurance) return;
    const currentItems = independentAssets.insurance || [];
    const nextItems = currentItems.map(item => {
      if (item.id === selectedInsurance.id) {
        return { ...item, transactionRecords: newRecords };
      }
      return item;
    });
    // 只更新本地 state，不立即保存到后端（改为关闭时全量保存）
    const currentData = stateData || {};
    setStateData({
      ...currentData,
      independentAssets: {
        ...(currentData.independentAssets || {}),
        insurance: nextItems,
      },
    });
    setSelectedInsurance(nextItems.find(i => i.id === selectedInsurance.id));
    setInsuranceDetailDirty(true);
  };

  // 关闭保险详情时保存所有未保存的更改
  const handleCloseInsuranceDetail = async () => {
    if (insuranceDetailDirty && selectedInsurance) {
      try {
        const currentItems = independentAssets.insurance || [];
        // 关键：使用 selectedInsurance（已包含最新 transactionRecords 修改）
        // 构造 nextItems，而不是使用可能陈旧的 independentAssets.insurance
        const nextItems = currentItems.map(item =>
          item.id === selectedInsurance.id ? selectedInsurance : item
        );
        await updateAssets('insurance', nextItems);
        // 同步本地 stateData，避免保存后列表数据回退
        setStateData(prevState => ({
          ...prevState,
          independentAssets: {
            ...(prevState.independentAssets || {}),
            insurance: nextItems,
          },
        }));
      } catch (err) {
        console.error('Failed to save insurance detail on close:', err);
      }
      setInsuranceDetailDirty(false);
    }
    setShowInsuranceDetailModal(false);
  };

  const handleAttachmentUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedInsurance) return;

    const newAttachments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newAttachments.push({
        name: file.name,
        url: url,
        size: file.size,
        type: file.type,
      });
    }

    const currentItems = independentAssets.insurance || [];
    const nextItems = currentItems.map(item => {
      if (item.id === selectedInsurance.id) {
        return {
          ...item,
          attachments: [...(item.attachments || []), ...newAttachments],
        };
      }
      return item;
    });

    try {
      await updateAssets('insurance', nextItems);
    } catch (err) {
      console.error('Failed to save attachments:', err);
      try {
        const saved = localStorage.getItem('wealth_os_independent_assets');
        const localAssets = saved ? JSON.parse(saved) : {};
        localAssets.insurance = nextItems;
        localStorage.setItem('wealth_os_independent_assets', JSON.stringify(localAssets));
        const currentData = stateData || {};
        setStateData({
          ...currentData,
          independentAssets: {
            ...(currentData.independentAssets || {}),
            insurance: nextItems,
          },
        });
      } catch (storageErr) {
        console.error('Failed to write fallback to localStorage:', storageErr);
      }
    }
    setSelectedInsurance(nextItems.find(i => i.id === selectedInsurance.id));
  };

  const handleDeleteAttachment = async (index) => {
    if (!selectedInsurance) return;

    const currentItems = independentAssets.insurance || [];
    const nextItems = currentItems.map(item => {
      if (item.id === selectedInsurance.id) {
        const attachments = item.attachments || [];
        return {
          ...item,
          attachments: attachments.filter((_, i) => i !== index),
        };
      }
      return item;
    });

    try {
      await updateAssets('insurance', nextItems);
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      try {
        const saved = localStorage.getItem('wealth_os_independent_assets');
        const localAssets = saved ? JSON.parse(saved) : {};
        localAssets.insurance = nextItems;
        localStorage.setItem('wealth_os_independent_assets', JSON.stringify(localAssets));
        const currentData = stateData || {};
        setStateData({
          ...currentData,
          independentAssets: {
            ...(currentData.independentAssets || {}),
            insurance: nextItems,
          },
        });
      } catch (storageErr) {
        console.error('Failed to write fallback to localStorage:', storageErr);
      }
    }
    setSelectedInsurance(nextItems.find(i => i.id === selectedInsurance.id));
  };

  const handleShowPropertyDetails = (item) => {
    setSelectedProperty(item);
    setShowPropertyDetailModal(true);
  };

  const handleShowSelfUseDetails = (item) => {
    setSelectedSelfUseProperty(item);
    setSelfUseMarketPricePerSqm(item.marketPricePerSqm || '');
    setSelfUseMarketArea(item.marketArea || '');
    setShowSelfUseDetailModal(true);
  };

  const handleViewFixedInvestmentDetail = (item) => {
    setSelectedFixedInvestment(item);
    setFixedInvestmentExpandedYears(new Set([new Date().getFullYear().toString()]));
    // 兼容旧数据：补充分红日期、事件类型和现金流字段
    const normalizedRecords = (item.dividendRecords || []).map(r => {
      const dividendDate = r.dividendDate || (r.month ? `${r.month}-01` : '');
      let eventType = r.eventType;
      let cashflow = r.cashflow;
      if (!eventType) {
        const dividendAmount = parseFloat(r.dividendAmount || 0);
        if (dividendAmount > 0) {
          eventType = '分红';
          cashflow = dividendAmount;
        } else {
          eventType = '投入本金';
          const outflow = parseFloat(r.investmentCost || r.buyCost || r.annualContribution || 0);
          cashflow = outflow > 0 ? -outflow : 0;
        }
      }
      return {
        ...r,
        dividendDate,
        month: dividendDate.slice(0, 7),
        eventType,
        cashflow: cashflow !== undefined ? parseFloat(cashflow || 0) : undefined,
      };
    });
    setDividendRecords(normalizedRecords);
    setShowDividendAddForm(false);
    setEditingDividendRecordId(null);
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setNewDividendRecord({
      dividendDate: currentDate,
      eventType: '分红',
      cashflow: '',
      buyCost: '',
    });
    setShowFixedInvestmentDetailModal(true);
  };

  const calculateVehicleResidualValue = (item) => {
    const purchasePrice = parseFloat(item.purchasePrice || 0);
    if (purchasePrice <= 0) {
      return {
        residualValue: 0,
        ageDepreciationRate: 0,
        mileageDepreciationRate: 0,
        combinedDepreciationRate: 0,
        age: 0,
      };
    }

    const now = new Date();
    const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
    let age = 0;
    if (purchaseDate && !isNaN(purchaseDate.getTime()) && purchaseDate <= now) {
      age = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
    }

    let ageDepreciationRate;
    if (age <= 0) {
      ageDepreciationRate = 0;
    } else if (age <= 1) {
      ageDepreciationRate = 0.175;
    } else if (age <= 2) {
      ageDepreciationRate = 0.175 + (age - 1) * 0.1375;
    } else if (age < 10) {
      ageDepreciationRate = 0.3125 + (age - 2) * 0.09;
    } else {
      ageDepreciationRate = 0.7;
    }

    const mileage = parseFloat(item.mileage || 0);
    const maxMileage = 30;
    const perMileageRate = (1 - 0.15) / maxMileage;
    let mileageDepreciationRate = mileage * perMileageRate;
    if (mileageDepreciationRate > 0.95) {
      mileageDepreciationRate = 0.95;
    }

    const combinedDepreciationRate = (ageDepreciationRate + mileageDepreciationRate) / 2;
    let residualValue = purchasePrice * (1 - combinedDepreciationRate);
    const minResidualValue = purchasePrice * 0.05;
    if (residualValue < minResidualValue) {
      residualValue = minResidualValue;
    }

    return {
      residualValue,
      ageDepreciationRate,
      mileageDepreciationRate,
      combinedDepreciationRate,
      age,
    };
  };

  // 获取外汇实时汇率：1 buyCurrency = ? sellCurrency
  const fetchForexRealTimeRate = async () => {
    const buyCurrency = formData.buyCurrency || 'USD';
    const sellCurrency = formData.sellCurrency || 'CNY';
    if (buyCurrency === sellCurrency) {
      setFormData({ ...formData, currentRate: '1' });
      return;
    }
    setForexRateLoading(true);
    try {
      // fetchExchangeRates 返回以 CNY 为基准的汇率表（1 外币 = x CNY）
      const rates = await fetchExchangeRates('CNY');
      const buyToCny = rates[buyCurrency] ?? DEFAULT_EXCHANGE_RATES[buyCurrency] ?? 0;
      const sellToCny = rates[sellCurrency] ?? DEFAULT_EXCHANGE_RATES[sellCurrency] ?? 1;
      if (buyToCny > 0 && sellToCny > 0) {
        const rate = buyToCny / sellToCny;
        setFormData({ ...formData, currentRate: rate.toFixed(4) });
      }
    } catch (err) {
      console.error('获取实时汇率失败:', err);
    } finally {
      setForexRateLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.accountId) {
      alert('请选择账户本');
      return;
    }
    const items = getAssets(activeTab);
    let itemData = { ...formData };
    
    // 股权类型：自动计算市值、盈亏、盈亏比例
    if (activeTab === 'equity') {
      const cost = parseFloat(formData.cost) || 0;
      const quantity = parseFloat(formData.quantity) || 0;
      const currentPrice = parseFloat(formData.currentPrice) || 0;
      
      // 计算市值 = 数量 × 现价
      const marketValue = quantity * currentPrice;
      // 计算盈亏 = 市值 - 成本×数量
      const pnl = marketValue - cost * quantity;
      // 计算盈亏比例
      const pnlRate = cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0;
      
      itemData.marketValue = marketValue > 0 ? marketValue.toFixed(2) : '';
      itemData.pnl = pnl.toFixed(2);
      itemData.pnlRate = pnlRate.toFixed(2);
    }
    
    if (activeTab === 'fixeddeposit') {
      const amount = parseFloat(formData.amount || 0);
      const rate = parseFloat(formData.interestRate || 0);
      const startDate = formData.startDate;
      const endDate = formData.endDate;
      if (amount > 0 && rate > 0 && startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (e > s) {
          const years = (e - s) / (1000 * 60 * 60 * 24 * 365);
          itemData.expectedReturn = (amount * rate / 100 * years).toFixed(2);
        }
      }
    }

    if (activeTab === 'forex') {
      const buyAmount = parseFloat(formData.buyAmount || 0);
      const currentRate = parseFloat(formData.currentRate || 0);
      const sellRmb = parseFloat(formData.sellRmb || 0);
      if (buyAmount > 0 && currentRate > 0 && sellRmb > 0) {
        const currentRmb = buyAmount * currentRate;
        const profitLoss = currentRmb - sellRmb;
        const profitRate = sellRmb > 0 ? (profitLoss / sellRmb) * 100 : 0;
        itemData.profitLoss = profitLoss.toFixed(2);
        itemData.profitRate = profitRate.toFixed(2);
      }
    }

    const newItem = {
      ...itemData,
      id: editingItem?.id || Date.now().toString(),
      createdAt: editingItem?.createdAt || new Date().toISOString(),
    };

    // 编辑模式下保留已有交易记录和其他子数据
    if (editingItem) {
      // 关键：若当前正在查看详情（selectedInsurance/selectedFixedInvestment），
      // 优先使用详情中的最新数据（包含未保存的表单编辑，如年末现金价值等）
      const latestInsuranceRecords =
        activeTab === 'insurance' && selectedInsurance && selectedInsurance.id === editingItem.id
          ? selectedInsurance.transactionRecords
          : null;
      const latestFixedDividendRecords =
        activeTab === 'fixedinvestment' && selectedFixedInvestment && selectedFixedInvestment.id === editingItem.id
          ? selectedFixedInvestment.dividendRecords
          : null;

      if (latestInsuranceRecords) {
        newItem.transactionRecords = latestInsuranceRecords;
      } else if (editingItem.transactionRecords) {
        newItem.transactionRecords = editingItem.transactionRecords;
      }
      if (editingItem.cashValue !== undefined && !itemData.cashValue) {
        newItem.cashValue = editingItem.cashValue;
      }
      // 保留分红险等其他保险类型的特定字段
      if (editingItem.dividendRecords) {
        newItem.dividendRecords = editingItem.dividendRecords;
      }
      // 固定投资：优先使用详情中的最新现金流数据
      if (latestFixedDividendRecords) {
        newItem.dividendRecords = latestFixedDividendRecords;
      }
      // 保留固定投资的现金流数据（旧字段名兜底）
      if (editingItem.cashFlowRecords && !newItem.dividendRecords) {
        newItem.cashFlowRecords = editingItem.cashFlowRecords;
      }
    }

    if (activeTab === 'insurance' && !editingItem && itemData.insuranceType === '年金险') {
      const policyDate = itemData.policyDate ? new Date(itemData.policyDate) : new Date();
      const firstYearEnd = new Date(policyDate);
      firstYearEnd.setFullYear(firstYearEnd.getFullYear() + 1);
      const dateStr = firstYearEnd.toISOString().split('T')[0];

      const firstYearRecord = {
        id: Date.now().toString(),
        year: 1,
        annualPremium: itemData.paidAmount || '',
        cumulativePremium: itemData.paidAmount || '',
        annualGuaranteedAnnuity: '',
        cumulativeGuaranteedReceived: '',
        yearEndCashValue: '',
        annualDividendDemo: '',
        cumulativeDividendDemo: '',
        annualActualDividend: '',
        cumulativeActualDividend: '',
        date: dateStr,
      };
      newItem.transactionRecords = [firstYearRecord];
    }

    if (activeTab === 'insurance' && !editingItem && itemData.insuranceType === '储蓄险') {
      const policyDate = itemData.policyDate ? new Date(itemData.policyDate) : new Date();
      const firstYearEnd = new Date(policyDate);
      firstYearEnd.setFullYear(firstYearEnd.getFullYear() + 1);
      const dateStr = firstYearEnd.toISOString().split('T')[0];

      const firstYearRecord = {
        id: Date.now().toString(),
        year: 1,
        premiumPaid: itemData.paidAmount || '',
        guaranteedCashValue: '',
        bonusDividend: '',
        midTermDividend: '',
        demoProfitAmount: '',
        demoProfitRate: '',
        actualProfitAmount: '',
        actualProfitRate: '',
        irr: '',
        dividendRealizationRate: '',
        date: dateStr,
      };
      newItem.transactionRecords = [firstYearRecord];
    }

    const nextItems = editingItem
      ? items.map(i => i.id === newItem.id ? newItem : i)
      : [...items, newItem];
    try {
      await updateAssets(activeTab, nextItems);
      if (activeTab === 'insurance' && selectedInsurance && editingItem && selectedInsurance.id === editingItem.id) {
        const updatedItem = nextItems.find(i => i.id === editingItem.id);
        if (updatedItem) {
          setSelectedInsurance(updatedItem);
          setShowInsuranceDetailModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to save asset:', err);
      alert('保存失败：' + err.message + '\n数据已写入本地缓存，刷新页面后可见');
      try {
        const saved = localStorage.getItem('wealth_os_independent_assets');
        const localAssets = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          'wealth_os_independent_assets',
          JSON.stringify({ ...localAssets, [activeTab]: nextItems })
        );
        setStateData({
          ...stateData,
          independentAssets: {
            ...stateData.independentAssets,
            [activeTab]: nextItems,
          },
        });
      } catch (storageErr) {
        console.error('Failed to write fallback to localStorage:', storageErr);
      }
      if (activeTab === 'insurance' && selectedInsurance && editingItem && selectedInsurance.id === editingItem.id) {
        const updatedItem = nextItems.find(i => i.id === editingItem.id);
        if (updatedItem) {
          setSelectedInsurance(updatedItem);
          setShowInsuranceDetailModal(true);
        }
      }
    } finally {
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
    }
  };

  const summaryData = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let demoProfit = 0;
    let actualProfit = 0;

    Object.keys(independentAssets).forEach(type => {
      const items = independentAssets[type] || [];
      items.forEach(item => {
        const cur = item.currency || 'CNY';
        if (type === 'insurance') {
          const records = item.transactionRecords || [];
          let cost = 0;
          let value = 0;
          if (item.insuranceType === '年金险') {
            const sumAnnualPremium = records.reduce((sum, r) => sum + parseFloat(r.annualPremium || 0), 0);
            const latestRecord = records.length > 0
              ? [...records].sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0)).pop()
              : null;
            const latestCashValue = latestRecord ? parseFloat(latestRecord.yearEndCashValue || 0) : parseFloat(item.cashValue || 0);
            cost = sumAnnualPremium > 0 ? sumAnnualPremium : parseFloat(item.paidAmount || 0);
            value = latestCashValue > 0 ? latestCashValue : cost;
          } else {
            cost = parseFloat(item.paidAmount || 0);
            const cash = parseFloat(item.cashValue || 0);
            value = cash > 0 ? cash : cost;
          }
          totalValue += toCNY(value, cur);
          totalCost += toCNY(cost, cur);
          demoProfit += toCNY(item.demoProfitAmount || 0, cur);
          actualProfit += toCNY(item.actualProfitAmount || 0, cur);
        } else if (type === 'realestate') {
          if (item.usage === '出租') {
            totalValue += toCNY(item.purchasePrice || 0, cur);
          } else {
            const marketValue = parseFloat(item.marketValue || 0);
            const taxAmount = parseFloat(item.taxAmount || 0);
            const agencyFeeAmount = parseFloat(item.agencyFeeAmount || 0);
            const actualValue = marketValue > 0 ? (marketValue - taxAmount - agencyFeeAmount) : parseFloat(item.purchasePrice || 0);
            totalValue += toCNY(actualValue, cur);
          }
          totalCost += toCNY(item.purchasePrice || 0, cur);
        } else if (type === 'vehicle') {
          const { residualValue } = calculateVehicleResidualValue(item);
          totalValue += toCNY(residualValue, cur);
          totalCost += toCNY(item.purchasePrice || 0, cur);
        } else if (type === 'fixedinvestment') {
          totalValue += toCNY(item.investmentCost || 0, cur);
          totalCost += toCNY(item.investmentCost || 0, cur);
          if (item.dividendRecords && Array.isArray(item.dividendRecords)) {
            actualProfit += toCNY(
              item.dividendRecords.reduce((sum, r) => sum + parseFloat(r.dividendAmount || 0), 0),
              cur
            );
          } else {
            const cost = parseFloat(item.investmentCost || 0);
            const rate = parseFloat(item.annualDividendRate || 0);
            if (cost && rate) {
              actualProfit += toCNY(cost * rate / 100, cur);
            } else {
              actualProfit += toCNY(item.dividendAmount || 0, cur);
            }
          }
        } else if (type === 'equity') {
          totalValue += toCNY(item.marketValue || 0, cur);
          totalCost += toCNY(item.investmentCost || 0, cur);
          actualProfit += toCNY(item.pnl || 0, cur);
        } else if (type === 'fixeddeposit') {
          totalValue += toCNY(item.amount || 0, cur);
          totalCost += toCNY(item.amount || 0, cur);
          actualProfit += toCNY(item.actualReturn || 0, cur);
        } else if (type === 'survivalfund') {
          const amount = parseFloat(item.amount || 0);
          totalValue += toCNY(amount, cur);
          totalCost += toCNY(amount, cur);
        }
      });
    });

    return { totalValue, totalCost, demoProfit, actualProfit };
  }, [independentAssets, exchangeRates]);

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">总价值</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalValue)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">总成本</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalCost)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white shadow-lg shadow-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">演示收益</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.demoProfit)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white shadow-lg shadow-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">实际收益</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.actualProfit)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );

  const hasLinkedAccounts = Object.values(independentAssets).some(items =>
    items.some(item => item.accountId)
  );

  const renderAccountsTable = () => {
    const usedAccountIds = new Set();
    Object.values(independentAssets).forEach(items => {
      items.forEach(item => {
        if (item.accountId) {
          usedAccountIds.add(item.accountId);
        }
        if (item.accountName) {
          usedAccountIds.add(item.accountName);
        }
      });
    });

    const filteredAccounts = accounts.filter(account => {
      const accKey = account.id || account.name;
      if (usedAccountIds.size > 0 && !usedAccountIds.has(accKey) && !usedAccountIds.has(account.id) && !usedAccountIds.has(account.name)) return false;
      if (filters.accountName && !account.name.includes(filters.accountName)) return false;
      if (filters.accountCategory && account.category !== filters.accountCategory) return false;
      return true;
    });

    const totalBalance = filteredAccounts.reduce((s, a) => s + (a.balance || 0), 0);
    const accountCount = filteredAccounts.length;

    return (
      <section className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100/80 dark:border-slate-700/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">📒 账户本</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              共 {accountCount} 个账户
            </span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索账户..."
              value={filters.accountName || ''}
              onChange={(e) => setFilters({ ...filters, accountName: e.target.value })}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {filteredAccounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAccounts.map(account => {
              const accKey = account.id || account.name;
              let marketValue = 0;
              let purchaseCost = 0;
              let profitLoss = 0;
              let profitLossRate = 0;
              let fees = 0;
              let actualValue = 0;

              Object.entries(independentAssets).forEach(([assetType, items]) => {
                items.forEach(item => {
                  const itemKey = item.accountId || item.accountName;
                  if (item.accountId === account.id || item.accountId === accKey || item.accountName === account.name || itemKey === accKey) {
                    const cur = item.currency || 'CNY';
                    if (assetType === 'realestate') {
                      if (item.usage === '出租') {
                        const purchasePrice = parseFloat(item.purchasePrice || 0);
                        marketValue += toCNY(purchasePrice, cur);
                        purchaseCost += toCNY(purchasePrice, cur);
                        actualValue += toCNY(purchasePrice, cur);
                      } else {
                        const mv = parseFloat(item.marketValue || 0);
                        const pp = parseFloat(item.purchasePrice || 0);
                        const tax = parseFloat(item.taxAmount || 0);
                        const agency = parseFloat(item.agencyFeeAmount || 0);
                        const pl = parseFloat(item.profitLossAmount || 0);
                        
                        marketValue += toCNY(mv > 0 ? mv : pp, cur);
                        purchaseCost += toCNY(pp, cur);
                        profitLoss += toCNY(pl, cur);
                        fees += toCNY(tax + agency, cur);
                        actualValue += toCNY(mv > 0 ? (mv - tax - agency) : pp, cur);
                      }
                    } else if (assetType === 'vehicle') {
                      const { residualValue } = calculateVehicleResidualValue(item);
                      const pp = parseFloat(item.purchasePrice || 0);
                      marketValue += toCNY(residualValue, cur);
                      purchaseCost += toCNY(pp, cur);
                      profitLoss += toCNY(residualValue - pp, cur);
                      actualValue += toCNY(residualValue, cur);
                    } else if (assetType === 'insurance') {
                      const records = item.transactionRecords || [];
                      let cost = 0;
                      let cash = 0;
                      if (item.insuranceType === '年金险') {
                        const sumAnnualPremium = records.reduce((s, r) => s + parseFloat(r.annualPremium || 0), 0);
                        const latestRecord = records.length > 0
                          ? [...records].sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0)).pop()
                          : null;
                        const latestCash = latestRecord ? parseFloat(latestRecord.yearEndCashValue || 0) : parseFloat(item.cashValue || 0);
                        cost = sumAnnualPremium > 0 ? sumAnnualPremium : parseFloat(item.paidAmount || 0);
                        cash = latestCash > 0 ? latestCash : cost;
                      } else {
                        cost = parseFloat(item.paidAmount || 0);
                        const c = parseFloat(item.cashValue || 0);
                        cash = c > 0 ? c : cost;
                      }
                      purchaseCost += toCNY(cost, cur);
                      marketValue += toCNY(cash, cur);
                      actualValue += toCNY(cash, cur);
                      profitLoss += toCNY(cash - cost, cur);
                    } else if (assetType === 'fixedinvestment') {
                      const cost = parseFloat(item.investmentCost || 0);
                      marketValue += toCNY(cost, cur);
                      purchaseCost += toCNY(cost, cur);
                      actualValue += toCNY(cost, cur);
                    } else if (assetType === 'equity') {
                      const mv = parseFloat(item.marketValue || 0);
                      const qty = parseFloat(item.quantity || 0);
                      const unitCost = parseFloat(item.cost || 0);
                      // 持仓成本 = 数量 × 单价（与列表 holdingCost 计算一致）
                      const totalCost = qty * unitCost;
                      marketValue += toCNY(mv, cur);
                      purchaseCost += toCNY(totalCost, cur);
                      profitLoss += toCNY(item.pnl || 0, cur);
                      actualValue += toCNY(mv, cur);
                    } else if (assetType === 'fixeddeposit') {
                      const amount = parseFloat(item.amount || 0);
                      const actualReturn = parseFloat(item.actualReturn || 0);
                      marketValue += toCNY(amount + actualReturn, cur);
                      purchaseCost += toCNY(amount, cur);
                      profitLoss += toCNY(actualReturn, cur);
                      actualValue += toCNY(amount + actualReturn, cur);
                    } else if (assetType === 'survivalfund') {
                      const amount = parseFloat(item.amount || 0);
                      marketValue += toCNY(amount, cur);
                      purchaseCost += toCNY(amount, cur);
                      actualValue += toCNY(amount, cur);
                    }
                  }
                });
              });

              profitLossRate = purchaseCost > 0 ? (profitLoss / purchaseCost) * 100 : 0;

              return (
                <div key={account.id || account.name} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{account.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {account.category || '未分类'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-gray-400 mb-0.5">当前市值</p>
                      <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(marketValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">持有成本</p>
                      <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(purchaseCost)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">实际现值</p>
                      <p className="font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(actualValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">持有盈亏</p>
                      <p className={`font-bold tabular-nums ${profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatCurrency(profitLoss)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">收益率</p>
                      <p className={`font-bold tabular-nums ${profitLossRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {profitLossRate >= 0 ? '+' : ''}{profitLossRate.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">手续费</p>
                      <p className="font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(fees)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">暂无账户数据</div>
        )}

        {accountCount > 1 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 grid grid-cols-2 gap-3 text-center text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">账户数</p>
              <p className="font-semibold tabular-nums text-gray-900 dark:text-white">{accountCount}个</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">合计余额</p>
              <p className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderInsuranceTable = () => {
    const items = getAssets('insurance');
    // 合计：将所有币种按汇率折算到选定的统计币种（insuranceTotalCurrency）后汇总
    const insuranceTotals = items.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = insuranceTotalCurrency;
      const records = item.transactionRecords || [];
      const isAnnuity = item.insuranceType === '年金险';
      let listPaid = 0;
      let listCash = 0;
      let listDiv = 0;
      let listCurYearDiv = 0;
      const currentYear = new Date().getFullYear();
      const policyYear = item.policyDate ? new Date(item.policyDate).getFullYear() : null;
      if (isAnnuity) {
        listPaid = records.reduce((s, r) => s + parseFloat(r.annualPremium || 0), 0);
        if (records.length > 0) {
          const latest = [...records].sort((a, b) => {
            const va = a.year || '';
            const vb = b.year || '';
            if ((/^\d{4}-\d{2}$/.test(va) || /^\d{4}$/.test(va)) && (/^\d{4}-\d{2}$/.test(vb) || /^\d{4}$/.test(vb))) {
              return va.localeCompare(vb);
            }
            return (parseInt(va) || 0) - (parseInt(vb) || 0);
          }).pop();
          listCash = parseFloat(latest?.yearEndCashValue || 0);
        } else {
          listCash = parseFloat(item.cashValue || 0);
        }
        listDiv = records.reduce((s, r) => s + parseFloat(r.annualActualDividend || 0), 0);
        // 当年分红额：支持 YYYY-MM 格式和纯保单年度格式
        listCurYearDiv = records
          .filter(r => {
            const yearVal = r.year || '';
            if (/^\d{4}-\d{2}$/.test(yearVal)) {
              return parseInt(yearVal.slice(0, 4), 10) === currentYear;
            }
            const py = parseInt(yearVal || 0, 10);
            return policyYear && py > 0 && (policyYear + py - 1 === currentYear);
          })
          .reduce((s, r) => s + parseFloat(r.annualActualDividend || 0), 0);
      } else {
        listPaid = parseFloat(item.paidAmount || 0);
        listCash = parseFloat(item.cashValue || 0);
        listDiv = records.reduce((s, r) => s + parseFloat(r.bonusDividend || 0) + parseFloat(r.midTermDividend || 0), 0);
        // 当年分红额：支持 YYYY-MM 格式和纯保单年度格式
        listCurYearDiv = records
          .filter(r => {
            const yearVal = r.year || '';
            if (/^\d{4}-\d{2}$/.test(yearVal)) {
              return parseInt(yearVal.slice(0, 4), 10) === currentYear;
            }
            const py = parseInt(yearVal || 0, 10);
            return policyYear && py > 0 && (policyYear + py - 1 === currentYear);
          })
          .reduce((s, r) => s + parseFloat(r.actualProfitAmount || 0), 0);
      }
      acc.paid += convertAmount(listPaid, cur, targetCur, exchangeRates);
      acc.cash += convertAmount(listCash, cur, targetCur, exchangeRates);
      acc.dividend += convertAmount(listDiv, cur, targetCur, exchangeRates);
      acc.curYearDividend += convertAmount(listCurYearDiv, cur, targetCur, exchangeRates);
      return acc;
    }, { paid: 0, cash: 0, dividend: 0, curYearDividend: 0 });
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">保险资产</h3>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保单号码</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保险类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保险名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">受保人</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">受益人</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保单日期</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保单状况</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">缴纳方式</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">已付金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">现金价值</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">累计分红额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">当年分红额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">货币单位</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => {
                const records = item.transactionRecords || [];
                const isAnnuity = item.insuranceType === '年金险';

                let listPaidAmount = parseFloat(item.paidAmount || 0);
                let listCashValue = parseFloat(item.cashValue || 0);
                let listDividend = 0;

                if (isAnnuity) {
                  listPaidAmount = records.reduce((sum, r) => sum + parseFloat(r.annualPremium || 0), 0);
                  if (records.length > 0) {
                    const sortedByYear = [...records].sort((a, b) => {
                      const va = a.year || '';
                      const vb = b.year || '';
                      if ((/^\d{4}-\d{2}$/.test(va) || /^\d{4}$/.test(va)) && (/^\d{4}-\d{2}$/.test(vb) || /^\d{4}$/.test(vb))) {
                        return va.localeCompare(vb);
                      }
                      return (parseInt(va) || 0) - (parseInt(vb) || 0);
                    });
                    const latestRecord = sortedByYear[sortedByYear.length - 1];
                    listCashValue = parseFloat(latestRecord.yearEndCashValue || 0);
                  }
                  listDividend = records.reduce((sum, r) => sum + parseFloat(r.annualActualDividend || 0), 0);
                } else {
                  listDividend = records.reduce((sum, r) => {
                    return sum + parseFloat(r.bonusDividend || 0) + parseFloat(r.midTermDividend || 0);
                  }, 0);
                }

                // 当年分红额 = 明细弹窗中当年的实际分红额汇总
                // 支持两种 year 格式：纯数字（保单年度 1/2/3...）和 YYYY-MM（年月）
                //   纯数字年度：按（保单日期年份 + 保单年度 - 1）== 当前自然年匹配
                //   YYYY-MM：按 year.slice(0,4) == 当前自然年匹配
                // 年金险：当年实际红利 = annualActualDividend；非年金险：实际分红额 = actualProfitAmount
                let currentYearDividend = 0;
                const currentYear = new Date().getFullYear();
                const policyYear = item.policyDate ? new Date(item.policyDate).getFullYear() : null;
                if (records.length > 0) {
                  const yearMatchedRecords = records.filter(r => {
                    const yearVal = r.year || '';
                    // YYYY-MM 格式：直接比较年份部分
                    if (/^\d{4}-\d{2}$/.test(yearVal)) {
                      return parseInt(yearVal.slice(0, 4), 10) === currentYear;
                    }
                    // 纯数字年度格式（保单年度序号）
                    const py = parseInt(yearVal || 0, 10);
                    return policyYear && py > 0 && (policyYear + py - 1 === currentYear);
                  });
                  if (isAnnuity) {
                    currentYearDividend = yearMatchedRecords
                      .reduce((s, r) => s + parseFloat(r.annualActualDividend || 0), 0);
                  } else {
                    currentYearDividend = yearMatchedRecords
                      .reduce((s, r) => s + parseFloat(r.actualProfitAmount || 0), 0);
                  }
                }

                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.policyNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.insuranceType || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{sanitizeText(item.policyName, item.policyName) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.insured || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.beneficiary || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.policyDate || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.policyStatus || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.paymentMethod || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(listPaidAmount, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(listCashValue, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(listDividend, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400">{formatCurrency(currentYearDividend, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleShowInsuranceDetail(item)} className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                          明细
                        </button>
                        <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                          编辑
                        </button>
                        <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无保险资产数据</td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={8}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={insuranceTotalCurrency}
                        onChange={(e) => setInsuranceTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(insuranceTotals.paid, insuranceTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(insuranceTotals.cash, insuranceTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(insuranceTotals.dividend, insuranceTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{formatCurrency(insuranceTotals.curYearDividend, insuranceTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{insuranceTotalCurrency}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRealEstateTable = () => {
    const items = getAssets('realestate');
    const selfUseItems = items.filter(i => i.usage !== '出租');
    const rentalItems = items.filter(i => i.usage === '出租');

    // 自用房合计
    const selfUseTotals = selfUseItems.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = realEstateTotalCurrency;
      acc.purchasePrice += convertAmount(parseFloat(item.purchasePrice || 0), cur, targetCur, exchangeRates);
      acc.marketValue += convertAmount(parseFloat(item.marketValue || 0), cur, targetCur, exchangeRates);
      acc.profitLoss += convertAmount(parseFloat(item.profitLossAmount || 0), cur, targetCur, exchangeRates);
      return acc;
    }, { purchasePrice: 0, marketValue: 0, profitLoss: 0 });

    // 出租房合计
    const rentalTotals = rentalItems.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = realEstateTotalCurrency;
      acc.rentAmount += convertAmount(parseFloat(item.rentAmount || 0), cur, targetCur, exchangeRates);
      acc.depositAmount += convertAmount(parseFloat(item.depositAmount || 0), cur, targetCur, exchangeRates);
      const rentalStats = calculateRentalStats(item);
      acc.cumulativeIncome += convertAmount(parseFloat(rentalStats.cumulativeIncome || 0), cur, targetCur, exchangeRates);
      return acc;
    }, { rentAmount: 0, depositAmount: 0, cumulativeIncome: 0 });

    return (
      <div className="space-y-6">
        {selfUseItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">自用房产</h3>
              <button onClick={handleAddSelfUse} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                <span>新增</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">国家</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">省份</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">市区</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">地区</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">购买类型</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">每平方米价格</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">面积</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">购买价</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">税费</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">中介费</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">市场估值</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">涨跌额</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">涨跌幅</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {selfUseItems.map(item => {
                    const taxAmount = parseFloat(item.taxAmount || 0);
                    const agencyFeeAmount = parseFloat(item.agencyFeeAmount || 0);
                    const marketValue = parseFloat(item.marketValue || 0);
                    const profitLossAmount = parseFloat(item.profitLossAmount || 0);
                    const profitLossRate = parseFloat(item.profitLossRate || 0);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.country}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.province}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.city}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.district}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.purchaseType || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.pricePerSqm ? formatCurrency(item.pricePerSqm, item.currency) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.area ? `${item.area} ㎡` : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.purchasePrice ? formatCurrency(item.purchasePrice, item.currency) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{taxAmount > 0 ? formatCurrency(taxAmount, item.currency) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{agencyFeeAmount > 0 ? formatCurrency(agencyFeeAmount, item.currency) : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{marketValue > 0 ? formatCurrency(marketValue, item.currency) : '—'}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${profitLossAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {marketValue > 0 ? formatCurrency(profitLossAmount, item.currency) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${profitLossRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {marketValue > 0 ? `${profitLossRate >= 0 ? '+' : ''}${profitLossRate.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleShowSelfUseDetails(item)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">明细</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {selfUseItems.length > 0 && (
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                      <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={8}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>合计</span>
                          <select
                            value={realEstateTotalCurrency}
                            onChange={(e) => setRealEstateTotalCurrency(e.target.value)}
                            className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          >
                            {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(selfUseTotals.purchasePrice, realEstateTotalCurrency)}</td>
                      <td colSpan={2}></td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(selfUseTotals.marketValue, realEstateTotalCurrency)}</td>
                      <td className={`px-4 py-3 text-sm ${selfUseTotals.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{formatCurrency(selfUseTotals.profitLoss, realEstateTotalCurrency)}</td>
                      <td></td>
                      <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{realEstateTotalCurrency}</td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rentalItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">出租房产</h3>
              <button onClick={handleAddRental} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                <span>新增</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">国家</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">省份</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">市区</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">地区</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">出租方式</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">租金</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">押金</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">起租时间</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">到期时间</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">是否出租</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">累计收益</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">累计收益率</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">IRR收益率</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {rentalItems.map(item => {
                    const rentalStats = calculateRentalStats(item);
                    return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.country}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.province}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.district}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.rentMethod || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.rentAmount ? formatCurrency(item.rentAmount, item.currency) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.depositAmount ? formatCurrency(item.depositAmount, item.currency) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.startDate || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.endDate || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.isRented || '—'}</td>
                      <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-medium">{rentalStats.cumulativeIncome !== 0 ? formatCurrency(rentalStats.cumulativeIncome, item.currency) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400 font-medium">{rentalStats.cumulativeYield}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 font-medium">{rentalStats.irrDisplay}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleShowPropertyDetails(item)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">明细</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {rentalItems.length > 0 && (
                    <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                      <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={6}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>合计</span>
                          <select
                            value={realEstateTotalCurrency}
                            onChange={(e) => setRealEstateTotalCurrency(e.target.value)}
                            className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          >
                            {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(rentalTotals.rentAmount, realEstateTotalCurrency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(rentalTotals.depositAmount, realEstateTotalCurrency)}</td>
                      <td colSpan={3}></td>
                      <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(rentalTotals.cumulativeIncome, realEstateTotalCurrency)}</td>
                      <td colSpan={2}></td>
                      <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{realEstateTotalCurrency}</td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">房产资产</h3>
              <div className="flex gap-2">
                <button onClick={handleAddSelfUse} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>新增自用</span>
                </button>
                <button onClick={handleAddRental} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>新增出租</span>
                </button>
              </div>
            </div>
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无房产资产数据</div>
          </div>
        )}
      </div>
    );
  };

  const renderVehicleTable = () => {
    const items = getAssets('vehicle');

    // 车辆合计
    const vehicleTotals = items.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = vehicleTotalCurrency;
      const { residualValue } = calculateVehicleResidualValue(item);
      acc.purchasePrice += convertAmount(parseFloat(item.purchasePrice || 0), cur, targetCur, exchangeRates);
      acc.residualValue += convertAmount(parseFloat(residualValue || 0), cur, targetCur, exchangeRates);
      return acc;
    }, { purchasePrice: 0, residualValue: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">车辆资产</h3>
          <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">厂商</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">型号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">购买价格</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">现车残值</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">折损率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => {
                const { residualValue } = calculateVehicleResidualValue(item);
                const purchasePrice = parseFloat(item.purchasePrice || 0);
                const depreciationRate = purchasePrice > 0 ? ((purchasePrice - residualValue) / purchasePrice) * 100 : 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.vehicleType}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.manufacturer}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.model}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(residualValue, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{depreciationRate.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleShowVehicleDetail(item)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          明细
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无车辆资产数据</td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={3}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={vehicleTotalCurrency}
                        onChange={(e) => setVehicleTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(vehicleTotals.purchasePrice, vehicleTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(vehicleTotals.residualValue, vehicleTotalCurrency)}</td>
                  <td></td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{vehicleTotalCurrency}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 计算单条固定投资在列表中显示所需的统计数据
  const calculateFixedInvestmentStats = (item) => {
    const records = (item.dividendRecords || []).map(r => ({
      ...r,
      dividendDate: r.dividendDate || (r.month ? `${r.month}-01` : ''),
    }));
    const sorted = [...records].sort((a, b) =>
      (b.dividendDate || '').localeCompare(a.dividendDate || '')
    );
    const getEventType = (r) => {
      if (r.eventType) return r.eventType;
      return parseFloat(r.dividendAmount || 0) > 0 ? '分红' : '投入本金';
    };
    const getCashflow = (r) => {
      if (r.cashflow !== undefined) return parseFloat(r.cashflow || 0);
      const et = getEventType(r);
      if (et === '分红') return Math.abs(parseFloat(r.dividendAmount || 0));
      const out = parseFloat(r.investmentCost || r.buyCost || r.annualContribution || 0);
      return out > 0 ? -out : 0;
    };
    const getCostBasis = (r) => {
      const et = getEventType(r);
      if (et === '分红') return parseFloat(r.buyCost || r.investmentCost || 0);
      return Math.abs(getCashflow(r));
    };

    const totalDividend = sorted.reduce((s, r) => s + (getCashflow(r) > 0 ? getCashflow(r) : 0), 0);
    // 当年分红 = 当前自然年所有现金流的总和（含负数）
    const currentYear = new Date().getFullYear();
    const currentYearDividend = sorted.reduce((s, r) => {
      const dateStr = r.dividendDate || '';
      const year = parseInt(dateStr.slice(0, 4), 10);
      if (isNaN(year) || year !== currentYear) return s;
      return s + getCashflow(r);
    }, 0);
    const totalBuyCost = sorted.reduce((s, r) => s + getCostBasis(r), 0);
    const investmentCost = parseFloat(item.investmentCost || 0);
    const annualContribution = parseFloat(item.annualContribution || 0);
    const totalInvested = investmentCost + annualContribution;

    const dividendRate = totalInvested > 0 && totalDividend > 0
      ? ((totalDividend / totalInvested) * 100).toFixed(2) + '%'
      : '—';

    // IRR (XIRR) 计算
    let irr = null;
    const cashflows = [];
    const dates = [];
    sorted.forEach(r => {
      const ds = r.dividendDate;
      if (!ds) return;
      const amt = getCashflow(r);
      if (amt === 0 || isNaN(amt)) return;
      const parts = ds.split('-').map(Number);
      let d;
      if (parts.length === 3) d = new Date(parts[0], parts[1] - 1, parts[2]);
      else if (parts.length === 2) d = new Date(parts[0], parts[1] - 1, 1);
      else return;
      cashflows.push(amt);
      dates.push(d);
    });
    if (cashflows.length >= 2 && cashflows.some(c => c > 0) && cashflows.some(c => c < 0)) {
      // 内联 XIRR 简化版
      const baseDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const npv = (rate) => cashflows.reduce((s, cf, i) => {
        const days = (dates[i] - baseDate) / 86400000;
        return s + cf / Math.pow(1 + rate, days / 365);
      }, 0);
      let rate = 0.1;
      for (let i = 0; i < 100; i++) {
        const n = npv(rate);
        if (Math.abs(n) < 1e-8) { irr = rate; break; }
        const d = (npv(rate + 1e-8) - n) / 1e-8;
        if (Math.abs(d) < 1e-12) break;
        rate -= n / d;
      }
      if (irr === null) {
        let lo = -0.99, hi = 10;
        for (let i = 0; i < 100; i++) {
          const mid = (lo + hi) / 2;
          const n = npv(mid);
          if (Math.abs(n) < 1e-8) { irr = mid; break; }
          if (n > 0) lo = mid; else hi = mid;
        }
      }
    }
    const irrDisplay = irr !== null ? `${(irr * 100).toFixed(2)}%` : '—';

    return { totalInvested, totalDividend, currentYearDividend, dividendRate, irrDisplay };
  };

  const calculateRentalStats = (item) => {
    const startDate = item.startDate ? new Date(item.startDate) : null;
    const endDate = item.endDate ? new Date(item.endDate) : null;
    const rentAmount = parseFloat(item.rentAmount || 0);
    
    const totalMonths = startDate && endDate && endDate > startDate
      ? Math.max(0, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)))
      : 0;

    const generatePaymentRecords = () => {
      if (!startDate || !endDate || totalMonths <= 0) return [];
      const records = item.paymentRecords || [];
      if (records.length > 0) {
        return records.map(r => ({
          ...r,
          rentalStatus: r.rentalStatus || '已出租',
          isTerminated: r.isTerminated || '未退租',
          refundAmount: r.refundAmount !== undefined ? r.refundAmount : (r.isTerminated === '已退租' ? rentAmount : 0),
        }));
      }

      const result = [];
      for (let i = 0; i < totalMonths; i++) {
        const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        result.push({
          id: `pay-${item.id}-${i}`,
          dueDate: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`,
          received: 0,
          status: 'unpaid',
        });
      }
      return result;
    };

    const paymentRecords = generatePaymentRecords();

    const cumulativeIncome = paymentRecords.reduce((sum, r) => {
      if (r.status !== 'paid') return sum;
      return sum + parseFloat(r.received || 0);
    }, 0);

    const holdingCost = parseFloat(item.holdingCost || 0);
    const cumulativeYield = holdingCost > 0 && cumulativeIncome > 0
      ? ((cumulativeIncome / holdingCost) * 100).toFixed(2) + '%'
      : '—';

    const cashflows = [];
    const dates = [];
    if (holdingCost > 0 && startDate) {
      cashflows.push(-holdingCost);
      dates.push(new Date(startDate));
    }
    paymentRecords.forEach(r => {
      if (r.status !== 'paid') return;
      const received = parseFloat(r.received || 0);
      if (received <= 0 || !r.dueDate) return;
      const parts = r.dueDate.split('-').map(Number);
      if (parts.length < 2) return;
      const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
      cashflows.push(received);
      dates.push(d);
    });
    const irr = (cashflows.length >= 2 && cashflows.some(c => c > 0) && cashflows.some(c => c < 0))
      ? calculateXIRR(cashflows, dates)
      : null;
    const irrDisplay = irr !== null ? `${(irr * 100).toFixed(2)}%` : '—';

    return { cumulativeIncome, cumulativeYield, irrDisplay };
  };

  const renderFixedInvestmentTable = () => {
    const items = getAssets('fixedinvestment');

    // 固定投资合计
    const fixedInvTotals = items.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = fixedInvestmentTotalCurrency;
      const listStats = calculateFixedInvestmentStats(item);
      acc.investmentCost += convertAmount(parseFloat(item.investmentCost || 0), cur, targetCur, exchangeRates);
      acc.totalInvested += convertAmount(parseFloat(listStats.totalInvested || 0), cur, targetCur, exchangeRates);
      acc.totalDividend += convertAmount(parseFloat(listStats.totalDividend || 0), cur, targetCur, exchangeRates);
      acc.currentYearDividend += convertAmount(parseFloat(listStats.currentYearDividend || 0), cur, targetCur, exchangeRates);
      return acc;
    }, { investmentCost: 0, totalInvested: 0, totalDividend: 0, currentYearDividend: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">固定投资</h3>
          <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">国家</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">省份</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">地区</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">投入本金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">累计投入本金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">分红频率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">累计分红</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">当年分红</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">累计分红率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">IRR 分红率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => {
                const listStats = calculateFixedInvestmentStats(item);
                return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.country}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.province}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.investmentCost, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(listStats.totalInvested, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.dividendFrequency || '每年'}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{formatCurrency(listStats.totalDividend, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{formatCurrency(listStats.currentYearDividend, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400">{listStats.dividendRate}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">{listStats.irrDisplay}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewFixedInvestmentDetail(item)} className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                        明细
                      </button>
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                        编辑
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无固定投资数据</td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={4}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={fixedInvestmentTotalCurrency}
                        onChange={(e) => setFixedInvestmentTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(fixedInvTotals.investmentCost, fixedInvestmentTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(fixedInvTotals.totalInvested, fixedInvestmentTotalCurrency)}</td>
                  <td></td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{formatCurrency(fixedInvTotals.totalDividend, fixedInvestmentTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{formatCurrency(fixedInvTotals.currentYearDividend, fixedInvestmentTotalCurrency)}</td>
                  <td></td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{fixedInvestmentTotalCurrency}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEquityTable = () => {
    // 通过 holdings.id 找到独立资产中的原始对象，保证编辑/删除操作的数据源正确
    const findRawEquityItem = (holding) => {
      const items = independentAssets.equity || [];
      return items.find(it => it.id === holding.id) || holding;
    };

    const handleEquityEdit = (holding) => {
      if (!holding) return;
      handleEdit(findRawEquityItem(holding));
    };
    const handleEquityDelete = (holding) => {
      if (!holding) return;
      handleDelete(findRawEquityItem(holding));
    };

    // 股权列表使用与理财模块完全一致的 FinanceHoldingsTable 组件
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">股权</h3>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>

        {equityHoldings.length > 0 ? (
          <FinanceHoldingsTable
            key="independent_equity"
            categoryName="independent_equity"
            holdings={equityHoldings}
            colorIdx={0}
            onEdit={handleEquityEdit}
            onDelete={handleEquityDelete}
            onDetail={null}
            onAdd={handleAdd}
            onBatchEdit={null}
            marketOptions={EQUITY_MARKET_OPTIONS}
            currencyOptions={EQUITY_CURRENCY_SUGGESTIONS}
            assetTypeOptions={['股票']}
            assetClassOptions={equityCategoryL1Options}
            positionGroupOptions={equityPositionGroupOptions}
            positionTypeOptions={equityPositionTypeOptions}
            allCategoryL2Options={equityAllCategoryL2Options}
            tags={equityTags}
            marketGroups={EQUITY_MARKET_GROUPS}
            categoryL3CustomOptions={['场内', '场外']}
            categoryL4Options={{}}
            selectedCurrency="CNY"
            exchangeRates={exchangeRates}
            financeAccounts={equityFinanceAccounts}
            assetKindOptions={equityAssetKindOptions}
            moneyFundMap={{}}
            accountOptions={accounts.filter(acc => acc.type !== '理财资产' && acc.type !== '打新' && acc.type !== '负债' && !acc.liability).map(acc => acc.name || acc.id)}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-700">
            <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">暂无股权数据</p>
            <button
              onClick={handleAdd}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 active:scale-[0.97] transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> 新增持仓
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderFixedDepositTable = () => {
    const items = getAssets('fixeddeposit');

    // 定期资产合计
    const fdTotals = items.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = fixedDepositTotalCurrency;
      const calcAmount = parseFloat(item.amount || 0);
      const calcRate = parseFloat(item.interestRate !== undefined && item.interestRate !== '' ? item.interestRate : (item.interest || 0));
      const calcYears = (() => {
        if (!item.startDate || !item.endDate) return 0;
        const s = new Date(item.startDate);
        const e = new Date(item.endDate);
        if (e <= s) return 0;
        return (e - s) / (1000 * 60 * 60 * 24) / 365;
      })();
      const listTotalReturn = calcAmount > 0 && calcRate > 0 && calcYears > 0 ? calcAmount * (calcRate / 100) * calcYears : 0;
      const listTotalAmount = calcAmount > 0 ? calcAmount + listTotalReturn : 0;
      acc.amount += convertAmount(calcAmount, cur, targetCur, exchangeRates);
      acc.interest += convertAmount(listTotalReturn, cur, targetCur, exchangeRates);
      acc.totalAmount += convertAmount(listTotalAmount, cur, targetCur, exchangeRates);
      return acc;
    }, { amount: 0, interest: 0, totalAmount: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">定期资产</h3>
          <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">市场</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">地点</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">方式</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">货币种类</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">账户本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">利率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">开始时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">结束时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">到期总利息</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">到期总金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">到期日倒计时</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => {
                const calcAmount = parseFloat(item.amount || 0);
                const calcRate = parseFloat(item.interestRate !== undefined && item.interestRate !== '' ? item.interestRate : (item.interest || 0));
                const calcYears = (() => {
                  if (!item.startDate || !item.endDate) return 0;
                  const s = new Date(item.startDate);
                  const e = new Date(item.endDate);
                  if (e <= s) return 0;
                  return (e - s) / (1000 * 60 * 60 * 24) / 365;
                })();
                const listTotalReturn = calcAmount > 0 && calcRate > 0 && calcYears > 0 ? calcAmount * (calcRate / 100) * calcYears : null;
                const listTotalAmount = calcAmount > 0 && listTotalReturn !== null ? calcAmount + listTotalReturn : null;
                const listDaysToMaturity = item.endDate ? Math.max(0, Math.ceil((new Date(item.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;
                return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.market || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.location || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.usage || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.termType || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.accountName || accounts.find(a => (a.id || a.name) === item.accountId)?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.amount ? formatCurrency(item.amount, item.currency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.interestRate !== undefined && item.interestRate !== '' ? formatPercentage(item.interestRate) : (item.interest ? formatPercentage(item.interest) : '—')}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.startDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.endDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{listTotalReturn !== null ? formatCurrency(listTotalReturn, item.currency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{listTotalAmount !== null ? formatCurrency(listTotalAmount, item.currency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-medium">{listDaysToMaturity !== null ? `${listDaysToMaturity} 天` : '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedFixedDeposit(item); setShowFixedDepositDetailModal(true); }} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="明细">
                        <Building2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无定期资产数据</td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={6}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={fixedDepositTotalCurrency}
                        onChange={(e) => setFixedDepositTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{fixedDepositTotalCurrency}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(fdTotals.amount, fixedDepositTotalCurrency)}</td>
                  <td></td>
                  <td colSpan={2}></td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(fdTotals.interest, fixedDepositTotalCurrency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(fdTotals.totalAmount, fixedDepositTotalCurrency)}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderForexTable = () => {
    const items = getAssets('forex');

    const forexTotals = items.reduce((acc, item) => {
      const targetCur = forexTotalCurrency;
      const buyAmount = parseFloat(item.buyAmount || 0);
      const currentRate = parseFloat(item.currentRate || 0);
      const sellRmb = parseFloat(item.sellRmb || 0);
      const currentRmb = buyAmount * currentRate;
      const profitLoss = currentRmb - sellRmb;
      // sellRmb and currentRmb are both in CNY, convert to target currency if needed
      acc.sellRmb += convertAmount(sellRmb, 'CNY', targetCur, exchangeRates);
      acc.currentRmb += convertAmount(currentRmb, 'CNY', targetCur, exchangeRates);
      acc.profitLoss += convertAmount(profitLoss, 'CNY', targetCur, exchangeRates);
      return acc;
    }, { sellRmb: 0, currentRmb: 0, profitLoss: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">外汇</h3>
          <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span>新增</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">购买币种</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">购买额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">卖出币种</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">卖出RMB额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">买入汇率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">当前汇率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">现有RMB额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">盈利额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">盈利率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">购买日期</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">账户本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => {
                const buyAmount = parseFloat(item.buyAmount || 0);
                const buyRate = parseFloat(item.buyRate || 0);
                const currentRate = parseFloat(item.currentRate || 0);
                const sellRmb = parseFloat(item.sellRmb || 0);
                const currentRmb = buyAmount * currentRate;
                const profitLoss = currentRmb - sellRmb;
                const profitRate = sellRmb > 0 ? (profitLoss / sellRmb) * 100 : 0;
                const isProfit = profitLoss >= 0;
                return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.buyCurrency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{buyAmount > 0 ? formatCurrency(buyAmount, item.buyCurrency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.sellCurrency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{sellRmb > 0 ? formatCurrency(sellRmb, 'CNY') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{buyRate > 0 ? buyRate.toFixed(4) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{currentRate > 0 ? currentRate.toFixed(4) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{currentRmb > 0 ? formatCurrency(currentRmb, 'CNY') : '—'}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {profitLoss !== 0 ? formatCurrency(profitLoss, 'CNY') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {sellRmb > 0 ? formatPercentage(profitRate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.purchaseDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.accountName || accounts.find(a => (a.id || a.name) === item.accountId)?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无外汇数据</td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300" colSpan={4}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={forexTotalCurrency}
                        onChange={(e) => setForexTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(forexTotals.sellRmb, forexTotalCurrency)}</td>
                  <td></td>
                  <td></td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(forexTotals.currentRmb, forexTotalCurrency)}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${forexTotals.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(forexTotals.profitLoss, forexTotalCurrency)}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSurvivalFundTable = () => {
    const items = getAssets('survivalfund');

    // 生存资金合计（多币种折算）
    const survivalTotals = items.reduce((acc, item) => {
      const cur = item.currency || 'CNY';
      const targetCur = survivalFundTotalCurrency;
      acc.amount += convertAmount(parseFloat(item.amount || 0), cur, targetCur, exchangeRates);
      return acc;
    }, { amount: 0 });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">生存资金</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              合计: <span className="font-semibold text-blue-600">{formatCurrency(survivalTotals.amount, survivalFundTotalCurrency)}</span>
            </span>
            <button onClick={handleAdd} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              <span>新增</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">账户本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.amount ? formatCurrency(item.amount, item.currency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.accountName || accounts.find(a => (a.id || a.name) === item.accountId)?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无生存资金数据</td>
                </tr>
              )}
              {items.length > 0 && (
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-semibold">
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>合计</span>
                      <select
                        value={survivalFundTotalCurrency}
                        onChange={(e) => setSurvivalFundTotalCurrency(e.target.value)}
                        className="text-xs border border-indigo-200 dark:border-indigo-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 font-normal">（按汇率折算）</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">{survivalFundTotalCurrency}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(survivalTotals.amount, survivalFundTotalCurrency)}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    const renderAccountSelect = () => {
      const hasAccounts = accounts.length > 0;
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            账户本 <span className="text-red-500">*</span>
          </label>
          {hasAccounts ? (
            <select
              value={formData.accountId || ''}
              onChange={(e) => {
                const accountId = e.target.value;
                const account = accounts.find(a => (a.id || a.name) === accountId);
                setFormData({ ...formData, accountId, accountName: account?.name || '' });
              }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择账户本</option>
              {accounts.filter(acc => acc.type !== '理财资产' && acc.type !== '打新' && acc.type !== '负债' && !acc.liability).map(account => (
                <option key={account.id || account.name} value={account.id || account.name}>
                  {sanitizeText(account.name, account.name)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-orange-500">暂无可用账户，请先在「账户本」中创建账户</p>
          )}
        </div>
      );
    };

    const renderInsuranceForm = () => (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保单号码</label>
            <input type="text" value={formData.policyNumber || ''} onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保险类型</label>
            <select value={formData.insuranceType || ''} onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              <option value="储蓄险">储蓄险</option>
              <option value="年金险">年金险</option>
              <option value="分红险">分红险</option>
              <option value="养老保险">养老保险</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保险名称</label>
            <input type="text" value={formData.policyName || ''} onChange={(e) => setFormData({ ...formData, policyName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保险作用</label>
            <select value={formData.insurancePurpose || ''} onChange={(e) => setFormData({ ...formData, insurancePurpose: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              <option value="养老">养老</option>
              <option value="现金流：生活">现金流：生活</option>
              <option value="教育">教育</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">受保人</label>
            <input type="text" value={formData.insured || ''} onChange={(e) => setFormData({ ...formData, insured: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">受保人年龄</label>
            <input type="number" value={formData.insuredAge || ''} onChange={(e) => setFormData({ ...formData, insuredAge: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">受益人</label>
            <input type="text" value={formData.beneficiary || ''} onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保单日期</label>
            <input type="date" value={formData.policyDate || ''} onChange={(e) => setFormData({ ...formData, policyDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保单状况</label>
            <select value={formData.policyStatus || '待生效'} onChange={(e) => setFormData({ ...formData, policyStatus: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="待生效">待生效</option>
              <option value="已生效">已生效</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">缴纳方式</label>
            <select value={formData.paymentMethod || '年付'} onChange={(e) => {
              const nextMethod = e.target.value;
              const next = { ...formData, paymentMethod: nextMethod };
              // 切换时自动计算已付金额
              const periods = parseFloat(next.paidPeriods || 0) || 0;
              if (nextMethod === '月付') {
                const monthly = parseFloat(next.monthlyPaymentAmount || 0) || 0;
                if (monthly > 0 && periods > 0) {
                  next.paidAmount = (monthly * periods).toString();
                }
              } else if (nextMethod === '年付') {
                const annual = parseFloat(next.annualPaymentAmount || 0) || 0;
                if (annual > 0 && periods > 0) {
                  next.paidAmount = (annual * periods).toString();
                }
              }
              setFormData(next);
            }} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="整付">整付</option>
              <option value="年付">年付</option>
              <option value="月付">月付</option>
            </select>
          </div>
          {formData.paymentMethod === '月付' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">每月付款金额</label>
                <input type="number" value={formData.monthlyPaymentAmount || ''} onChange={(e) => {
                  const monthly = e.target.value;
                  const periods = parseFloat(formData.paidPeriods || 0) || 0;
                  const paid = parseFloat(monthly || 0) * periods;
                  setFormData({
                    ...formData,
                    monthlyPaymentAmount: monthly,
                    paidAmount: (parseFloat(monthly || 0) > 0 && periods > 0) ? paid.toString() : formData.paidAmount,
                  });
                }} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">已付款期数（月）</label>
                <input type="number" value={formData.paidPeriods || ''} onChange={(e) => {
                  const periods = e.target.value;
                  const monthly = parseFloat(formData.monthlyPaymentAmount || 0) || 0;
                  const paid = monthly * (parseFloat(periods || 0) || 0);
                  setFormData({
                    ...formData,
                    paidPeriods: periods,
                    paidAmount: (monthly > 0 && parseFloat(periods || 0) > 0) ? paid.toString() : formData.paidAmount,
                  });
                }} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}
          {formData.paymentMethod === '年付' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">每年付款金额</label>
                <input type="number" value={formData.annualPaymentAmount || ''} onChange={(e) => {
                  const annual = e.target.value;
                  const periods = parseFloat(formData.paidPeriods || 0) || 0;
                  const paid = parseFloat(annual || 0) * periods;
                  setFormData({
                    ...formData,
                    annualPaymentAmount: annual,
                    paidAmount: (parseFloat(annual || 0) > 0 && periods > 0) ? paid.toString() : formData.paidAmount,
                  });
                }} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">已付款期数（年）</label>
                <input type="number" value={formData.paidPeriods || ''} onChange={(e) => {
                  const periods = e.target.value;
                  const annual = parseFloat(formData.annualPaymentAmount || 0) || 0;
                  const paid = annual * (parseFloat(periods || 0) || 0);
                  setFormData({
                    ...formData,
                    paidPeriods: periods,
                    paidAmount: (annual > 0 && parseFloat(periods || 0) > 0) ? paid.toString() : formData.paidAmount,
                  });
                }} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{formData.insuranceType === '年金险' ? '当年保费' : '已付金额'}</label>
            <input type="number" value={formData.paidAmount || ''} onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{formData.insuranceType === '年金险' ? '年末现金价值' : '现金价值'}</label>
            <input type="number" value={formData.cashValue || ''} onChange={(e) => setFormData({ ...formData, cashValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币单位</label>
            <select value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          {renderAccountSelect()}
        </div>
      </>
    );

    const renderRealEstateForm = () => {
      const countries = Object.keys(COUNTRY_REGION_DATA);
      const provinces = formData.country ? Object.keys(COUNTRY_REGION_DATA[formData.country] || {}) : [];
      const cities = (formData.country && formData.province) ? (COUNTRY_REGION_DATA[formData.country][formData.province] || []) : [];

      const computeRealEstatePrices = (next) => {
        const pricePerSqm = parseFloat(next.pricePerSqm || 0);
        const area = parseFloat(next.area || 0);
        const purchasePrice = pricePerSqm * area;
        const taxRate = parseFloat(next.taxRate || 0);
        const agencyFeeRate = parseFloat(next.agencyFeeRate || 0);
        return {
          ...next,
          purchasePrice: purchasePrice > 0 ? purchasePrice : '',
          taxAmount: purchasePrice > 0 && taxRate > 0 ? (purchasePrice * taxRate / 100) : '',
          agencyFeeAmount: purchasePrice > 0 && agencyFeeRate > 0 ? (purchasePrice * agencyFeeRate / 100) : '',
        };
      };

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">国家/地区</label>
              <select
                value={formData.country || ''}
                onChange={(e) => {
                  const country = e.target.value;
                  setFormData({ ...formData, country, province: '', city: '', district: '' });
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择国家/地区</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">省份/州</label>
              <select
                value={formData.province || ''}
                onChange={(e) => {
                  const province = e.target.value;
                  setFormData({ ...formData, province, city: '', district: '' });
                }}
                disabled={!formData.country}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">请选择省份/州</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">城市</label>
              <select
                value={formData.city || ''}
                onChange={(e) => {
                  const city = e.target.value;
                  setFormData({ ...formData, city, district: '' });
                }}
                disabled={!formData.province}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">请选择城市</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地区（手动补充）</label>
              <input
                type="text"
                value={formData.district || ''}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="如需补充详细地区"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <input
                type="text"
                list="realestate-types"
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="请选择或输入类型"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="realestate-types">
                <option value="住宅" />
                <option value="工厂" />
                <option value="商铺" />
                <option value="公寓" />
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">方式</label>
              <div className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white">
                {formData.usage || '自用'}
              </div>
            </div>
          </div>
          {formData.usage === '出租' && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">出租方式</label>
                <select
                  value={formData.rentMethod || '押一付一'}
                  onChange={(e) => setFormData({ ...formData, rentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="押一付一">押一付一</option>
                  <option value="押一付三">押一付三</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">租金</label>
                <input
                  type="number"
                  value={formData.rentAmount || ''}
                  onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">押金</label>
                <input
                  type="number"
                  value={formData.depositAmount || ''}
                  onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">起租时间</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">到期时间</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">是否出租</label>
                <select
                  value={formData.isRented || '是'}
                  onChange={(e) => setFormData({ ...formData, isRented: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
            </div>
          )}
          {formData.usage === '自用' && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">购买类型</label>
                <select
                  value={formData.purchaseType || '新房'}
                  onChange={(e) => setFormData({ ...formData, purchaseType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="新房">新房</option>
                  <option value="二手房">二手房</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">每平方米价格</label>
                <input
                  type="number"
                  value={formData.pricePerSqm || ''}
                  onChange={(e) => setFormData(computeRealEstatePrices({ ...formData, pricePerSqm: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">面积(㎡)</label>
                <input
                  type="number"
                  value={formData.area || ''}
                  onChange={(e) => setFormData(computeRealEstatePrices({ ...formData, area: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">购买价(自动计算)</label>
                <input
                  type="number"
                  readOnly
                  value={formData.purchasePrice || ''}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">税费利率(%)</label>
                <input
                  type="number"
                  value={formData.taxRate || ''}
                  onChange={(e) => setFormData(computeRealEstatePrices({ ...formData, taxRate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">税费金额(自动计算)</label>
                <input
                  type="number"
                  readOnly
                  value={formData.taxAmount || ''}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">中介费利率(%)</label>
                <input
                  type="number"
                  value={formData.agencyFeeRate || ''}
                  onChange={(e) => setFormData(computeRealEstatePrices({ ...formData, agencyFeeRate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">中介费金额(自动计算)</label>
                <input
                  type="number"
                  readOnly
                  value={formData.agencyFeeAmount || ''}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币单位</label>
              <select value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              {renderAccountSelect()}
            </div>
          </div>
        </>
      );
    };

    const renderVehicleForm = () => {
      const allTypes = [...new Set([...VEHICLE_TYPES, '电动车', ...customVehicleTypes])];
      const selectedType = formData.vehicleType || '2轮电动车';
      const baseBrands = VEHICLE_BRANDS[selectedType] || [];
      const customBrandsForType = customVehicleBrands[selectedType] || [];
      const allBrands = [...new Set([...baseBrands, ...customBrandsForType])];
      const selectedBrand = formData.manufacturer || '';
      const baseModels = VEHICLE_MODELS[selectedBrand] || [];
      const customModelsForBrand = customVehicleModels[selectedBrand] || [];
      const allModels = [...new Set([...baseModels, ...customModelsForBrand])];

      const handleAddCustomType = () => {
        const newType = prompt('请输入新的车辆类型：');
        if (newType && newType.trim() && !allTypes.includes(newType.trim())) {
          setCustomVehicleTypes([...customVehicleTypes, newType.trim()]);
          setFormData({ ...formData, vehicleType: newType.trim(), manufacturer: '', model: '' });
        }
      };

      const handleAddCustomBrand = () => {
        const newBrand = prompt('请输入新的厂商：');
        if (newBrand && newBrand.trim() && !allBrands.includes(newBrand.trim())) {
          setCustomVehicleBrands({
            ...customVehicleBrands,
            [selectedType]: [...(customVehicleBrands[selectedType] || []), newBrand.trim()],
          });
          setFormData({ ...formData, manufacturer: newBrand.trim(), model: '' });
        }
      };

      const handleAddCustomModel = () => {
        const newModel = prompt('请输入新的型号：');
        if (newModel && newModel.trim() && !allModels.includes(newModel.trim())) {
          setCustomVehicleModels({
            ...customVehicleModels,
            [selectedBrand]: [...(customVehicleModels[selectedBrand] || []), newModel.trim()],
          });
          setFormData({ ...formData, model: newModel.trim() });
        }
      };

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <div className="flex gap-1">
                <select
                  value={selectedType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value, manufacturer: '', model: '' })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomType}
                  className="px-2 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="添加自定义类型"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">厂商</label>
              <div className="flex gap-1">
                <select
                  value={selectedBrand}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value, model: '' })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomBrand}
                  className="px-2 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="添加自定义厂商"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">型号</label>
              <div className="flex gap-1">
                <select
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {allModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomModel}
                  disabled={!selectedBrand}
                  className="px-2 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="添加自定义型号"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">购买价格</label>
              <input type="number" value={formData.purchasePrice || ''} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">购买日期</label>
              <input type="date" value={formData.purchaseDate || ''} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">里程 (万公里)</label>
              <input type="number" value={formData.mileage || ''} onChange={(e) => setFormData({ ...formData, mileage: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币单位</label>
              <select value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            {renderAccountSelect()}
          </div>
        </>
      );
    };

    const renderFixedInvestmentForm = () => {
      const baseTypes = ['债券', '基金定投', '其他'];
      const allTypes = [...new Set([...baseTypes, ...customFixedInvestmentTypes])];
      const frequencyOptions = ['每月', '每季度', '每半年', '每年'];

      const handleAddCustomType = () => {
        setEditingFixedInvestmentType(null);
        setFixedInvestmentTypeInput('');
        setShowFixedInvestmentTypeModal(true);
      };

      const handleEditCustomType = (typeName) => {
        if (baseTypes.includes(typeName)) return;
        setEditingFixedInvestmentType(typeName);
        setFixedInvestmentTypeInput(typeName);
        setShowFixedInvestmentTypeModal(true);
      };

      const handleDeleteCustomType = (typeName) => {
        if (baseTypes.includes(typeName)) return;
        if (!confirm(`确定要删除类型"${typeName}"吗？`)) return;
        const updated = customFixedInvestmentTypes.filter(t => t !== typeName);
        setCustomFixedInvestmentTypes(updated);
        if (formData.type === typeName) {
          setFormData({ ...formData, type: '' });
        }
      };

      const saveCustomType = () => {
        const val = fixedInvestmentTypeInput.trim();
        if (!val) return;
        if (allTypes.includes(val) && val !== editingFixedInvestmentType) {
          alert('该类型已存在');
          return;
        }
        if (editingFixedInvestmentType) {
          const updated = customFixedInvestmentTypes.map(t => t === editingFixedInvestmentType ? val : t);
          setCustomFixedInvestmentTypes(updated);
          if (formData.type === editingFixedInvestmentType) {
            setFormData({ ...formData, type: val });
          }
        } else {
          setCustomFixedInvestmentTypes([...customFixedInvestmentTypes, val]);
          setFormData({ ...formData, type: val });
        }
        setShowFixedInvestmentTypeModal(false);
        setEditingFixedInvestmentType(null);
        setFixedInvestmentTypeInput('');
      };

      const countryOptions = ['中国', '美国', '英国', '日本', '德国', '法国', '加拿大', '澳大利亚', '新加坡', '韩国', '中国香港', '中国台湾', '其他'];
      const provinceOptionsByCountry = {
        '中国': ['北京', '上海', '天津', '重庆', '广东', '江苏', '浙江', '山东', '河南', '四川', '湖北', '福建', '湖南', '河北', '山西', '辽宁', '吉林', '黑龙江', '安徽', '江西', '广西', '海南', '云南', '贵州', '陕西', '甘肃', '青海', '内蒙古', '新疆', '西藏', '宁夏', '其他'],
      };
      const selectedCountry = formData.country || '';
      const provinceOptions = provinceOptionsByCountry[selectedCountry] || [];
      const handleCountryChange = (val) => {
        setFormData({ ...formData, country: val, province: '', district: '' });
      };
      const handleProvinceChange = (val) => {
        setFormData({ ...formData, province: val, district: '' });
      };

      const currentYear = new Date().getFullYear();
      const yearOptions = [];
      for (let y = currentYear + 30; y >= currentYear - 30; y--) {
        yearOptions.push(y.toString());
      }

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">国家</label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">省份</label>
              <select
                value={formData.province || ''}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地区</label>
              <input type="text" value={formData.district || ''} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <div className="flex gap-1">
                <select
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomType}
                  className="px-2 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="添加自定义类型"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {formData.type && !baseTypes.includes(formData.type) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditCustomType(formData.type)}
                      className="px-2 py-2 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="编辑类型"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomType(formData.type)}
                      className="px-2 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="删除类型"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">投入本金</label>
              <input type="number" value={formData.investmentCost || ''} onChange={(e) => setFormData({ ...formData, investmentCost: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持续投入</label>
              <input type="number" value={formData.annualContribution || ''} onChange={(e) => setFormData({ ...formData, annualContribution: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="每年追加投入" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分红频率</label>
              <select
                value={formData.dividendFrequency || '每年'}
                onChange={(e) => setFormData({ ...formData, dividendFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {frequencyOptions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">起始年份</label>
              <select
                value={formData.startYear || ''}
                onChange={(e) => setFormData({ ...formData, startYear: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结束年份</label>
              <select
                value={formData.endYear || ''}
                onChange={(e) => setFormData({ ...formData, endYear: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                <option value="无期限">无期限</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币单位</label>
              <select value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            {renderAccountSelect()}
          </div>

          {showFixedInvestmentTypeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFixedInvestmentTypeModal(false)}>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingFixedInvestmentType ? '编辑投资类型' : '新增投资类型'}
                </h3>
                <input
                  type="text"
                  value={fixedInvestmentTypeInput}
                  onChange={(e) => setFixedInvestmentTypeInput(e.target.value)}
                  placeholder="请输入投资类型名称"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFixedInvestmentTypeModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={saveCustomType}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    };

    const renderEquityForm = () => {
      const market = formData.market || '国内市场';
      const l2Options = equityCategoryL2OptionsMap[formData.categoryL1] || [];
      const cost = parseFloat(formData.cost) || 0;
      const quantity = parseFloat(formData.quantity) || 0;
      const currentPrice = parseFloat(formData.currentPrice) || 0;
      const marketValue = quantity * currentPrice;
      const pnl = marketValue - cost * quantity;
      const pnlRate = cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0;

      const handleMarketChange = (val) => {
        let newCurrency = formData.currency;
        if (val === '国内市场') newCurrency = 'CNY';
        else if (val === '港股市场') newCurrency = 'HKD';
        else if (val === '美股市场') newCurrency = 'USD';
        setFormData({ ...formData, market: val, currency: newCurrency });
      };

      return (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">1</div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">分类选择</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="text-red-500 mr-0.5">*</span>市场
              </label>
              <select
                value={market}
                onChange={(e) => handleMarketChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EQUITY_MARKET_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币单位</label>
              <input
                type="text"
                list="equity-currency-suggestions"
                value={formData.currency || ''}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                placeholder="CNY / USD / 自定义..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <datalist id="equity-currency-suggestions">
                {EQUITY_CURRENCY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">资产种类</label>
              <div className="flex gap-2">
                <select
                  value={formData.assetKind || ''}
                  onChange={(e) => setFormData({ ...formData, assetKind: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择资产种类</option>
                  {equityAssetKindOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newKind = prompt('请输入新的资产种类名称');
                    if (newKind && newKind.trim() && !equityAssetKindOptions.includes(newKind.trim())) {
                      setEquityAssetKindOptions([...equityAssetKindOptions, newKind.trim()].sort());
                    }
                  }}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  title="添加资产种类"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="text-red-500 mr-0.5">*</span>资产类型
              </label>
              <input
                type="text"
                value="股票"
                readOnly
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>
            {renderAccountSelect()}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="text-red-500 mr-0.5">*</span>资产分类一级
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.categoryL1 || ''}
                  onChange={(e) => setFormData({ ...formData, categoryL1: e.target.value, categoryL2: '', categoryL3: '' })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {equityCategoryL1Options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newL1 = prompt('请输入新的一级分类名称');
                    if (newL1 && newL1.trim() && !equityCategoryL1Options.includes(newL1.trim())) {
                      setEquityCategoryL1Options([...equityCategoryL1Options, newL1.trim()].sort());
                    }
                  }}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  title="管理一级分类"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">资产分类二级</label>
              <div className="flex gap-2">
                <select
                  value={formData.categoryL2 || ''}
                  onChange={(e) => setFormData({ ...formData, categoryL2: e.target.value, categoryL3: '' })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {l2Options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.categoryL1) { alert('请先选择资产分类一级'); return; }
                    const newL2 = prompt(`请输入 "${formData.categoryL1}" 下新的二级分类名称`);
                    if (newL2 && newL2.trim() && !l2Options.includes(newL2.trim())) {
                      setEquityCategoryL2OptionsMap({
                        ...equityCategoryL2OptionsMap,
                        [formData.categoryL1]: [...l2Options, newL2.trim()].sort(),
                      });
                    }
                  }}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  title="管理二级分类"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持仓分组</label>
              <div className="flex gap-2">
                <select
                  value={formData.positionGroup || ''}
                  onChange={(e) => setFormData({ ...formData, positionGroup: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {equityPositionGroupOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newG = prompt('请输入新的持仓分组名称');
                    if (newG && newG.trim() && !equityPositionGroupOptions.includes(newG.trim())) {
                      setEquityPositionGroupOptions([...equityPositionGroupOptions, newG.trim()].sort());
                    }
                  }}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  title="管理持仓分组"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="text-red-500 mr-0.5">*</span>持仓分类
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.positionType || ''}
                  onChange={(e) => setFormData({ ...formData, positionType: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {equityPositionTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newT = prompt('请输入新的持仓分类名称');
                    if (newT && newT.trim() && !equityPositionTypeOptions.includes(newT.trim())) {
                      setEquityPositionTypeOptions([...equityPositionTypeOptions, newT.trim()].sort());
                    }
                  }}
                  className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  title="管理持仓分类"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 第二步：资产详情 */}
          {formData.categoryL1 && formData.categoryL2 ? (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">资产详情</span>
                <span className="text-xs text-gray-400">· 股票</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="text-red-500 mr-0.5">*</span>资产名称
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        handleEquityCodeSearch(e.target.value);
                      }}
                      onFocus={() => formData.name && handleEquityCodeSearch(formData.name)}
                      onBlur={() => setTimeout(() => setEquityShowLookupDropdown(false), 200)}
                      placeholder="输入名称联想搜索"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {equityShowLookupDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                        {equityLookupLoading ? (
                          <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
                        ) : equityLookupResults.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">无匹配结果</div>
                        ) : (
                          equityLookupResults.map((item, idx) => (
                            <div
                              key={idx}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleEquitySelectLookup(item)}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.code}</span>
                                {item.price && <span className="text-xs text-gray-500 dark:text-gray-400">¥{item.price}</span>}
                              </div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="text-red-500 mr-0.5">*</span>资产代码
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, code: e.target.value });
                        handleEquityCodeSearch(e.target.value);
                      }}
                      onFocus={() => formData.code && handleEquityCodeSearch(formData.code)}
                      onBlur={() => setTimeout(() => setEquityShowLookupDropdown(false), 200)}
                      placeholder="如 000725"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {equityShowLookupDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                        {equityLookupLoading ? (
                          <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">搜索中...</div>
                        ) : equityLookupResults.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">无匹配结果</div>
                        ) : (
                          equityLookupResults.map((item, idx) => (
                            <div
                              key={idx}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleEquitySelectLookup(item)}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.code}</span>
                                {item.price && <span className="text-xs text-gray-500 dark:text-gray-400">¥{item.price}</span>}
                              </div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="text-red-500 mr-0.5">*</span>持仓成本
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.cost || ''}
                    onChange={(e) => {
                      const newCost = parseFloat(e.target.value) || 0;
                      const qty = parseFloat(formData.quantity) || 0;
                      const price = parseFloat(formData.currentPrice) || 0;
                      const newMv = qty * price;
                      const newPnl = newMv - newCost * qty;
                      const newPnlRate = newCost > 0 ? ((price - newCost) / newCost) * 100 : 0;
                      setFormData({
                        ...formData,
                        cost: e.target.value,
                        marketValue: newMv ? newMv.toFixed(2) : '',
                        pnl: newPnl ? newPnl.toFixed(2) : '',
                        pnlRate: newPnlRate ? newPnlRate.toFixed(2) : '',
                      });
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <span className="text-red-500 mr-0.5">*</span>持仓数量
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.quantity || ''}
                    onChange={(e) => {
                      const newQty = parseFloat(e.target.value) || 0;
                      const cost = parseFloat(formData.cost) || 0;
                      const price = parseFloat(formData.currentPrice) || 0;
                      const newMv = newQty * price;
                      const newPnl = newMv - cost * newQty;
                      const newPnlRate = cost > 0 ? ((price - cost) / cost) * 100 : 0;
                      setFormData({
                        ...formData,
                        quantity: e.target.value,
                        marketValue: newMv ? newMv.toFixed(2) : '',
                        pnl: newPnl ? newPnl.toFixed(2) : '',
                        pnlRate: newPnlRate ? newPnlRate.toFixed(2) : '',
                      });
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">现价</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.currentPrice || ''}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      const qty = parseFloat(formData.quantity) || 0;
                      const cost = parseFloat(formData.cost) || 0;
                      const newMv = qty * newPrice;
                      const newPnl = newMv - cost * qty;
                      const newPnlRate = cost > 0 ? ((newPrice - cost) / cost) * 100 : 0;
                      setFormData({
                        ...formData,
                        currentPrice: e.target.value,
                        marketValue: newMv ? newMv.toFixed(2) : '',
                        pnl: newPnl ? newPnl.toFixed(2) : '',
                        pnlRate: newPnlRate ? newPnlRate.toFixed(2) : '',
                      });
                    }}
                    placeholder="搜索资产自动获取，或手动输入"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前市值</label>
                  <input
                    type="number"
                    step="0.001"
                    value={marketValue ? marketValue.toFixed(2) : (formData.marketValue || '')}
                    readOnly
                    placeholder="自动计算"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold cursor-not-allowed"
                  />
                  {quantity > 0 && currentPrice > 0 && (
                    <p className="mt-1 text-xs text-gray-400">= {quantity} × {currentPrice} = {marketValue.toFixed(2)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持仓盈亏</label>
                  <input
                    type="number"
                    step="0.001"
                    value={pnl ? pnl.toFixed(2) : (formData.pnl || '')}
                    onChange={(e) => setFormData({ ...formData, pnl: e.target.value })}
                    placeholder="自动计算"
                    className={`w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持仓盈亏率(%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={pnlRate ? pnlRate.toFixed(2) : (formData.pnlRate || '')}
                    onChange={(e) => setFormData({ ...formData, pnlRate: e.target.value })}
                    placeholder="自动计算"
                    className={`w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-slate-600 text-gray-500 text-xs flex items-center justify-center font-bold">2</div>
                <span className="text-sm text-gray-400 dark:text-gray-500">资产详情</span>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">请先完成上方市场、分类选择</p>
            </div>
          )}
        </>
      );
    };

    const renderFixedDepositForm = () => {
      const market = formData.market || '国内市场';
      const locationOptions = market === '国内市场'
        ? ['北京', '上海', '广州', '深圳', '杭州', '南京', '武汉', '成都', '重庆', '天津', '西安', '苏州', '青岛', '长沙', '郑州', '其他']
        : ['美国', '英国', '日本', '德国', '法国', '加拿大', '澳大利亚', '新加坡', '韩国', '中国香港', '中国澳门', '中国台湾', '其他'];
      const baseDepositTypes = ['定期存款', '大额存单', '结构性存款', '理财'];
      const customDepositTypes = customFixedDepositTypes || [];
      const allDepositTypes = [...new Set([...baseDepositTypes, ...customDepositTypes])];

      const handleMarketChange = (val) => {
        setFormData({ ...formData, market: val, location: '' });
      };

      const handleAddCustomDepositType = () => {
        const newType = prompt('请输入新的资产类型：');
        if (newType && newType.trim() && !allDepositTypes.includes(newType.trim())) {
          setCustomFixedDepositTypes([...customFixedDepositTypes, newType.trim()]);
          setFormData({ ...formData, type: newType.trim() });
        }
      };

      const calculateYears = (start, end) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        if (e <= s) return 0;
        const days = (e - s) / (1000 * 60 * 60 * 24);
        return days / 365;
      };

      const calculateExpectedReturn = () => {
        const amount = parseFloat(formData.amount || 0);
        const rate = parseFloat(formData.interestRate || 0);
        const years = calculateYears(formData.startDate, formData.endDate);
        if (!amount || !rate || !years) return '';
        return (amount * rate / 100 * years).toFixed(2);
      };

      const expectedReturn = calculateExpectedReturn();

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">市场</label>
              <select
                value={market}
                onChange={(e) => handleMarketChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="国内市场">国内市场</option>
                <option value="海外市场">海外市场</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地点</label>
              <select
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
              <div className="flex gap-1">
                <select
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  {allDepositTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomDepositType}
                  className="px-2 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="添加自定义类型"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
              <input
                type="text"
                value={formData.usage || ''}
                onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                placeholder="如：养老金储备"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">方式</label>
              <select
                value={formData.termType || '长期'}
                onChange={(e) => setFormData({ ...formData, termType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="长期">长期</option>
                <option value="短期">短期</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币种类</label>
              <select value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            {renderAccountSelect()}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
              <input type="number" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">利率(%)</label>
              <input type="number" step="0.01" value={formData.interestRate || ''} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">开始时间</label>
              <input type="date" value={formData.startDate || ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结束时间</label>
              <input type="date" value={formData.endDate || ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预期收益（自动）</label>
              <input
                type="text"
                value={expectedReturn ? formatCurrency(expectedReturn, formData.currency) : ''}
                readOnly
                placeholder="填写金额、利率、起止时间后自动计算"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </>
      );
    };

    const renderSurvivalFundForm = () => (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入生存资金名称"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              币种 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency || 'CNY'}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              金额 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="请输入金额"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {renderAccountSelect()}
        </div>
      </>
    );

    const renderForexForm = () => {
      const buyCurrency = formData.buyCurrency || 'USD';
      const sellCurrency = formData.sellCurrency || 'CNY';

      const calculateProfit = () => {
        const buyAmount = parseFloat(formData.buyAmount || 0);
        const currentRate = parseFloat(formData.currentRate || 0);
        const sellRmb = parseFloat(formData.sellRmb || 0);
        if (!buyAmount || !currentRate || !sellRmb) return null;
        const currentRmb = buyAmount * currentRate;
        const profitLoss = currentRmb - sellRmb;
        const profitRate = sellRmb > 0 ? (profitLoss / sellRmb) * 100 : 0;
        return { profitLoss, profitRate, sellRmb, currentRmb };
      };

      const profit = calculateProfit();

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：美元兑换"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">购买日期</label>
              <input
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                购买币种 <span className="text-red-500">*</span>
              </label>
              <select
                value={buyCurrency}
                onChange={(e) => setFormData({ ...formData, buyCurrency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                卖出币种 <span className="text-red-500">*</span>
              </label>
              <select
                value={sellCurrency}
                onChange={(e) => setFormData({ ...formData, sellCurrency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                卖出RMB额 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sellRmb || ''}
                onChange={(e) => setFormData({ ...formData, sellRmb: e.target.value })}
                placeholder="实际卖出所得RMB金额"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                购买额 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.buyAmount || ''}
                onChange={(e) => setFormData({ ...formData, buyAmount: e.target.value })}
                placeholder={`购买${buyCurrency}数量`}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                买入汇率 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.buyRate || ''}
                onChange={(e) => setFormData({ ...formData, buyRate: e.target.value })}
                placeholder={`1 ${buyCurrency} = ? ${sellCurrency}`}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  当前汇率 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={fetchForexRealTimeRate}
                  disabled={forexRateLoading}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="获取实时汇率"
                >
                  <RefreshCw className={`w-3 h-3 ${forexRateLoading ? 'animate-spin' : ''}`} />
                  <span>{forexRateLoading ? '获取中...' : '实时获取'}</span>
                </button>
              </div>
              <input
                type="number"
                step="0.0001"
                value={formData.currentRate || ''}
                onChange={(e) => setFormData({ ...formData, currentRate: e.target.value })}
                placeholder={`1 ${buyCurrency} = ? ${sellCurrency}`}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(() => {
                const amt = parseFloat(formData.buyAmount || 0);
                const rate = parseFloat(formData.currentRate || 0);
                if (amt > 0 && rate > 0) {
                  return <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">现有RMB额：<span className="font-medium text-gray-700 dark:text-gray-300">{(amt * rate).toFixed(2)} CNY</span></div>;
                }
                return null;
              })()}
            </div>
            {renderAccountSelect()}
          </div>

          {profit && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">卖出RMB额：</span>
                  <span className="font-medium text-gray-900 dark:text-white">{profit.sellRmb.toFixed(2)} CNY</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">现有RMB额：</span>
                  <span className="font-medium text-gray-900 dark:text-white">{profit.currentRmb.toFixed(2)} CNY</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">盈利额：</span>
                  <span className={`font-medium ${profit.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {profit.profitLoss >= 0 ? '+' : ''}{profit.profitLoss.toFixed(2)} CNY
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">盈利率：</span>
                  <span className={`font-medium ${profit.profitRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {profit.profitRate >= 0 ? '+' : ''}{profit.profitRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
              placeholder="可选备注"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );
    };

    const getFormContent = () => {
      switch (activeTab) {
        case 'insurance':
          return renderInsuranceForm();
        case 'realestate':
          return renderRealEstateForm();
        case 'vehicle':
          return renderVehicleForm();
        case 'fixedinvestment':
          return renderFixedInvestmentForm();
        case 'equity':
          return renderEquityForm();
        case 'fixeddeposit':
          return renderFixedDepositForm();
        case 'forex':
          return renderForexForm();
        default:
          return null;
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingItem ? '编辑' : '新增'}资产</h2>
            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4">
            {getFormContent()}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              取消
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderVehicleDetailModal = () => {
    if (!showVehicleDetailModal || !selectedVehicle) return null;
    const item = selectedVehicle;
    const { residualValue, ageDepreciationRate, mileageDepreciationRate, combinedDepreciationRate, age } = calculateVehicleResidualValue(item);
    const purchasePrice = parseFloat(item.purchasePrice || 0);
    const totalDepreciation = purchasePrice - residualValue;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">车况明细</h2>
            <button onClick={() => setShowVehicleDetailModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">购买价格</span>
              <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(purchasePrice, item.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">车龄</span>
              <span className="text-gray-900 dark:text-white font-medium">{age.toFixed(2)} 年</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">里程</span>
              <span className="text-gray-900 dark:text-white font-medium">{item.mileage || 0} 万公里</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">车龄折损率</span>
              <span className="text-gray-900 dark:text-white font-medium">{(ageDepreciationRate * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">里程折损率</span>
              <span className="text-gray-900 dark:text-white font-medium">{(mileageDepreciationRate * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">综合折损率</span>
              <span className="text-gray-900 dark:text-white font-medium">{(combinedDepreciationRate * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">累计折损金额</span>
              <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(totalDepreciation, item.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">现车残值</span>
              <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(residualValue, item.currency)}</span>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button onClick={() => setShowVehicleDetailModal(false)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInsuranceDetailModal = () => {
    if (!showInsuranceDetailModal || !selectedInsurance) return null;
    const item = selectedInsurance;

    const paidAmount = parseFloat(item.paidAmount || 0);
    const cashValue = parseFloat(item.cashValue || 0);
    const records = item.transactionRecords || [];
    const isAnnuity = item.insuranceType === '年金险';

    let displayPaidAmount = paidAmount;
    let displayCashValue = cashValue;
    let totalDividend = records.reduce((sum, r) => {
      return sum + parseFloat(r.actualProfitAmount || 0);
    }, 0);

    if (isAnnuity) {
      displayPaidAmount = records.reduce((sum, r) => {
        return sum + parseFloat(r.annualPremium || 0);
      }, 0);

      if (records.length > 0) {
        const sortedByYear = [...records].sort((a, b) => {
          const va = a.year || '';
          const vb = b.year || '';
          if ((/^\d{4}-\d{2}$/.test(va) || /^\d{4}$/.test(va)) && (/^\d{4}-\d{2}$/.test(vb) || /^\d{4}$/.test(vb))) {
            return va.localeCompare(vb);
          }
          return (parseInt(va) || 0) - (parseInt(vb) || 0);
        });
        const latestRecord = sortedByYear[sortedByYear.length - 1];
        displayCashValue = parseFloat(latestRecord.yearEndCashValue || 0);
      }

      totalDividend = records.reduce((sum, r) => {
        return sum + parseFloat(r.annualActualDividend || 0);
      }, 0);
    } else if (item.insuranceType === '储蓄险') {
      if (records.length > 0) {
        const sortedByYear = [...records].sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0));
        const latestRecord = sortedByYear[sortedByYear.length - 1];
        displayPaidAmount = parseFloat(latestRecord.premiumPaid || 0);
        displayCashValue = parseFloat(latestRecord.guaranteedCashValue || 0);
      }
    }

    const dividendRate = displayPaidAmount > 0 && totalDividend > 0
      ? ((totalDividend / displayPaidAmount) * 100).toFixed(2) + '%'
      : '—';

    const returnProgress = displayPaidAmount > 0
      ? ((displayCashValue + totalDividend) / displayPaidAmount * 100).toFixed(2) + '%'
      : '—';

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">保险明细 - {item.policyName || item.policyNumber || '保单'}</h2>
            <button onClick={handleCloseInsuranceDetail} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">保单号码</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.policyNumber || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">保险名称</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.policyName || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">受保人</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.insured || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">受益人</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.beneficiary || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">保单日期</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.policyDate || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">保单状况</span>
                <span className={`text-sm font-medium ${item.policyStatus === '已生效' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {item.policyStatus || '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">缴纳方式</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.paymentMethod || '—'}</span>
              </div>
              {item.paymentMethod === '月付' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">每月付款金额</span>
                    <span className="text-gray-900 dark:text-white font-medium">{item.monthlyPaymentAmount ? formatCurrency(parseFloat(item.monthlyPaymentAmount), item.currency) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">已付款期数（月）</span>
                    <span className="text-gray-900 dark:text-white font-medium">{item.paidPeriods || '—'}</span>
                  </div>
                </>
              )}
              {item.paymentMethod === '年付' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">每年付款金额</span>
                    <span className="text-gray-900 dark:text-white font-medium">{item.annualPaymentAmount ? formatCurrency(parseFloat(item.annualPaymentAmount), item.currency) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">已付款期数（年）</span>
                    <span className="text-gray-900 dark:text-white font-medium">{item.paidPeriods || '—'}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">货币单位</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.currency || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">已交保费</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(displayPaidAmount, item.currency)}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">现金价值</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(displayCashValue, item.currency)}</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">累计分红额</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalDividend, item.currency)}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">累计分红收益率</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{dividendRate}</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">回本进度</div>
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{returnProgress}</div>
              </div>
            </div>

            {/* 取用相关 3 卡片 */}
            {(() => {
              const sortedRecords = records.slice().sort((a, b) => {
                const na = parseInt(a.year) || 0;
                const nb = parseInt(b.year) || 0;
                return nb - na;
              });
              const firstRow = sortedRecords[0] || null;
              const totalFund = firstRow ? parseFloat(firstRow.totalAmount || 0) : 0;
              const totalWithdrawn = records.reduce((s, r) => s + (parseFloat(r.cashFlowAmount || 0)), 0);
              const currentYear = new Date().getFullYear();
              const currentYearWithdrawn = records
                .filter(r => (parseInt(r.year) || 0) === currentYear || (r.date && r.date.startsWith(String(currentYear))))
                .reduce((s, r) => s + (parseFloat(r.cashFlowAmount || 0)), 0);
              return (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">现有资金总额</div>
                    <div className="text-lg font-bold text-teal-600 dark:text-teal-400">{formatCurrency(totalFund, item.currency)}</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">取用总额</div>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalWithdrawn, item.currency)}</div>
                  </div>
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">当年取用额</div>
                    <div className="text-lg font-bold text-pink-600 dark:text-pink-400">{formatCurrency(currentYearWithdrawn, item.currency)}</div>
                  </div>
                </div>
              );
            })()}

            <div className="border-t border-gray-200 dark:border-slate-700 pt-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">附件</h3>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {(item.attachments || []).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
                    <button onClick={() => window.open(file.url, '_blank')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      {file.name}
                    </button>
                    <button onClick={() => handleDeleteAttachment(index)} className="p-1 text-gray-500 hover:text-red-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>上传附件</span>
                <input type="file" multiple onChange={handleAttachmentUpload} className="hidden" />
              </label>
              {(item.attachments || []).length > 0 && (
                <button onClick={() => handleRunOCRFromAttachment()} className="ml-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>识别附件</span>
                </button>
              )}
              <button onClick={() => handleCalculateProjection()} className="ml-2 inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                <Calculator className="w-4 h-4" />
                <span>测算</span>
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">交易记录</h3>
                <button onClick={() => handleAddInsuranceTransaction()} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>新增交易记录</span>
                </button>
              </div>

              {records.length > 0 ? (
                <div className="overflow-x-auto">
                  {(() => {
                    // Sort records - 年金险支持 YYYY-MM（年月）或纯数字年份，倒序排列（最新在前）
                    const sortedRecords = records.slice().sort((a, b) => {
                      const va = a.date || a.year || '';
                      const vb = b.date || b.year || '';
                      // 优先作为日期字符串比较
                      if (/^\d{4}-\d{2}-\d{2}$/.test(va) && /^\d{4}-\d{2}-\d{2}$/.test(vb)) {
                        return vb.localeCompare(va); // 倒序
                      }
                      if (/^\d{4}-\d{2}$/.test(va) && /^\d{4}-\d{2}$/.test(vb)) {
                        return vb.localeCompare(va); // 倒序
                      }
                      const na = parseInt(va) || 0;
                      const nb = parseInt(vb) || 0;
                      if (na === 0 && nb !== 0) return 1;
                      if (na !== 0 && nb === 0) return -1;
                      if (na === 0 && nb === 0) return 0;
                      return nb - na; // 倒序
                    });
                    const totalPages = Math.max(1, Math.ceil(sortedRecords.length / INSURANCE_PAGE_SIZE));
                    const currentPage = Math.min(insurancePaginationPage, totalPages);
                    const pageStart = (currentPage - 1) * INSURANCE_PAGE_SIZE;
                    const pagedRecords = sortedRecords.slice(pageStart, pageStart + INSURANCE_PAGE_SIZE);

                    const renderPagination = () => {
                      if (totalPages <= 1) return null;
                      return (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            共 {sortedRecords.length} 条，每页 {INSURANCE_PAGE_SIZE} 条，第 {currentPage}/{totalPages} 页
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              disabled={currentPage <= 1}
                              onClick={() => setInsurancePaginationPage(1)}
                              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              首页
                            </button>
                            <button
                              disabled={currentPage <= 1}
                              onClick={() => setInsurancePaginationPage(currentPage - 1)}
                              className="p-1 rounded border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2 text-xs text-gray-600 dark:text-gray-300">{currentPage} / {totalPages}</span>
                            <button
                              disabled={currentPage >= totalPages}
                              onClick={() => setInsurancePaginationPage(currentPage + 1)}
                              className="p-1 rounded border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              disabled={currentPage >= totalPages}
                              onClick={() => setInsurancePaginationPage(totalPages)}
                              className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-slate-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              末页
                            </button>
                          </div>
                        </div>
                      );
                    };

                    if (item.insuranceType === '年金险') {
                      return (
                        <>
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">年月</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">当年保费</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">累计保费</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">当年保证年金</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">累计保证领取</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">年末现金价值</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">当年红利(演示)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">累积红利(演示)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">含红利生存总利益</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">当年实际红利</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">实际累计红利</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                              {pagedRecords.map((record, index) => {
                                const annualPremium = parseFloat(record.annualPremium || 0);
                                const cumulativePremium = parseFloat(record.cumulativePremium || 0);
                                const annualGuaranteedAnnuity = parseFloat(record.annualGuaranteedAnnuity || 0);
                                const cumulativeGuaranteedReceived = parseFloat(record.cumulativeGuaranteedReceived || 0);
                                const yearEndCashValue = parseFloat(record.yearEndCashValue || 0);
                                const annualDividendDemo = parseFloat(record.annualDividendDemo || 0);
                                const cumulativeDividendDemo = parseFloat(record.cumulativeDividendDemo || 0);
                                const totalBenefit = yearEndCashValue + cumulativeDividendDemo;
                                const annualActualDividend = parseFloat(record.annualActualDividend || 0);
                                const cumulativeActualDividend = parseFloat(record.cumulativeActualDividend || 0);

                                const toggleStatus = () => {
                                  const newRecords = selectedInsurance.transactionRecords.map(r => {
                                    if (r.id === record.id) {
                                      return { ...r, status: record.status === '达成' ? '未达成' : '达成' };
                                    }
                                    return r;
                                  });
                                  handleUpdateTransactionField(newRecords);
                                };

                                return (
                                  <tr key={record.id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      {(() => {
                                        const d = record.date;
                                        if (d) {
                                          // 支持 YYYY-MM-DD / YYYY-MM / YYYY 格式，统一显示为 "YYYY年MM月"
                                          const s = String(d);
                                          const m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
                                          if (m) return `${m[1]}年${m[2].padStart(2, '0')}月`;
                                          const y = s.match(/^(\d{4})$/);
                                          if (y) return `${y[1]}年`;
                                          return s;
                                        }
                                        return record.year ? `第${record.year}年` : '—';
                                      })()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.annualPremium || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, annualPremium: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.cumulativePremium || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, cumulativePremium: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.annualGuaranteedAnnuity || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, annualGuaranteedAnnuity: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.cumulativeGuaranteedReceived || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, cumulativeGuaranteedReceived: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.yearEndCashValue || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, yearEndCashValue: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.annualDividendDemo || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, annualDividendDemo: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.cumulativeDividendDemo || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, cumulativeDividendDemo: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{formatCurrency(totalBenefit, item.currency)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.annualActualDividend || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, annualActualDividend: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                      <input type="number" value={record.cumulativeActualDividend || ''} onChange={(e) => {
                                        const newRecords = selectedInsurance.transactionRecords.map(r => {
                                          if (r.id === record.id) return { ...r, cumulativeActualDividend: e.target.value };
                                          return r;
                                        });
                                        handleUpdateTransactionField(newRecords);
                                      }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => handleEditInsuranceTransaction(record)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteInsuranceTransaction(record)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {renderPagination()}
                        </>
                      );
                    }
                    // 非年金险表格（同样支持分页）
                    return (
                      <>
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">保单年度终结</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">缴付保费总额</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">复归红利</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">终期红利</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">总额</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">分红额</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">保证现金价值</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">非保证红利</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">预期红利</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">演示收益率</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">年化收益率</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">日期</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">年龄</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">实际分红额</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">现金流量额</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">是否取用</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">XIPRR收益率</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">分红实现率</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">是否达成</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {pagedRecords.map((record, index) => {
                        const guaranteedCashValue = parseFloat(record.guaranteedCashValue || 0);
                        const bonusDividend = parseFloat(record.bonusDividend || 0);
                        const midTermDividend = parseFloat(record.midTermDividend || 0);
                        const totalAmount = guaranteedCashValue + bonusDividend + midTermDividend;
                        const premiumPaid = parseFloat(record.premiumPaid || 0);
                        
                        const prevYear = parseInt(record.year) - 1;
                        const prevRecord = records.find(r => parseInt(r.year) === prevYear);
                        const prevGuaranteedCashValue = prevRecord ? parseFloat(prevRecord.guaranteedCashValue || 0) : 0;
                        // 第一行（首年）保证红利默认为0，其余行按差额计算
                        const guaranteedBonus = index === 0 ? 0 : (guaranteedCashValue - prevGuaranteedCashValue);
                        const nonGuaranteedBonus = bonusDividend + midTermDividend;
                        const expectedBonus = guaranteedBonus + nonGuaranteedBonus;
                        
                        const actualProfitAmount = parseFloat(record.actualProfitAmount || 0);
                        const dividendRealizationRate = nonGuaranteedBonus > 0 ? (actualProfitAmount / nonGuaranteedBonus * 100) : 0;
                        
                        const demoCashFlow = index === 0 ? premiumPaid : 0;
                        
                        const policyYear = parseInt(record.year) || 0;
                        const age = item.insuredAge ? parseInt(item.insuredAge) + policyYear : '—';
                        
                        const date = record.date || (item.policyDate ? `${parseInt(item.policyDate.split('/')[0]) + policyYear}/${item.policyDate.split('/')[1]}/${item.policyDate.split('/')[2]}` : '—');
                        
                        const demoRate = premiumPaid > 0 ? ((totalAmount - premiumPaid) / premiumPaid) * 100 : 0;
                        
                        const totalPremium = records
                          .filter(r => r.year || r.year === 0)
                          .reduce((sum, r) => sum + parseFloat(r.premiumPaid || 0), 0);
                        
                        const sortedRecords = records
                          .slice(0, index + 1)
                          .filter(r => r.year || r.year === 0)
                          .sort((a, b) => parseInt(a.year) - parseInt(b.year));
                        
                        const rDate0 = records.find(r => parseInt(r.year) === 0) || records.find(r => parseInt(r.year) === 1) || records[0];
                        const baseDateStr = rDate0?.date || item.policyDate || '';
                        
                        const irrReturn = (() => {
                          if (!baseDateStr) return null;
                          const startDate = new Date(baseDateStr);
                          const endDateStr = record.date || (item.policyDate ? `${parseInt(item.policyDate.split('/')[0]) + policyYear}/${item.policyDate.split('/')[1]}/${item.policyDate.split('/')[2]}` : '');
                          if (!endDateStr) return null;
                          const endDate = new Date(endDateStr);
                          const holdingDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                          if (holdingDays <= 0 || premiumPaid <= 0) return null;
                          const dividendAmount = guaranteedCashValue - premiumPaid + bonusDividend + midTermDividend;
                          return (dividendAmount / premiumPaid) * (365 / holdingDays) * 100;
                        })();
                        
                        const actualRate = (() => {
                          if (!baseDateStr) return null;
                          const cashFlowAmount = parseFloat(record.cashFlowAmount || 0);
                          const startDate = new Date(baseDateStr);
                          const endDateStr = record.date || (item.policyDate ? `${parseInt(item.policyDate.split('/')[0]) + policyYear}/${item.policyDate.split('/')[1]}/${item.policyDate.split('/')[2]}` : '');
                          if (!endDateStr) return null;
                          const endDate = new Date(endDateStr);
                          return calculateXIRR([startDate, endDate], [-totalPremium, cashFlowAmount]);
                        })();
                        const status = record.status || (dividendRealizationRate >= 100 ? '达成' : (record.actualProfitAmount ? '未达成' : '未开始'));
                        
                        const statusColor = status === '达成' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : status === '未达成' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400';
                        
                        const toggleStatus = () => {
                          const newStatus = status === '达成' ? '未达成' : (status === '未达成' ? '未开始' : '达成');
                          const newRecords = selectedInsurance.transactionRecords.map(r => {
                            if (r.id === record.id) {
                              return { ...r, status: newStatus };
                            }
                            return r;
                          });
                          handleUpdateTransactionField(newRecords);
                        };
                        
                        return (
                          <tr key={record.id || index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.year || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(record.premiumPaid, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(bonusDividend, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(midTermDividend, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{formatCurrency(totalAmount, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(guaranteedCashValue - premiumPaid + bonusDividend + midTermDividend, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(guaranteedCashValue, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(nonGuaranteedBonus, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(expectedBonus, item.currency)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{demoRate.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{irrReturn !== null ? irrReturn.toFixed(2) + '%' : '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              <input type="date" value={record.date || ''} onChange={(e) => {
                                const allRecords = selectedInsurance.transactionRecords || [];
                                const sortedAllRecords = allRecords.slice().sort((a, b) => {
                                  const yearA = parseInt(a.year) || 0;
                                  const yearB = parseInt(b.year) || 0;
                                  if (yearA === 0 && yearB !== 0) return -1;
                                  if (yearA !== 0 && yearB === 0) return 1;
                                  if (yearA === 0 && yearB === 0) return 0;
                                  if (yearA === 1 && yearB !== 1) return -1;
                                  if (yearA !== 1 && yearB === 1) return 1;
                                  if (yearA === 1 && yearB === 1) return 0;
                                  return yearA - yearB;
                                });
                                const currentIndex = sortedAllRecords.findIndex(r => r.id === record.id);
                                const inputValue = e.target.value;
                                
                                if (inputValue) {
                                  const baseDate = new Date(inputValue);
                                  const newRecords = allRecords.map(r => {
                                    const idx = sortedAllRecords.findIndex(sr => sr.id === r.id);
                                    const yearDiff = idx - currentIndex;
                                    const newDate = new Date(baseDate);
                                    newDate.setFullYear(newDate.getFullYear() + yearDiff);
                                    const formattedDate = newDate.toISOString().split('T')[0];
                                    return { ...r, date: formattedDate };
                                  });
                                  handleUpdateTransactionField(newRecords);
                                } else {
                                  const newRecords = allRecords.map(r => {
                                    if (r.id === record.id) {
                                      return { ...r, date: inputValue };
                                    }
                                    return r;
                                  });
                                  handleUpdateTransactionField(newRecords);
                                }
                              }} className="w-36 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              <input type="number" value={record.age || ''} onChange={(e) => {
                                const allRecords = selectedInsurance.transactionRecords || [];
                                const sortedAllRecords = allRecords.slice().sort((a, b) => {
                                  const yearA = parseInt(a.year) || 0;
                                  const yearB = parseInt(b.year) || 0;
                                  if (yearA === 0 && yearB !== 0) return -1;
                                  if (yearA !== 0 && yearB === 0) return 1;
                                  if (yearA === 0 && yearB === 0) return 0;
                                  if (yearA === 1 && yearB !== 1) return -1;
                                  if (yearA !== 1 && yearB === 1) return 1;
                                  if (yearA === 1 && yearB === 1) return 0;
                                  return yearA - yearB;
                                });
                                const currentIndex = sortedAllRecords.findIndex(r => r.id === record.id);
                                const inputValue = e.target.value;
                                const newAge = parseInt(inputValue);
                                
                                if (!isNaN(newAge) && currentIndex === 0) {
                                  const newRecords = allRecords.map(r => {
                                    const idx = sortedAllRecords.findIndex(sr => sr.id === r.id);
                                    return { ...r, age: String(newAge + idx) };
                                  });
                                  handleUpdateTransactionField(newRecords);
                                } else {
                                  const newRecords = allRecords.map(r => {
                                    if (r.id === record.id) {
                                      return { ...r, age: inputValue };
                                    }
                                    return r;
                                  });
                                  handleUpdateTransactionField(newRecords);
                                }
                              }} className="w-16 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              <input type="number" value={record.actualProfitAmount || ''} onChange={(e) => {
                                const newRecords = selectedInsurance.transactionRecords.map(r => {
                                  if (r.id === record.id) {
                                    return { ...r, actualProfitAmount: e.target.value };
                                  }
                                  return r;
                                });
                                handleUpdateTransactionField(newRecords);
                              }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              <input type="number" value={record.cashFlowAmount || ''} onChange={(e) => {
                                const newRecords = selectedInsurance.transactionRecords.map(r => {
                                  if (r.id === record.id) {
                                    return { ...r, cashFlowAmount: e.target.value };
                                  }
                                  return r;
                                });
                                handleUpdateTransactionField(newRecords);
                              }} className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {record.withdrawn ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:opacity-80"
                                  onClick={() => {
                                    setWithdrawRecordId(record.id);
                                    setWithdrawTargetAccountId(record.withdrawAccountId || '');
                                    setShowWithdrawModal(true);
                                  }}>
                                  已取用 → {accounts.find(a => (a.id || a.name) === record.withdrawAccountId)?.name || record.withdrawAccountId || '未指定'}
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setWithdrawRecordId(record.id);
                                    setWithdrawTargetAccountId('');
                                    setShowWithdrawModal(true);
                                  }}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 cursor-pointer transition-colors"
                                >
                                  点击取用
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{actualRate !== null ? actualRate.toFixed(2) + '%' : '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{dividendRealizationRate.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-sm">
                              <button onClick={toggleStatus} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} cursor-pointer hover:opacity-80 transition-opacity`}>
                                {status}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEditInsuranceTransaction(record)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteInsuranceTransaction(record)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {renderPagination()}
                  </>
                );
              })()}
            </div>
          ) : (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500 dark:text-gray-400">暂无交易记录</div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button onClick={handleCloseInsuranceDetail} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCalculationModal = () => {
    if (!showCalculationModal || !calculationData) return null;
    const { policyName, policyNumber, insured, insuredAge, premium, currency, baseAmount, years } = calculationData;

    const handleDownloadCSV = () => {
      const headers = ['年份', '保证CV', '保证XIRR', '保守4%总额', '保守XIRR', '中性5%总额', '中性XIRR', '乐观6%总额', '乐观XIRR', '中性年增长率'];
      const rows = years.map(y => [
        y.year,
        y.guaranteedCV.toFixed(2),
        y.guaranteedXIRR !== null ? y.guaranteedXIRR.toFixed(2) + '%' : '—',
        y.conservativeAmount.toFixed(2),
        y.conservativeXIRR !== null ? y.conservativeXIRR.toFixed(2) + '%' : '—',
        y.neutralAmount.toFixed(2),
        y.neutralXIRR !== null ? y.neutralXIRR.toFixed(2) + '%' : '—',
        y.optimisticAmount.toFixed(2),
        y.optimisticXIRR !== null ? y.optimisticXIRR.toFixed(2) + '%' : '—',
        y.neutralGrowthRate.toFixed(2) + '%',
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `测算表_${policyName || policyNumber || '保单'}.csv`;
      link.click();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">「{policyName || '保单'}」— 预期总价值 XIRR 计算表</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {insured ? `受保人 ${insured}${insuredAge ? `(${insuredAge}岁)` : ''}` : ''}
                {policyNumber ? ` | 保单号 ${policyNumber}` : ''}
                {premium ? ` | 保费 ${formatCurrency(premium, currency)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span>下载CSV</span>
              </button>
              <button onClick={() => setShowCalculationModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-2">计算方法说明：</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>第1-6年预期总额 = 保险公司演示数据（含保证CV + 非保证红利）</li>
                <li>第7年起 = 复利外推 FV(y) = {formatCurrency(baseAmount, currency)} × (1+r)^(y-6)，下限不低于保证现金价值</li>
                <li>XIRR = 按实际现金流日期精确计算的年化内部收益率（非简单CAGR）</li>
                <li>保守4% = 红利打折 / 中性5% = 公司演示实现(高亮列) / 乐观6% = 红利超预期</li>
              </ol>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-indigo-900 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold">年份</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">保证CV</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">保证XIRR</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold bg-indigo-800">保守4%总额</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold bg-indigo-800">保守XIRR</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold bg-amber-100 text-amber-900">中性5%总额</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold bg-amber-100 text-amber-900">中性XIRR</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold bg-indigo-800">乐观6%总额</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold bg-indigo-800">乐观XIRR</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">中性年增长率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {years.map((y, idx) => (
                    <tr key={y.year} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-700/50'}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">{y.year}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{formatCurrency(y.guaranteedCV, currency)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{y.guaranteedXIRR !== null ? y.guaranteedXIRR.toFixed(2) + '%' : '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white bg-indigo-50/50">{formatCurrency(y.conservativeAmount, currency)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white bg-indigo-50/50">{y.conservativeXIRR !== null ? y.conservativeXIRR.toFixed(2) + '%' : '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white bg-amber-50 font-medium">{formatCurrency(y.neutralAmount, currency)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white bg-amber-50 font-medium">{y.neutralXIRR !== null ? y.neutralXIRR.toFixed(2) + '%' : '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white bg-indigo-50/50">{formatCurrency(y.optimisticAmount, currency)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white bg-indigo-50/50">{y.optimisticXIRR !== null ? y.optimisticXIRR.toFixed(2) + '%' : '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        {y.neutralGrowthRate > 0 ? '+' : ''}{y.neutralGrowthRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button onClick={() => setShowCalculationModal(false)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 保险取用弹窗
  const renderWithdrawModal = () => {
    if (!showWithdrawModal) return null;
    const record = selectedInsurance?.transactionRecords?.find(r => r.id === withdrawRecordId);
    if (!record) return null;
    const cashFlow = parseFloat(record.cashFlowAmount || 0);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {record.withdrawn ? '修改取用账户' : '取用资金'}
            </h3>
            <button onClick={() => setShowWithdrawModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500 dark:text-gray-400">保单年度</span>
                <span className="font-medium text-gray-900 dark:text-white">{record.year || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">现金流量额</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCurrency(cashFlow, selectedInsurance.currency)}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                取用录入账户 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="account-list"
                value={withdrawTargetAccountId}
                onChange={(e) => setWithdrawTargetAccountId(e.target.value)}
                placeholder="输入或选择账户名"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="account-list">
                {accounts.map(a => (
                  <option key={a.id || a.name} value={a.name}>{a.category || ''}</option>
                ))}
              </datalist>
              <div className="mt-2 flex flex-wrap gap-1">
                {accounts.map(a => (
                  <button
                    key={a.id || a.name}
                    onClick={() => setWithdrawTargetAccountId(a.id || a.name)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      withdrawTargetAccountId === (a.id || a.name)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
            {record.withdrawn && (
              <button
                onClick={async () => {
                  const newRecords = selectedInsurance.transactionRecords.map(r => {
                    if (r.id === record.id) {
                      const { withdrawn, withdrawAccountId, ...rest } = r;
                      return rest;
                    }
                    return r;
                  });
                  await handleUpdateTransactionField(newRecords);
                  setShowWithdrawModal(false);
                }}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                取消取用
              </button>
            )}
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={async () => {
                if (!withdrawTargetAccountId) {
                  alert('请选择取用账户');
                  return;
                }
                const newRecords = selectedInsurance.transactionRecords.map(r => {
                  if (r.id === record.id) {
                    return {
                      ...r,
                      withdrawn: true,
                      withdrawAccountId: withdrawTargetAccountId,
                      withdrawTime: new Date().toISOString(),
                    };
                  }
                  return r;
                });
                await handleUpdateTransactionField(newRecords);
                setShowWithdrawModal(false);
              }}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              确认取用
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInsuranceTransactionModal = () => {
    if (!showInsuranceTransactionModal) return null;

    const records = selectedInsurance?.transactionRecords || [];
    const currentRecords = editingTransaction 
      ? records.filter(r => r.id !== editingTransaction.id)
      : records;
    const newRecord = { ...transactionFormData };
    const allRecords = [...currentRecords, newRecord];
    
    const guaranteedCashValue = parseFloat(newRecord.guaranteedCashValue || 0);
    const bonusDividend = parseFloat(newRecord.bonusDividend || 0);
    const midTermDividend = parseFloat(newRecord.midTermDividend || 0);
    const totalAmount = guaranteedCashValue + bonusDividend + midTermDividend;
    const premiumPaid = parseFloat(newRecord.premiumPaid || 0);

    const demoRate = premiumPaid > 0 ? ((totalAmount - premiumPaid) / premiumPaid) * 100 : 0;

    const sortedRecords = [...allRecords]
      .filter(r => r.year || r.year === 0)
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    const totalPremium = sortedRecords.reduce((sum, r) => sum + parseFloat(r.premiumPaid || 0), 0);
    const currentYear = parseInt(newRecord.year || 0);
    const annualizedReturn = totalPremium > 0 && currentYear > 0
      ? (Math.pow(totalAmount / totalPremium, 1 / currentYear) - 1) * 100
      : null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingTransaction ? '编辑交易记录' : '新增交易记录'}
            </h2>
            <button onClick={() => setShowInsuranceTransactionModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            {!editingTransaction && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">图文识别（上传保单图片自动识别）</h3>
                </div>

                {!ocrImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">点击上传保单图片</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">支持 JPG、PNG 格式</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleOCRUpload} className="hidden" />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <img src={ocrImage} alt="保单预览" className="max-h-48 mx-auto rounded-lg object-contain" />
                      <button onClick={() => { setOcrImage(null); setOcrResult(null); }} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {!ocrResult && !ocrLoading && (
                      <button onClick={handleRunOCR} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                        开始识别
                      </button>
                    )}

                    {ocrLoading && (
                      <div className="text-center py-2 text-sm text-gray-500">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        识别中...
                      </div>
                    )}

                    {ocrResult && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">识别结果（可编辑并选择多行数据）</div>
                          {selectedOcrRecords.length > 0 && (
                            <button onClick={handleApplySelectedOcrRecords} className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                              应用选中的 {selectedOcrRecords.length} 条数据
                            </button>
                          )}
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border border-gray-200 dark:border-slate-600 rounded-lg">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                              <tr>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600 w-10">
                                  <input type="checkbox" checked={selectedOcrRecords.length === ocrResult.length} onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedOcrRecords(ocrResult.map((_, i) => i));
                                    } else {
                                      setSelectedOcrRecords([]);
                                    }
                                  }} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">保单年度</th>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">缴付保费</th>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">保证现金价值</th>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">复归红利</th>
                                <th className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-600">终期红利</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                              {ocrResult.map((record, index) => (
                                <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${selectedOcrRecords.includes(index) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                  <td className="px-3 py-2">
                                    <input type="checkbox" checked={selectedOcrRecords.includes(index)} onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedOcrRecords([...selectedOcrRecords, index]);
                                      } else {
                                        setSelectedOcrRecords(selectedOcrRecords.filter(i => i !== index));
                                      }
                                    }} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="text" value={record.year || ''} onChange={(e) => {
                                      const newResult = [...ocrResult];
                                      newResult[index] = { ...newResult[index], year: e.target.value };
                                      setOcrResult(newResult);
                                    }} className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="number" value={record.premiumPaid || ''} onChange={(e) => {
                                      const newResult = [...ocrResult];
                                      newResult[index] = { ...newResult[index], premiumPaid: e.target.value };
                                      setOcrResult(newResult);
                                    }} className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="number" value={record.guaranteedCashValue || ''} onChange={(e) => {
                                      const newResult = [...ocrResult];
                                      newResult[index] = { ...newResult[index], guaranteedCashValue: e.target.value };
                                      setOcrResult(newResult);
                                    }} className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="number" value={record.bonusDividend || ''} onChange={(e) => {
                                      const newResult = [...ocrResult];
                                      newResult[index] = { ...newResult[index], bonusDividend: e.target.value };
                                      setOcrResult(newResult);
                                    }} className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input type="number" value={record.midTermDividend || ''} onChange={(e) => {
                                      const newResult = [...ocrResult];
                                      newResult[index] = { ...newResult[index], midTermDividend: e.target.value };
                                      setOcrResult(newResult);
                                    }} className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <button onClick={() => { setOcrResult(null); setSelectedOcrRecords([]); }} className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          重新识别
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selectedInsurance?.insuranceType === '年金险' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年月（YYYY-MM）</label>
                    <input type="month" value={transactionFormData.year || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, year: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
                    <input type="date" value={transactionFormData.date || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当年保费</label>
                    <input type="number" value={transactionFormData.annualPremium || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, annualPremium: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">累计保费</label>
                    <input type="number" value={transactionFormData.cumulativePremium || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, cumulativePremium: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当年保证年金</label>
                    <input type="number" value={transactionFormData.annualGuaranteedAnnuity || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, annualGuaranteedAnnuity: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">累计保证领取</label>
                    <input type="number" value={transactionFormData.cumulativeGuaranteedReceived || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, cumulativeGuaranteedReceived: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年末现金价值</label>
                    <input type="number" value={transactionFormData.yearEndCashValue || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, yearEndCashValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当年红利(演示)</label>
                    <input type="number" value={transactionFormData.annualDividendDemo || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, annualDividendDemo: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">累积红利(演示)</label>
                    <input type="number" value={transactionFormData.cumulativeDividendDemo || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, cumulativeDividendDemo: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">含红利生存总利益</label>
                    <input type="number" readOnly value={
                      parseFloat(transactionFormData.yearEndCashValue || 0) +
                      parseFloat(transactionFormData.cumulativeDividendDemo || 0)
                    } className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当年实际红利</label>
                    <input type="number" value={transactionFormData.annualActualDividend || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, annualActualDividend: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际累计红利</label>
                    <input type="number" value={transactionFormData.cumulativeActualDividend || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, cumulativeActualDividend: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保单年度终结</label>
                    <input type="text" value={transactionFormData.year || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, year: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
                    <input type="date" value={transactionFormData.date || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">缴付保费总额</label>
                    <input type="number" value={transactionFormData.premiumPaid || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, premiumPaid: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保证现金价值</label>
                    <input type="number" value={transactionFormData.guaranteedCashValue || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, guaranteedCashValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">复归红利</label>
                    <input type="number" value={transactionFormData.bonusDividend || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, bonusDividend: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">终期红利</label>
                    <input type="number" value={transactionFormData.midTermDividend || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, midTermDividend: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">总额</label>
                    <input type="number" readOnly value={totalAmount} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">演示现金流</label>
                    <input type="number" readOnly value={-(parseFloat(transactionFormData.premiumPaid || 0)) + totalAmount} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">演示收益率(%)</label>
                    <input type="number" readOnly value={demoRate.toFixed(2)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年化收益率(%)</label>
                    <input type="number" readOnly value={annualizedReturn !== null ? annualizedReturn.toFixed(4) : ''} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none" />
                  </div>
                  {editingTransaction && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际收益额</label>
                        <input type="number" value={transactionFormData.actualProfitAmount || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, actualProfitAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际收益率(%)</label>
                        <input type="number" value={transactionFormData.actualProfitRate || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, actualProfitRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际现金流</label>
                        <input type="number" readOnly value={-(parseFloat(transactionFormData.premiumPaid || 0)) + parseFloat(transactionFormData.actualProfitAmount || 0)} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">内部收益率IRR(%)</label>
                        <input type="number" value={transactionFormData.irr || ''} onChange={(e) => setTransactionFormData({ ...transactionFormData, irr: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button onClick={() => setShowInsuranceTransactionModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 dark:border-slate-600 rounded-lg transition-colors">
              取消
            </button>
            <button onClick={handleSaveInsuranceTransaction} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPropertyDetailModal = () => {
    if (!showPropertyDetailModal || !selectedProperty) return null;
    const item = selectedProperty;
    const rentAmount = parseFloat(item.rentAmount || 0);
    const depositAmount = parseFloat(item.depositAmount || 0);
    const startDate = item.startDate ? new Date(item.startDate) : null;
    const endDate = item.endDate ? new Date(item.endDate) : null;
    const now = new Date();

    const totalMonths = startDate && endDate
      ? (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
      : 0;
    const totalDays = startDate && endDate
      ? Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))
      : 0;
    const totalYears = totalDays > 0 ? (totalDays / 365).toFixed(1) : 0;
    const dailyRent = totalDays > 0 ? (rentAmount * totalMonths) / totalDays : rentAmount / 30;
    const monthlyRent = rentAmount;
    const yearlyRent = rentAmount * 12;

    const generatePaymentRecords = () => {
      if (!startDate || !endDate || totalMonths <= 0) return [];
      const records = item.paymentRecords || [];
      if (records.length > 0) {
        return records.map(r => ({
          ...r,
          rentalStatus: r.rentalStatus || '已出租',
          isTerminated: r.isTerminated || '未退租',
          refundAmount: r.refundAmount !== undefined ? r.refundAmount : (r.isTerminated === '已退租' ? rentAmount : 0),
        }));
      }

      const result = [];
      for (let i = 0; i < totalMonths; i++) {
        const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const label = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;
        result.push({
          id: `pay-${item.id}-${i}`,
          label,
          year: monthDate.getFullYear().toString(),
          dueDate: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`,
          receivable: rentAmount,
          received: 0,
          status: 'unpaid',
          rentalStatus: '已出租',
          isTerminated: '未退租',
          refundAmount: 0,
        });
      }
      return result;
    };

    const paymentRecords = generatePaymentRecords();

    const savePaymentRecords = async (updatedRecords) => {
      const updated = { ...item, paymentRecords: updatedRecords };
      setSelectedProperty(updated);

      const allItems = getAssets('realestate');
      const nextItems = allItems.map(i => i.id === item.id ? updated : i);
      setStateData({
        ...stateData,
        independentAssets: {
          ...stateData.independentAssets,
          realestate: nextItems,
        },
      });

      try {
        await updateAssets('realestate', nextItems);
      } catch (err) {
        console.error('Failed to save payment records:', err);
      }
    };

    const handleTogglePaymentStatus = (recordId) => {
      const updatedRecords = paymentRecords.map(r => {
        if (r.id === recordId) {
          if (r.status === 'unpaid') {
            return { ...r, status: 'paid', received: r.receivable };
          } else if (r.status === 'paid') {
            return { ...r, status: 'overdue', received: 0 };
          } else {
            return { ...r, status: 'unpaid', received: 0 };
          }
        }
        return r;
      });
      savePaymentRecords(updatedRecords);
    };

    const handleToggleTerminated = (recordId) => {
      const updatedRecords = paymentRecords.map(r => {
        if (r.id === recordId) {
          const newTerminated = r.isTerminated === '未退租' ? '已退租' : '未退租';
          return {
            ...r,
            isTerminated: newTerminated,
            rentalStatus: newTerminated === '已退租' ? '未出租' : (r.rentalStatus || '已出租'),
            refundAmount: newTerminated === '已退租' ? rentAmount : 0,
          };
        }
        return r;
      });
      savePaymentRecords(updatedRecords);
    };

    const handleToggleRentalStatus = (recordId) => {
      const updatedRecords = paymentRecords.map(r => {
        if (r.id === recordId) {
          return { ...r, rentalStatus: r.rentalStatus === '已出租' ? '未出租' : '已出租' };
        }
        return r;
      });
      savePaymentRecords(updatedRecords);
    };

    const handleRefundChange = (recordId, value) => {
      const num = parseFloat(value) || 0;
      const updatedRecords = paymentRecords.map(r =>
        r.id === recordId ? { ...r, refundAmount: num } : r
      );
      savePaymentRecords(updatedRecords);
    };

    const getPaymentStatusBadge = (status) => {
      if (status === 'paid') {
        return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer">已付款</span>;
      } else if (status === 'overdue') {
        return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-pointer">已逾期</span>;
      }
      return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-pointer">未付款</span>;
    };

    const getRentalStatusBadge = (status) => {
      if (status === '已出租') {
        return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer">已出租</span>;
      }
      return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-pointer">未出租</span>;
    };

    const getTerminatedBadge = (status) => {
      if (status === '已退租') {
        return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-pointer">已退租</span>;
      }
      return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-pointer">未退租</span>;
    };

    const groupByYear = () => {
      const groups = {};
      paymentRecords.forEach(r => {
        const year = r.year || r.label.match(/(\d{4})年/)?.[1] || '未知';
        if (!groups[year]) groups[year] = [];
        groups[year].push(r);
      });
      return groups;
    };

    const yearGroups = groupByYear();
    const sortedYears = Object.keys(yearGroups).sort((a, b) => b.localeCompare(a));

    const toggleYear = (year) => {
      const next = new Set(expandedYears);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      setExpandedYears(next);
    };

    const calculateYearStats = (yearRecords) => {
      let totalIncome = 0;
      let totalRefund = 0;
      let vacancyMonths = 0;
      let terminatedIndex = -1;

      yearRecords.forEach((r, idx) => {
        if (r.status === 'paid') {
          totalIncome += parseFloat(r.received || 0);
        }
        totalRefund += parseFloat(r.refundAmount || 0);
        if (r.isTerminated === '已退租' && terminatedIndex === -1) {
          terminatedIndex = idx;
        }
      });

      if (terminatedIndex >= 0) {
        vacancyMonths = yearRecords.length - terminatedIndex;
      }

      const totalVacancy = vacancyMonths * rentAmount;

      return { totalIncome, totalRefund, totalVacancy };
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">出租明细</h2>
            <button onClick={() => setShowPropertyDetailModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">租赁天数</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalDays > 0 ? `${totalDays}天` : '—'}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">租赁月数</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalMonths > 0 ? `${totalMonths}月` : '—'}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">租赁年数</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalYears > 0 ? `${totalYears}年` : '—'}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">日收益</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{dailyRent > 0 ? formatCurrency(dailyRent, item.currency) : '—'}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">月收益</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{monthlyRent > 0 ? formatCurrency(monthlyRent, item.currency) : '—'}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">年收益</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{yearlyRent > 0 ? formatCurrency(yearlyRent, item.currency) : '—'}</div>
              </div>
            </div>

            {/* 累计收益 / 累计收益率 / IRR 收益率 */}
            {(() => {
              const cumulativeIncome = paymentRecords.reduce((sum, r) => {
                if (r.status !== 'paid') return sum;
                return sum + parseFloat(r.received || 0);
              }, 0);
              const holdingCost = parseFloat(item.holdingCost || 0);
              const cumulativeYield = holdingCost > 0 && cumulativeIncome > 0
                ? ((cumulativeIncome / holdingCost) * 100).toFixed(2) + '%'
                : '—';

              // 构建现金流数组用于 XIRR：综合持有成本为期初负现金流，已付款记录的实收租金为正现金流
              const cashflows = [];
              const dates = [];
              if (holdingCost > 0 && startDate) {
                cashflows.push(-holdingCost);
                dates.push(new Date(startDate));
              }
              paymentRecords.forEach(r => {
                if (r.status !== 'paid') return;
                const received = parseFloat(r.received || 0);
                if (received <= 0 || !r.dueDate) return;
                const parts = r.dueDate.split('-').map(Number);
                if (parts.length < 2) return;
                const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
                cashflows.push(received);
                dates.push(d);
              });
              const irr = (cashflows.length >= 2 && cashflows.some(c => c > 0) && cashflows.some(c => c < 0))
                ? calculateXIRR(cashflows, dates)
                : null;
              const irrDisplay = irr !== null ? `${(irr * 100).toFixed(2)}%` : '—';

              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">累计收益</div>
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{cumulativeIncome !== 0 ? formatCurrency(cumulativeIncome, item.currency) : '—'}</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">累计收益率</div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{cumulativeYield}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">IRR 收益率</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{irrDisplay}</div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">出租方式</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.rentMethod || '押一付一'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">月租金</span>
                <span className="text-gray-900 dark:text-white font-medium">{rentAmount > 0 ? formatCurrency(rentAmount, item.currency) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">押金</span>
                <span className="text-gray-900 dark:text-white font-medium">{depositAmount > 0 ? formatCurrency(depositAmount, item.currency) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">起租时间</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.startDate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">到期时间</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.endDate || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">综合持有成本</span>
                <input
                  type="number"
                  value={item.holdingCost || ''}
                  onChange={async (e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = { ...item, holdingCost: val };
                    setSelectedProperty(updated);
                    const allItems = getAssets('realestate');
                    const nextItems = allItems.map(i => i.id === item.id ? updated : i);
                    setStateData({ ...stateData, independentAssets: { ...stateData.independentAssets, realestate: nextItems } });
                    try {
                      await updateAssets('realestate', nextItems);
                    } catch (err) {
                      console.error('Failed to save holding cost:', err);
                    }
                  }}
                  className="w-32 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="请输入"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">年收益率</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {item.holdingCost && parseFloat(item.holdingCost) > 0
                    ? `${((yearlyRent / parseFloat(item.holdingCost)) * 100).toFixed(2)}%`
                    : '—'}
                </span>
              </div>
            </div>

            {item.rentMethod === '押一付一' && paymentRecords.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">付款记录（点击状态切换）</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">月份</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">应收租金</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">实收租金</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">出租状态</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">是否退租</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">退款额</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {sortedYears.map(year => {
                        const yearRecords = yearGroups[year];
                        const isExpanded = expandedYears.has(year);
                        const stats = calculateYearStats(yearRecords);

                        return (
                          <>
                            <tr className="bg-gray-100 dark:bg-slate-700/50 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700" onClick={() => toggleYear(year)}>
                              <td colSpan={7} className="px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{year}年</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">({yearRecords.length}条记录)</span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {isExpanded ? '▼ 收起' : '▶ 展开'}
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <>
                                <tr className="bg-yellow-50 dark:bg-yellow-900/10">
                                  <td colSpan={7} className="px-3 py-2">
                                    <div className="flex items-center gap-6 text-xs">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        当年总收入: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalIncome, item.currency)}</span>
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        总空闲: <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(stats.totalVacancy, item.currency)}</span>
                                      </span>
                                      <span className="text-gray-600 dark:text-gray-400">
                                        总退款: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalRefund, item.currency)}</span>
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {yearRecords.map(record => (
                                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{record.label}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(record.receivable, item.currency)}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{record.received > 0 ? formatCurrency(record.received, item.currency) : '—'}</td>
                                    <td className="px-3 py-2 cursor-pointer" onClick={() => handleToggleRentalStatus(record.id)}>{getRentalStatusBadge(record.rentalStatus)}</td>
                                    <td className="px-3 py-2 cursor-pointer" onClick={() => handleToggleTerminated(record.id)}>{getTerminatedBadge(record.isTerminated)}</td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        value={record.refundAmount}
                                        onChange={(e) => handleRefundChange(record.id, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-20 px-1 py-0.5 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </td>
                                    <td className="px-3 py-2 cursor-pointer" onClick={() => handleTogglePaymentStatus(record.id)}>{getPaymentStatusBadge(record.status)}</td>
                                  </tr>
                                ))}
                              </>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button onClick={() => setShowPropertyDetailModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFixedInvestmentDetailModal = () => {
    if (!showFixedInvestmentDetailModal || !selectedFixedInvestment) return null;
    const item = selectedFixedInvestment;
    const investmentCost = parseFloat(item.investmentCost || 0);
    const annualContribution = parseFloat(item.annualContribution || 0);
    const frequency = item.dividendFrequency || '每年';
    const currency = item.currency || 'CNY';

    // 排序后的投资现金流记录（按日期倒序）
    const sortedRecords = [...dividendRecords].sort((a, b) => {
      return (b.dividendDate || b.month || '').localeCompare(a.dividendDate || a.month || '');
    });

    const getRecordEventType = (record) => {
      if (record.eventType) return record.eventType;
      const dividendAmount = parseFloat(record.dividendAmount || 0);
      return dividendAmount > 0 ? '分红' : '投入本金';
    };

    const getRecordCashflow = (record) => {
      if (record.cashflow !== undefined) return parseFloat(record.cashflow || 0);
      const eventType = getRecordEventType(record);
      if (eventType === '分红') {
        return Math.abs(parseFloat(record.dividendAmount || 0));
      }
      const outflow = parseFloat(record.investmentCost || record.buyCost || record.annualContribution || 0);
      return outflow > 0 ? -outflow : 0;
    };

    const getRecordCostBasis = (record) => {
      const eventType = getRecordEventType(record);
      if (eventType === '分红') {
        return parseFloat(record.buyCost || record.investmentCost || 0);
      }
      return Math.abs(getRecordCashflow(record));
    };

    // 投资现金流筛选
    const filteredRecords = sortedRecords.filter(record => {
      const dateStr = record.dividendDate || record.month || '';
      if (fixedInvestmentCashflowStartDate && dateStr < fixedInvestmentCashflowStartDate) return false;
      if (fixedInvestmentCashflowEndDate && dateStr > fixedInvestmentCashflowEndDate) return false;

      const eventType = getRecordEventType(record);
      if (fixedInvestmentCashflowEventType && eventType !== fixedInvestmentCashflowEventType) return false;

      const cashflow = getRecordCashflow(record);
      if (fixedInvestmentCashflowSign === 'positive' && cashflow <= 0) return false;
      if (fixedInvestmentCashflowSign === 'negative' && cashflow >= 0) return false;

      return true;
    });

    // 计算累计买入成本
    const totalBuyCost = sortedRecords.reduce((sum, r) => sum + getRecordCostBasis(r), 0);

    // 计算累计分红金额（仅现金流入）
    const totalDividend = sortedRecords.reduce((sum, r) => {
      const cf = getRecordCashflow(r);
      return sum + (cf > 0 ? cf : 0);
    }, 0);

    // 累计分红率 = 累计分红金额 ÷ 累计买入总成本
    const totalDividendRate = totalBuyCost > 0 && totalDividend > 0
      ? ((totalDividend / totalBuyCost) * 100).toFixed(2) + '%'
      : '—';

    const totalRecords = sortedRecords.length;
    const filteredTotalRecords = filteredRecords.length;

    // 投资现金流分页
    const FIXED_INVESTMENT_CASHFLOW_PAGE_SIZE = 10;
    const totalPages = Math.max(1, Math.ceil(filteredTotalRecords / FIXED_INVESTMENT_CASHFLOW_PAGE_SIZE));
    const safePage = Math.min(fixedInvestmentCashflowPage, totalPages);
    const paginatedRecords = filteredRecords.slice(
      (safePage - 1) * FIXED_INVESTMENT_CASHFLOW_PAGE_SIZE,
      safePage * FIXED_INVESTMENT_CASHFLOW_PAGE_SIZE
    );

    // 计算每期分红率：当期分红率 = 本次分红金额 ÷ 期初持仓总成本
    const calculateDividendRate = (record, index) => {
      const eventType = getRecordEventType(record);
      if (eventType !== '分红') return '—';
      const dividend = getRecordCashflow(record);
      if (dividend <= 0) return '—';

      // 期初持仓总成本 = 到当期为止的累计买入成本
      let periodStartCost = 0;
      for (let i = index; i < sortedRecords.length; i++) {
        periodStartCost += getRecordCostBasis(sortedRecords[i]);
      }

      if (periodStartCost <= 0) return '—';
      return ((dividend / periodStartCost) * 100).toFixed(2) + '%';
    };

    // 从现金流记录中汇总的投入本金和持续投入
    const sumDividendCost = sortedRecords.reduce((sum, r) => {
      const eventType = getRecordEventType(r);
      if (eventType === '投入本金' || eventType === '本金规划') {
        return sum + Math.abs(getRecordCashflow(r));
      }
      return sum + parseFloat(r.investmentCost || 0);
    }, 0);
    const sumDividendAnnual = sortedRecords.reduce((sum, r) => {
      const eventType = getRecordEventType(r);
      if (eventType === '追加') {
        return sum + Math.abs(getRecordCashflow(r));
      }
      return sum + parseFloat(r.annualContribution || 0);
    }, 0);
    const sumAdditionalCost = sumDividendAnnual;

    // 对比校验：判断主表单投入与现金流明细汇总是否一致
    const isCostMatched = Math.abs(investmentCost - sumDividendCost) < 0.01;
    const isAnnualMatched = Math.abs(annualContribution - sumDividendAnnual) < 0.01;

    // 计算投资年数
    const calculateInvestmentYears = () => {
      if (!item.startYear) return 0;
      const start = parseInt(item.startYear);
      if (item.endYear === '无期限') {
        const current = new Date().getFullYear();
        return Math.max(0, current - start + 1);
      }
      if (!item.endYear) return 0;
      const end = parseInt(item.endYear);
      return Math.max(0, end - start + 1);
    };

    const investmentYears = calculateInvestmentYears();
    // 累计投入本金 = 投入本金 + 持续投入（不分年）
    const totalInvested = investmentCost + annualContribution;
    const profitAmount = totalDividend - totalInvested;

    // 累计投入本金（从现金流记录计算）
    const totalCashOutflow = sortedRecords.reduce((sum, r) => {
      const cf = getRecordCashflow(r);
      return sum + (cf < 0 ? Math.abs(cf) : 0);
    }, 0);

    // 回本进度 = 累计分红 ÷ 累计投入本金
    const paybackProgress = totalCashOutflow > 0
      ? ((totalDividend / totalCashOutflow) * 100).toFixed(2) + '%'
      : '—';

    // IRR 分红率：基于投资现金流记录的 XIRR
    const calculateIRR = () => {
      const cashflows = [];
      const dates = [];

      sortedRecords.forEach(record => {
        const dateStr = record.dividendDate;
        if (!dateStr) return;

        const amount = getRecordCashflow(record);
        if (amount === 0 || isNaN(amount)) return;

        const parts = dateStr.split('-').map(Number);
        let date;
        if (parts.length === 3) {
          date = new Date(parts[0], parts[1] - 1, parts[2]);
        } else if (parts.length === 2) {
          date = new Date(parts[0], parts[1] - 1, 1);
        } else {
          return;
        }

        cashflows.push(amount);
        dates.push(date);
      });

      return calculateXIRR(cashflows, dates);
    };

    const irr = calculateIRR();
    const irrDisplay = irr !== null ? `${(irr * 100).toFixed(2)}%` : '—';

    const buildRecordFromForm = (formValues) => {
      const eventType = formValues.eventType || '分红';
      const cashflow = parseFloat(formValues.cashflow) || 0;
      const absAmount = Math.abs(cashflow);
      return {
        dividendDate: formValues.dividendDate,
        month: formValues.dividendDate.slice(0, 7),
        eventType,
        cashflow,
        dividendAmount: eventType === '分红' ? absAmount : 0,
        investmentCost: eventType === '投入本金' ? absAmount : 0,
        annualContribution: eventType === '追加' ? absAmount : 0,
      };
    };

    const handleAddRecord = () => {
      if (!newDividendRecord.dividendDate || !newDividendRecord.cashflow) return;
      const newRecords = [...dividendRecords, {
        id: `div-${Date.now()}`,
        ...buildRecordFromForm(newDividendRecord),
      }];
      setDividendRecords(newRecords);
      saveDividendRecords(newRecords);
      const now = new Date();
      const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setNewDividendRecord({
        dividendDate: currentDate,
        eventType: '分红',
        cashflow: '',
      });
      setShowDividendAddForm(false);
    };

    const handleDeleteRecord = (recordId) => {
      const newRecords = dividendRecords.filter(r => r.id !== recordId);
      setDividendRecords(newRecords);
      saveDividendRecords(newRecords);
    };

    const handleStartEdit = (record) => {
      setEditingDividendRecordId(record.id);
      setEditDividendRecord({
        dividendDate: record.dividendDate || '',
        eventType: getRecordEventType(record),
        cashflow: getRecordCashflow(record).toString(),
      });
    };

    const handleCancelEdit = () => {
      setEditingDividendRecordId(null);
    };

    const handleSaveEdit = () => {
      if (!editDividendRecord.dividendDate || !editDividendRecord.cashflow) return;
      const newRecords = dividendRecords.map(r =>
        r.id === editingDividendRecordId
          ? { ...r, id: r.id, ...buildRecordFromForm(editDividendRecord) }
          : r
      );
      setDividendRecords(newRecords);
      saveDividendRecords(newRecords);
      setEditingDividendRecordId(null);
    };

    const saveDividendRecords = async (updatedRecords) => {
      const updatedItem = { ...item, dividendRecords: updatedRecords };
      setSelectedFixedInvestment(updatedItem);

      // 使用函数式 setState 避免陈旧快照，确保与其他并发更新隔离
      setStateData(prevState => {
        const prevAssets = prevState.independentAssets || {};
        const allItems = prevAssets.fixedinvestment || [];
        const nextItems = allItems.map(i => i.id === item.id ? updatedItem : i);
        return {
          ...prevState,
          independentAssets: {
            ...prevAssets,
            fixedinvestment: nextItems,
          },
        };
      });

      try {
        const allItems = getAssets('fixedinvestment');
        const nextItems = allItems.map(i => i.id === item.id ? updatedItem : i);
        await updateAssets('fixedinvestment', nextItems);
      } catch (err) {
        console.error('Failed to save dividend records:', err);
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        return `${parts[0]}年${parts[1]}月${parts[2]}日`;
      } else if (parts.length === 2) {
        return `${parts[0]}年${parts[1]}月`;
      }
      return dateStr;
    };

    // 关闭明细：把本地 dividendRecords（可能含有未通过 saveDividendRecords 保存的编辑）
    // 同步到全局 stateData，保证列表数据与详情一致
    const handleCloseDetail = () => {
      const latestItem = { ...item, dividendRecords };
      setStateData(prevState => {
        const prevAssets = prevState.independentAssets || {};
        const allItems = prevAssets.fixedinvestment || [];
        const nextItems = allItems.map(i => i.id === item.id ? latestItem : i);
        return {
          ...prevState,
          independentAssets: {
            ...prevAssets,
            fixedinvestment: nextItems,
          },
        };
      });
      setSelectedFixedInvestment(latestItem);
      setShowFixedInvestmentDetailModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">固定投资明细</h2>
            <button onClick={handleCloseDetail} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`${isCostMatched ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400'} rounded-lg p-3 text-center`}>
                <div className="text-xs text-gray-500 dark:text-gray-400">投入本金 {isCostMatched ? '✓' : '⚠️'}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(investmentCost, currency)}</div>
                {!isCostMatched && dividendRecords.length > 0 && (
                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                    分红汇总: {formatCurrency(sumDividendCost, currency)}
                  </div>
                )}
              </div>
              <div className={`${isAnnualMatched ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400'} rounded-lg p-3 text-center`}>
                <div className="text-xs text-gray-500 dark:text-gray-400">持续投入 {isAnnualMatched ? '✓' : '⚠️'}</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(annualContribution, currency)}</div>
                {!isAnnualMatched && dividendRecords.length > 0 && (
                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                    追加汇总: {formatCurrency(sumAdditionalCost, currency)}
                  </div>
                )}
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">分红频率</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{frequency}</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">投资年限</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {item.startYear && item.endYear
                    ? (item.endYear === '无期限' ? '无期限' : `${parseInt(item.endYear) - parseInt(item.startYear) + 1}年`)
                    : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">累计投入本金</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalInvested, currency)}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">累计分红</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalDividend, currency)}</div>
              </div>
              <div className={`${profitAmount >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-3 text-center`}>
                <div className="text-xs text-gray-500 dark:text-gray-400">收益额</div>
                <div className={`text-lg font-bold ${profitAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {profitAmount >= 0 ? '+' : ''}{formatCurrency(profitAmount, currency)}
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">累计分红率</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {totalInvested > 0 && totalDividend > 0 ? ((totalDividend / totalInvested) * 100).toFixed(2) + '%' : '—'}
                </div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">IRR 分红率</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {irrDisplay}
                </div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">回本进度</div>
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  {paybackProgress}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">类型</span>
                  <span className="text-gray-900 dark:text-white font-medium">{item.type || '—'}</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">结束年份</span>
                  <span className="text-gray-900 dark:text-white font-medium">{item.endYear || '—'}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">投资现金流</h3>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    累计分红: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalDividend, currency)}</span>
                    <span className="mx-2">·</span>
                    共 {filteredTotalRecords} 条{filteredTotalRecords !== totalRecords && ` / 总计 ${totalRecords} 条`}
                  </div>
                  <button
                    onClick={() => setShowDividendAddForm(!showDividendAddForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加</span>
                  </button>
                </div>
              </div>

              {showDividendAddForm && (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">事件类型</label>
                      <select
                        value={newDividendRecord.eventType}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, eventType: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      >
                        {FIXED_INVESTMENT_EVENT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">日期</label>
                      <input
                        type="date"
                        value={newDividendRecord.dividendDate}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, dividendDate: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">现金流金额</label>
                      <input
                        type="number"
                        value={newDividendRecord.cashflow}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, cashflow: e.target.value })}
                        placeholder="输入金额（负数表示流出）"
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setShowDividendAddForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-600 rounded transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddRecord}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      确认添加
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={fixedInvestmentCashflowStartDate}
                      onChange={(e) => setFixedInvestmentCashflowStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={fixedInvestmentCashflowEndDate}
                      onChange={(e) => setFixedInvestmentCashflowEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">事件类型</label>
                    <select
                      value={fixedInvestmentCashflowEventType}
                      onChange={(e) => setFixedInvestmentCashflowEventType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">全部</option>
                      {FIXED_INVESTMENT_EVENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">现金流方向</label>
                    <select
                      value={fixedInvestmentCashflowSign}
                      onChange={(e) => setFixedInvestmentCashflowSign(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="all">全部</option>
                      <option value="positive">正（流入）</option>
                      <option value="negative">负（流出）</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setFixedInvestmentCashflowStartDate('');
                        setFixedInvestmentCashflowEndDate('');
                        setFixedInvestmentCashflowEventType('');
                        setFixedInvestmentCashflowSign('all');
                      }}
                      className="w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-600 rounded transition-colors border border-gray-200 dark:border-slate-600"
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">日期</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">事件</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">现金流</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">现金流正负</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">当期分红率</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          {sortedRecords.length === 0 ? '暂无投资现金流记录，点击上方"添加"按钮录入' : '没有符合条件的记录'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((record, index) => {
                        const isEditing = editingDividendRecordId === record.id;
                        const eventType = getRecordEventType(record);
                        const cashflow = getRecordCashflow(record);
                        if (isEditing) {
                          return (
                            <tr key={`edit-${record.id}`} className="bg-blue-50/50 dark:bg-blue-900/10">
                              <td colSpan={6} className="px-3 py-2">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">日期</label>
                                    <input
                                      type="date"
                                      value={editDividendRecord.dividendDate}
                                      onChange={(e) => setEditDividendRecord({ ...editDividendRecord, dividendDate: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">事件类型</label>
                                    <select
                                      value={editDividendRecord.eventType}
                                      onChange={(e) => setEditDividendRecord({ ...editDividendRecord, eventType: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                    >
                                      {FIXED_INVESTMENT_EVENT_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">现金流金额</label>
                                    <input
                                      type="number"
                                      value={editDividendRecord.cashflow}
                                      onChange={(e) => setEditDividendRecord({ ...editDividendRecord, cashflow: e.target.value })}
                                      placeholder="输入金额（负数表示流出）"
                                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-600 rounded transition-colors"
                                    >
                                      取消
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">{formatDate(record.dividendDate || record.month)}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{eventType}</td>
                            <td className={`px-3 py-2 font-medium ${cashflow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(cashflow, currency)}
                            </td>
                            <td className={`px-3 py-2 ${cashflow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {cashflow >= 0 ? '流入' : '流出'}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white">{calculateDividendRate(record, sortedRecords.indexOf(record))}</td>
                            <td className="px-3 py-2 flex gap-2">
                              <button
                                onClick={() => handleStartEdit(record)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredTotalRecords > FIXED_INVESTMENT_CASHFLOW_PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    共 {filteredTotalRecords} 条，{totalPages} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFixedInvestmentCashflowPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="p-1.5 rounded border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setFixedInvestmentCashflowPage(page)}
                        className={`min-w-[28px] h-7 px-1.5 text-xs rounded border transition-colors ${
                          page === safePage
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setFixedInvestmentCashflowPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="p-1.5 rounded border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">跳至</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value)) {
                              setFixedInvestmentCashflowPage(Math.max(1, Math.min(totalPages, value)));
                            }
                          }
                        }}
                        className="w-14 px-1.5 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-center"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">页</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFixedDepositDetailModal = () => {
    if (!showFixedDepositDetailModal || !selectedFixedDeposit) return null;
    const item = selectedFixedDeposit;
    const amount = parseFloat(item.amount || 0);
    const annualRate = parseFloat(item.interestRate !== undefined && item.interestRate !== '' ? item.interestRate : (item.interest || 0));

    const calculateYears = (start, end) => {
      if (!start || !end) return 0;
      const s = new Date(start);
      const e = new Date(end);
      if (e <= s) return 0;
      return (e - s) / (1000 * 60 * 60 * 24) / 365;
    };

    const years = calculateYears(item.startDate, item.endDate);
    const today = new Date();
    const endDate = item.endDate ? new Date(item.endDate) : null;
    const daysToMaturity = endDate ? Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))) : null;

    const hasAmount = amount > 0;
    const hasRate = annualRate > 0;
    const hasYears = years > 0;

    const dailyInterest = hasAmount && hasRate ? amount * (annualRate / 100) / 365 : null;
    const dailyRate = hasRate ? annualRate / 365 : null;
    const monthlyInterest = hasAmount && hasRate ? amount * (annualRate / 100) / 12 : null;
    const monthlyRate = hasRate ? annualRate / 12 : null;
    const yearlyInterest = hasAmount && hasRate ? amount * (annualRate / 100) : null;
    const totalReturn = hasAmount && hasRate && hasYears ? amount * (annualRate / 100) * years : null;
    const totalAmount = hasAmount && totalReturn !== null ? amount + totalReturn : null;
    const totalRate = hasRate && hasYears ? annualRate * years : null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">定期资产明细</h2>
            <button onClick={() => setShowFixedDepositDetailModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">日利息</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{dailyInterest !== null ? formatCurrency(dailyInterest, item.currency) : '—'}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">日利率</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{dailyRate !== null ? `${dailyRate.toFixed(4)}%` : '—'}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">月利息</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{monthlyInterest !== null ? formatCurrency(monthlyInterest, item.currency) : '—'}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">月利率</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{monthlyRate !== null ? `${monthlyRate.toFixed(4)}%` : '—'}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">年利息</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{yearlyInterest !== null ? formatCurrency(yearlyInterest, item.currency) : '—'}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">年利率</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{hasRate ? `${annualRate}%` : '—'}</div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">到期日倒计时</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {daysToMaturity !== null ? `${daysToMaturity} 天` : '—'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">到期总利息</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalReturn !== null ? formatCurrency(totalReturn, item.currency) : '—'}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">总利率</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalRate !== null ? `${totalRate.toFixed(2)}%` : '—'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">到期总金额（本金+利息）</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalAmount !== null ? formatCurrency(totalAmount, item.currency) : '—'}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">市场</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.market || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">地点</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.location || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">类型</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.type || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">作用</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.usage || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">方式</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.termType || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">金额</span>
                <span className="text-gray-900 dark:text-white font-medium">{hasAmount ? formatCurrency(amount, item.currency) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">年化年数</span>
                <span className="text-gray-900 dark:text-white font-medium">{hasYears ? `${years.toFixed(2)} 年` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">开始时间</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.startDate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">结束时间</span>
                <span className="text-gray-900 dark:text-white font-medium">{item.endDate || '—'}</span>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
            <button onClick={() => setShowFixedDepositDetailModal(false)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSelfUseDetailModal = () => {
    if (!showSelfUseDetailModal || !selectedSelfUseProperty) return null;
    const item = selectedSelfUseProperty;
    const purchasePrice = parseFloat(item.purchasePrice || 0);
    const marketValue = parseFloat(selfUseMarketPricePerSqm || 0) * parseFloat(selfUseMarketArea || 0);
    const gainLoss = marketValue - purchasePrice;
    const gainLossRate = purchasePrice > 0 ? (gainLoss / purchasePrice) * 100 : 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">自用价值对比</h2>
            <button onClick={() => setShowSelfUseDetailModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">市场每平方米价格</label>
                <input
                  type="number"
                  value={selfUseMarketPricePerSqm}
                  onChange={(e) => setSelfUseMarketPricePerSqm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">市场面积(㎡)</label>
                <input
                  type="number"
                  value={selfUseMarketArea}
                  onChange={(e) => setSelfUseMarketArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-between text-sm pt-4 border-t border-gray-100 dark:border-slate-700">
              <span className="text-gray-500 dark:text-gray-400">购买价</span>
              <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(purchasePrice, item.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">市场估值</span>
              <span className="text-gray-900 dark:text-white font-medium">{marketValue > 0 ? formatCurrency(marketValue, item.currency) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">涨跌额</span>
              <span className={`font-medium ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {marketValue > 0 ? formatCurrency(gainLoss, item.currency) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">涨跌幅</span>
              <span className={`font-medium ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {marketValue > 0 ? `${gainLoss >= 0 ? '+' : ''}${gainLossRate.toFixed(2)}%` : '—'}
              </span>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button onClick={() => setShowSelfUseDetailModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              关闭
            </button>
            <button
              onClick={async () => {
                const marketValue = parseFloat(selfUseMarketPricePerSqm || 0) * parseFloat(selfUseMarketArea || 0);
                const gainLoss = marketValue - purchasePrice;
                const gainLossRate = purchasePrice > 0 ? (gainLoss / purchasePrice) * 100 : 0;
                const updated = {
                  ...item,
                  marketPricePerSqm: selfUseMarketPricePerSqm,
                  marketArea: selfUseMarketArea,
                  marketValue: marketValue,
                  profitLossAmount: gainLoss,
                  profitLossRate: gainLossRate,
                };
                setStateData({
                  ...stateData,
                  independentAssets: {
                    ...stateData.independentAssets,
                    realestate: (stateData.independentAssets.realestate || []).map(i => i.id === item.id ? updated : i),
                  },
                });
                try {
                  const allItems = getAssets('realestate');
                  await updateAssets('realestate', allItems.map(i => i.id === item.id ? updated : i));
                } catch (err) {
                  console.error('Failed to save market data:', err);
                }
                setShowSelfUseDetailModal(false);
              }}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'insurance':
        return renderInsuranceTable();
      case 'realestate':
        return renderRealEstateTable();
      case 'vehicle':
        return renderVehicleTable();
      case 'fixedinvestment':
        return renderFixedInvestmentTable();
      case 'equity':
        return renderEquityTable();
      case 'fixeddeposit':
        return renderFixedDepositTable();
      case 'forex':
        return renderForexTable();
      default:
        return renderInsuranceTable();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">独立资产</h1>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
          <span>刷新</span>
        </button>
      </div>

      {renderSummaryCards()}

      {hasLinkedAccounts && renderAccountsTable()}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          {ASSET_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {renderContent()}

      {renderModal()}
      {renderVehicleDetailModal()}
      {renderInsuranceDetailModal()}
      {renderWithdrawModal()}
      {renderInsuranceTransactionModal()}
      {renderCalculationModal()}
      {renderPropertyDetailModal()}
      {renderFixedDepositDetailModal()}
      {renderSelfUseDetailModal()}
      {renderFixedInvestmentDetailModal()}
    </div>
  );
}