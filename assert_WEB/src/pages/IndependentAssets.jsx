import { useState, useEffect, useMemo } from 'react';
import { fetchState, saveState } from '../api';
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
} from 'lucide-react';
import { VEHICLE_TYPES, VEHICLE_BRANDS, VEHICLE_MODELS } from '../data/vehicle-data';

const CURRENCY_OPTIONS = [
  { code: 'CNY', symbol: '¥', label: '人民币 (CNY)' },
  { code: 'USD', symbol: '$', label: '美元 (USD)' },
  { code: 'HKD', symbol: 'HK$', label: '港币 (HKD)' },
  { code: 'JPY', symbol: '¥', label: '日元 (JPY)' },
  { code: 'EUR', symbol: '€', label: '欧元 (EUR)' },
  { code: 'GBP', symbol: '£', label: '英镑 (GBP)' },
];

function formatCurrency(value, currency = 'CNY') {
  if (value === null || value === undefined) return '—';
  const option = CURRENCY_OPTIONS.find(c => c.code === currency) || CURRENCY_OPTIONS[0];
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${option.symbol}${formatted}`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value) {
  if (value === null || value === undefined) return '—';
  const n = parseFloat(value);
  if (isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const ASSET_TABS = [
  { id: 'insurance', label: '保险', icon: Briefcase },
  { id: 'realestate', label: '房产', icon: Building2 },
  { id: 'vehicle', label: '车辆', icon: Car },
  { id: 'fixedinvestment', label: '固定投资', icon: Landmark },
  { id: 'equity', label: '股权', icon: DollarSign },
  { id: 'fixeddeposit', label: '定期资产', icon: Clock },
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
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    month: '',
    investmentCost: '',
    annualContribution: '',
    dividendAmount: '',
  });

  const { accounts = [], independentAssets = {} } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    }
  };

  const saveData = async (data) => {
    await saveState({ ...stateData, ...data });
    await loadData();
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
        policyYear: '',
        premiumTotal: '',
        guaranteedAmount: '',
        nonGuaranteedAmount: '',
        demoProfitAmount: '',
        demoProfitRate: '',
        demoAnnualRate: '',
        actualProfitAmount: '',
        actualProfitRate: '',
        actualAnnualRate: '',
        currency: 'CNY',
        accountId: '',
        accountName: '',
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
    setEditingItem(item);
    setFormData({ ...defaults, ...item });
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
    setDividendRecords(item.dividendRecords || []);
    setShowDividendAddForm(false);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setNewDividendRecord({
      month: currentMonth,
      investmentCost: item.investmentCost || '',
      annualContribution: item.annualContribution || '',
      dividendAmount: '',
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

  const handleSave = async () => {
    if (!formData.accountId) {
      alert('请选择账户本');
      return;
    }
    const items = getAssets(activeTab);
    const newItem = {
      ...formData,
      id: editingItem?.id || Date.now().toString(),
      createdAt: editingItem?.createdAt || new Date().toISOString(),
    };
    const nextItems = editingItem
      ? items.map(i => i.id === newItem.id ? newItem : i)
      : [...items, newItem];
    try {
      await updateAssets(activeTab, nextItems);
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
        if (type === 'insurance') {
          totalValue += parseFloat(item.premiumTotal || 0);
          totalCost += parseFloat(item.premiumTotal || 0);
          demoProfit += parseFloat(item.demoProfitAmount || 0);
          actualProfit += parseFloat(item.actualProfitAmount || 0);
        } else if (type === 'realestate') {
          if (item.usage === '出租') {
            totalValue += parseFloat(item.purchasePrice || 0);
          } else {
            const marketValue = parseFloat(item.marketValue || 0);
            const taxAmount = parseFloat(item.taxAmount || 0);
            const agencyFeeAmount = parseFloat(item.agencyFeeAmount || 0);
            const actualValue = marketValue > 0 ? (marketValue - taxAmount - agencyFeeAmount) : parseFloat(item.purchasePrice || 0);
            totalValue += actualValue;
          }
          totalCost += parseFloat(item.purchasePrice || 0);
        } else if (type === 'vehicle') {
          const { residualValue } = calculateVehicleResidualValue(item);
          totalValue += residualValue;
          totalCost += parseFloat(item.purchasePrice || 0);
        } else if (type === 'fixedinvestment') {
          totalValue += parseFloat(item.investmentCost || 0);
          totalCost += parseFloat(item.investmentCost || 0);
          if (item.dividendRecords && Array.isArray(item.dividendRecords)) {
            actualProfit += item.dividendRecords.reduce((sum, r) => sum + parseFloat(r.dividendAmount || 0), 0);
          } else {
            const cost = parseFloat(item.investmentCost || 0);
            const rate = parseFloat(item.annualDividendRate || 0);
            if (cost && rate) {
              actualProfit += cost * rate / 100;
            } else {
              actualProfit += parseFloat(item.dividendAmount || 0);
            }
          }
        } else if (type === 'equity') {
          totalValue += parseFloat(item.marketValue || 0);
          totalCost += parseFloat(item.investmentCost || 0);
          actualProfit += parseFloat(item.pnl || 0);
        } else if (type === 'fixeddeposit') {
          totalValue += parseFloat(item.amount || 0);
          totalCost += parseFloat(item.amount || 0);
          actualProfit += parseFloat(item.actualReturn || 0);
        }
      });
    });

    return { totalValue, totalCost, demoProfit, actualProfit };
  }, [independentAssets]);

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

  const renderAccountsTable = () => {
    const usedAccountIds = new Set();
    Object.values(independentAssets).forEach(items => {
      items.forEach(item => {
        if (item.accountId) {
          usedAccountIds.add(item.accountId);
        }
      });
    });

    const filteredAccounts = accounts.filter(account => {
      if (usedAccountIds.size > 0 && !usedAccountIds.has(account.id)) return false;
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
              let marketValue = 0;
              let purchaseCost = 0;
              let profitLoss = 0;
              let profitLossRate = 0;
              let fees = 0;
              let actualValue = 0;

              Object.values(independentAssets).forEach(items => {
                items.forEach(item => {
                  if (item.accountId === account.id) {
                    if (item.type === 'realestate') {
                      if (item.usage === '出租') {
                        const purchasePrice = parseFloat(item.purchasePrice || 0);
                        marketValue += purchasePrice;
                        purchaseCost += purchasePrice;
                        actualValue += purchasePrice;
                      } else {
                        const mv = parseFloat(item.marketValue || 0);
                        const pp = parseFloat(item.purchasePrice || 0);
                        const tax = parseFloat(item.taxAmount || 0);
                        const agency = parseFloat(item.agencyFeeAmount || 0);
                        const pl = parseFloat(item.profitLossAmount || 0);
                        
                        marketValue += mv > 0 ? mv : pp;
                        purchaseCost += pp;
                        profitLoss += pl;
                        fees += tax + agency;
                        actualValue += mv > 0 ? (mv - tax - agency) : pp;
                      }
                    } else if (item.type === 'vehicle') {
                      const { residualValue } = calculateVehicleResidualValue(item);
                      const pp = parseFloat(item.purchasePrice || 0);
                      marketValue += residualValue;
                      purchaseCost += pp;
                      profitLoss += residualValue - pp;
                      actualValue += residualValue;
                    } else if (item.type === 'insurance') {
                      const premium = parseFloat(item.premiumTotal || 0);
                      marketValue += premium;
                      purchaseCost += premium;
                      actualValue += premium;
                    } else if (item.type === 'fixedinvestment') {
                      const cost = parseFloat(item.investmentCost || 0);
                      marketValue += cost;
                      purchaseCost += cost;
                      actualValue += cost;
                    } else if (item.type === 'equity') {
                      const mv = parseFloat(item.marketValue || 0);
                      marketValue += mv;
                      purchaseCost += parseFloat(item.cost || item.marketValue || 0);
                      profitLoss += parseFloat(item.pnl || 0);
                      actualValue += mv;
                    } else if (item.type === 'fixeddeposit') {
                      const amount = parseFloat(item.amount || 0);
                      marketValue += amount;
                      purchaseCost += amount;
                      actualValue += amount;
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保单年度</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保费总额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">保证金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">非保证金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">演示收益额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">演示收益率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">演示年化收益率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际收益额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际收益率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际年化收益率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.policyYear}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.premiumTotal, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.guaranteedAmount, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.nonGuaranteedAmount, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.demoProfitAmount, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.demoProfitRate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.demoAnnualRate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.actualProfitAmount, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.actualProfitRate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.actualAnnualRate)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无保险资产数据</td>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">币种</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {rentalItems.map(item => (
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
                  ))}
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
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFixedInvestmentTable = () => {
    const items = getAssets('fixedinvestment');
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">分红频率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.country}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.province}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.investmentCost, item.currency)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.dividendFrequency || '每年'}</td>
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
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无固定投资数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEquityTable = () => {
    const items = getAssets('equity');
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">股权</h3>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">代码</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">成本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">数量</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">当前价格</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">市值</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">盈亏</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">盈亏比例</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => {
                const pnlValue = parseFloat(item.pnl || 0);
                const pnlClass = pnlValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.cost, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(item.quantity)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.currentPrice, item.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.marketValue, item.currency)}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${pnlClass}`}>{formatCurrency(item.pnl, item.currency)}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${pnlClass}`}>{formatPercentage(item.pnlRate)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无股权数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFixedDepositTable = () => {
    const items = getAssets('fixeddeposit');
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">方式</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">货币种类</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">利率</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">开始时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">结束时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">预期收益</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际收益</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.market || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.location || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.termType || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.amount ? formatCurrency(item.amount, item.currency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.interestRate !== undefined && item.interestRate !== '' ? formatPercentage(item.interestRate) : (item.interest ? formatPercentage(item.interest) : '—')}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.startDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.endDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.expectedReturn ? formatCurrency(item.expectedReturn, item.currency) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.actualReturn ? formatCurrency(item.actualReturn, item.currency) : '—'}</td>
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
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无定期资产数据</td>
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
              {accounts.map(account => (
                <option key={account.id || account.name} value={account.id || account.name}>
                  {account.name}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保单年度</label>
            <input type="text" value={formData.policyYear || ''} onChange={(e) => setFormData({ ...formData, policyYear: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保费总额</label>
            <input type="number" value={formData.premiumTotal || ''} onChange={(e) => setFormData({ ...formData, premiumTotal: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">保证金额</label>
            <input type="number" value={formData.guaranteedAmount || ''} onChange={(e) => setFormData({ ...formData, guaranteedAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">非保证金额</label>
            <input type="number" value={formData.nonGuaranteedAmount || ''} onChange={(e) => setFormData({ ...formData, nonGuaranteedAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">演示收益额</label>
            <input type="number" value={formData.demoProfitAmount || ''} onChange={(e) => setFormData({ ...formData, demoProfitAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">演示收益率(%)</label>
            <input type="number" value={formData.demoProfitRate || ''} onChange={(e) => setFormData({ ...formData, demoProfitRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">演示年化收益率(%)</label>
            <input type="number" value={formData.demoAnnualRate || ''} onChange={(e) => setFormData({ ...formData, demoAnnualRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际收益额</label>
            <input type="number" value={formData.actualProfitAmount || ''} onChange={(e) => setFormData({ ...formData, actualProfitAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际收益率(%)</label>
            <input type="number" value={formData.actualProfitRate || ''} onChange={(e) => setFormData({ ...formData, actualProfitRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际年化收益率(%)</label>
            <input type="number" value={formData.actualAnnualRate || ''} onChange={(e) => setFormData({ ...formData, actualAnnualRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持续投入/年</label>
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

    const renderEquityForm = () => (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
            <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">代码</label>
            <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">成本</label>
            <input type="number" value={formData.cost || ''} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">数量</label>
            <input type="number" value={formData.quantity || ''} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前价格</label>
            <input type="number" value={formData.currentPrice || ''} onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">市值</label>
            <input type="number" value={formData.marketValue || ''} onChange={(e) => setFormData({ ...formData, marketValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">盈亏</label>
            <input type="number" value={formData.pnl || ''} onChange={(e) => setFormData({ ...formData, pnl: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">盈亏比例(%)</label>
            <input type="number" value={formData.pnlRate || ''} onChange={(e) => setFormData({ ...formData, pnlRate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">作用</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预期收益（自动）</label>
              <input
                type="text"
                value={expectedReturn ? formatCurrency(expectedReturn, formData.currency) : ''}
                readOnly
                placeholder="填写金额、利率、起止时间后自动计算"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际收益</label>
              <input type="number" value={formData.actualReturn || ''} onChange={(e) => setFormData({ ...formData, actualReturn: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">综合持有成本</span>
                <input
                  type="number"
                  value={item.holdingCost || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = { ...item, holdingCost: val };
                    setSelectedProperty(updated);
                    const allItems = getAssets('realestate');
                    const nextItems = allItems.map(i => i.id === item.id ? updated : i);
                    setStateData({ ...stateData, independentAssets: { ...stateData.independentAssets, realestate: nextItems } });
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

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const monthOptions = [];
    for (let y = currentYear + 10; y >= currentYear - 20; y--) {
      for (let m = 12; m >= 1; m--) {
        if (y === currentYear + 10 && m > currentMonth) continue;
        monthOptions.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }

    const formatMonth = (monthStr) => {
      if (!monthStr) return '';
      const [y, m] = monthStr.split('-');
      return `${y}年${parseInt(m)}月`;
    };

    const calculateDividendRate = (record) => {
      const cost = parseFloat(record.investmentCost || 0);
      const contrib = parseFloat(record.annualContribution || 0);
      const dividend = parseFloat(record.dividendAmount || 0);
      const totalCost = cost + contrib;
      if (totalCost <= 0 || dividend <= 0) return '—';
      return ((dividend / totalCost) * 100).toFixed(2) + '%';
    };

    const handleAddRecord = () => {
      if (!newDividendRecord.month || !newDividendRecord.dividendAmount) return;
      const newRecords = [...dividendRecords, {
        id: `div-${Date.now()}`,
        month: newDividendRecord.month,
        investmentCost: parseFloat(newDividendRecord.investmentCost) || 0,
        annualContribution: parseFloat(newDividendRecord.annualContribution) || 0,
        dividendAmount: parseFloat(newDividendRecord.dividendAmount) || 0,
      }].sort((a, b) => b.month.localeCompare(a.month));
      setDividendRecords(newRecords);
      saveDividendRecords(newRecords);
      const now = new Date();
      const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setNewDividendRecord({
        month: currMonth,
        investmentCost: item.investmentCost || '',
        annualContribution: item.annualContribution || '',
        dividendAmount: '',
      });
      setShowDividendAddForm(false);
    };

    const handleDeleteRecord = (recordId) => {
      const newRecords = dividendRecords.filter(r => r.id !== recordId);
      setDividendRecords(newRecords);
      saveDividendRecords(newRecords);
    };

    const saveDividendRecords = async (updatedRecords) => {
      const updatedItem = { ...item, dividendRecords: updatedRecords };
      setSelectedFixedInvestment(updatedItem);

      const allItems = getAssets('fixedinvestment');
      const nextItems = allItems.map(i => i.id === item.id ? updatedItem : i);
      setStateData({
        ...stateData,
        independentAssets: {
          ...stateData.independentAssets,
          fixedinvestment: nextItems,
        },
      });

      try {
        await updateAssets('fixedinvestment', nextItems);
      } catch (err) {
        console.error('Failed to save dividend records:', err);
      }
    };

    const totalDividend = dividendRecords.reduce((sum, r) => sum + parseFloat(r.dividendAmount || 0), 0);
    const totalRecords = dividendRecords.length;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">固定投资明细</h2>
            <button onClick={() => setShowFixedInvestmentDetailModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">投入本金</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(investmentCost, currency)}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">持续投入/年</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(annualContribution, currency)}</div>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">类型</span>
                  <span className="text-gray-900 dark:text-white font-medium">{item.type || '—'}</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">起始年份</span>
                  <span className="text-gray-900 dark:text-white font-medium">{item.startYear ? `${item.startYear}年` : '—'}</span>
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
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">分红明细</h3>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    累计分红: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalDividend, currency)}</span>
                    <span className="mx-2">·</span>
                    共 {totalRecords} 条
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
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">年月</label>
                      <select
                        value={newDividendRecord.month}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, month: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      >
                        {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">投入本金</label>
                      <input
                        type="number"
                        value={newDividendRecord.investmentCost}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, investmentCost: e.target.value })}
                        placeholder="输入本金"
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">持续投入/年</label>
                      <input
                        type="number"
                        value={newDividendRecord.annualContribution}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, annualContribution: e.target.value })}
                        placeholder="持续投入"
                        className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">分红金额</label>
                      <input
                        type="number"
                        value={newDividendRecord.dividendAmount}
                        onChange={(e) => setNewDividendRecord({ ...newDividendRecord, dividendAmount: e.target.value })}
                        placeholder="分红金额"
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

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">年月</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">投入本金</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">持续投入/年</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">分红金额</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">分红率</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {dividendRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无分红记录，点击上方"添加"按钮录入</td>
                      </tr>
                    ) : (
                      dividendRecords.map(record => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">{formatMonth(record.month)}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(record.investmentCost, currency)}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(record.annualContribution, currency)}</td>
                          <td className="px-3 py-2 text-green-600 dark:text-green-400 font-medium">{formatCurrency(record.dividendAmount, currency)}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{calculateDividendRate(record)}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
                <div className="text-xs text-gray-500 dark:text-gray-400">到期总收益</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalReturn !== null ? formatCurrency(totalReturn, item.currency) : '—'}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">总利率</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{totalRate !== null ? `${totalRate.toFixed(2)}%` : '—'}</div>
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

      {renderAccountsTable()}

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
      {renderPropertyDetailModal()}
      {renderFixedDepositDetailModal()}
      {renderSelfUseDetailModal()}
      {renderFixedInvestmentDetailModal()}
    </div>
  );
}