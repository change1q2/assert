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

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
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
  { id: 'fixeddeposit', label: '定期存', icon: Clock },
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

  const { accounts = [], independentAssets = {} } = stateData || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchState();
      setStateData(data);
    } catch (err) {
      console.error('Failed to load data:', err);
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
      },
      realestate: {
        country: '',
        province: '',
        city: '',
        district: '',
        type: '',
        avgPrice: '',
        secondHandPrice: '',
        newHousePrice: '',
      },
      vehicle: {
        vehicleType: '小轿车',
        manufacturer: '',
        model: '',
        purchasePrice: '',
        secondHandPrice: '',
        newCarPrice: '',
      },
      fixedinvestment: {
        country: '',
        province: '',
        district: '',
        type: '',
        investmentCost: '',
        dividendDate: '',
        dividendAmount: '',
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
      },
      fixeddeposit: {
        market: '',
        location: '',
        type: '',
        currency: '',
        amount: '',
        interest: '',
        period: '',
        expectedReturn: '',
        actualReturn: '',
      },
    };
    return defaults[type] || {};
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData(activeTab));
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!confirm('确定删除该资产吗？')) return;
    const items = getAssets(activeTab);
    await updateAssets(activeTab, items.filter(i => i.id !== item.id));
  };

  const handleSave = async () => {
    const items = getAssets(activeTab);
    const newItem = {
      ...formData,
      id: editingItem?.id || Date.now().toString(),
      createdAt: editingItem?.createdAt || new Date().toISOString(),
    };
    if (editingItem) {
      await updateAssets(activeTab, items.map(i => i.id === newItem.id ? newItem : i));
    } else {
      await updateAssets(activeTab, [...items, newItem]);
    }
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
  };

  const summaryData = useMemo(() => {
    let totalValue = 0;
    let demoProfit = 0;
    let actualProfit = 0;

    Object.keys(independentAssets).forEach(type => {
      const items = independentAssets[type] || [];
      items.forEach(item => {
        if (type === 'insurance') {
          totalValue += parseFloat(item.premiumTotal || 0);
          demoProfit += parseFloat(item.demoProfitAmount || 0);
          actualProfit += parseFloat(item.actualProfitAmount || 0);
        } else if (type === 'realestate') {
          totalValue += parseFloat(item.secondHandPrice || item.avgPrice || 0);
        } else if (type === 'vehicle') {
          totalValue += parseFloat(item.secondHandPrice || item.purchasePrice || 0);
        } else if (type === 'fixedinvestment') {
          totalValue += parseFloat(item.investmentCost || 0);
          actualProfit += parseFloat(item.dividendAmount || 0);
        } else if (type === 'equity') {
          totalValue += parseFloat(item.marketValue || 0);
          actualProfit += parseFloat(item.pnl || 0);
        } else if (type === 'fixeddeposit') {
          totalValue += parseFloat(item.amount || 0);
          actualProfit += parseFloat(item.actualReturn || 0);
        }
      });
    });

    return { totalValue, demoProfit, actualProfit };
  }, [independentAssets]);

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
    const filteredAccounts = accounts.filter(account => {
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
            {filteredAccounts.map(account => (
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
                <div className="grid grid-cols-1 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">账户余额</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(account.balance || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
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
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.premiumTotal)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.guaranteedAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.nonGuaranteedAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.demoProfitAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.demoProfitRate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.demoAnnualRate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.actualProfitAmount)}</td>
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
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">房产资产</h3>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">国家</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">省份</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">市区</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">地区</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">方式</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">出租方式</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">租金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">押金</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">是否出租</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.country}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.province}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.city}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.usage || '自用'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.rentMethod || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.rentAmount ? formatCurrency(item.rentAmount) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.depositAmount ? formatCurrency(item.depositAmount) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.isRented || '—'}</td>
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
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无房产资产数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">二手价格</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">新车价</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.vehicleType}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.manufacturer}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.model}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.purchasePrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.secondHandPrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.newCarPrice)}</td>
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
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无车辆资产数据</td>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">投入成本</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">分红时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">分红金额</th>
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
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.investmentCost)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.dividendDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.dividendAmount)}</td>
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
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无固定投资数据</td>
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
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.cost)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatNumber(item.quantity)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.currentPrice)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.marketValue)}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${pnlClass}`}>{formatCurrency(item.pnl)}</td>
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
          <h3 className="font-semibold text-gray-900 dark:text-white">定期存款</h3>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">货币种类</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">利息</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">期间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">预期收益</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">实际收益</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.market}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.location}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.currency}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatPercentage(item.interest)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.period}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.expectedReturn)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.actualReturn)}</td>
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
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无定期存款数据</td>
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
        </div>
      </>
    );

    const renderRealEstateForm = () => {
      const countries = Object.keys(COUNTRY_REGION_DATA);
      const provinces = formData.country ? Object.keys(COUNTRY_REGION_DATA[formData.country] || {}) : [];
      const cities = (formData.country && formData.province) ? (COUNTRY_REGION_DATA[formData.country][formData.province] || []) : [];

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
              <select
                value={formData.usage || '自用'}
                onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="自用">自用</option>
                <option value="出租">出租</option>
              </select>
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
        </>
      );
    };

    const renderVehicleForm = () => (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
            <select value={formData.vehicleType || '小轿车'} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="小轿车">小轿车</option>
              <option value="电动车">电动车</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">厂商</label>
            <input type="text" value={formData.manufacturer || ''} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">型号</label>
            <input type="text" value={formData.model || ''} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">购买价格</label>
            <input type="number" value={formData.purchasePrice || ''} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">二手价格</label>
            <input type="number" value={formData.secondHandPrice || ''} onChange={(e) => setFormData({ ...formData, secondHandPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新车价</label>
            <input type="number" value={formData.newCarPrice || ''} onChange={(e) => setFormData({ ...formData, newCarPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </>
    );

    const renderFixedInvestmentForm = () => (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">国家</label>
            <input type="text" value={formData.country || ''} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">省份</label>
            <input type="text" value={formData.province || ''} onChange={(e) => setFormData({ ...formData, province: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地区</label>
            <input type="text" value={formData.district || ''} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
            <select value={formData.type || ''} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              <option value="债券">债券</option>
              <option value="基金定投">基金定投</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">投入成本</label>
            <input type="number" value={formData.investmentCost || ''} onChange={(e) => setFormData({ ...formData, investmentCost: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分红时间</label>
            <input type="date" value={formData.dividendDate || ''} onChange={(e) => setFormData({ ...formData, dividendDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分红金额</label>
            <input type="number" value={formData.dividendAmount || ''} onChange={(e) => setFormData({ ...formData, dividendAmount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </>
    );

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
        </div>
      </>
    );

    const renderFixedDepositForm = () => (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">市场</label>
            <input type="text" value={formData.market || ''} onChange={(e) => setFormData({ ...formData, market: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">地点</label>
            <input type="text" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">类型</label>
            <select value={formData.type || ''} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              <option value="定期存款">定期存款</option>
              <option value="大额存单">大额存单</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">货币种类</label>
            <select value={formData.currency || ''} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              <option value="CNY">人民币</option>
              <option value="USD">美元</option>
              <option value="HKD">港币</option>
              <option value="JPY">日元</option>
              <option value="EUR">欧元</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金额</label>
            <input type="number" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">利息(%)</label>
            <input type="number" value={formData.interest || ''} onChange={(e) => setFormData({ ...formData, interest: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">期间(月)</label>
            <input type="number" value={formData.period || ''} onChange={(e) => setFormData({ ...formData, period: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预期收益</label>
            <input type="number" value={formData.expectedReturn || ''} onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">实际收益</label>
            <input type="number" value={formData.actualReturn || ''} onChange={(e) => setFormData({ ...formData, actualReturn: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </>
    );

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
    </div>
  );
}