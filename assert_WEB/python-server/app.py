#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
投资分析网页后端服务
整合 AkShare (A股/港股/美股) + yfinance (财务数据) 实时数据
提供四大师视角分析接口
"""

import sys
import os
import json
import time
import traceback
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import realtime_data as rt
import strategy_data as sd

app = Flask(__name__, static_folder="web")
CORS(app)

# 简单分析模板（基于实时数据生成文本报告）
def generate_analysis(market: str, symbol: str, data: dict):
    """基于实时数据生成四大师视角分析文本。"""
    quotes = data.get("quotes", [])
    klines = data.get("klines", [])

    if not quotes:
        return {"error": "未获取到实时行情数据"}

    q = quotes[0]

    # 提取关键指标
    def _safe_float(val, default=0.0):
        try:
            v = float(val)
            return v
        except (ValueError, TypeError):
            return default

    def _safe_str(val, default="N/A"):
        if val in (None, "", "-"):
            return default
        return str(val)

    price = _safe_float(q.get("price", 0))
    chg_pct = _safe_float(q.get("chg_pct", 0))
    pe_raw = _safe_str(q.get("pe", "-"), "N/A")
    try:
        pe = f"{float(pe_raw):.2f}"
    except:
        pe = pe_raw
    market_cap = q.get("market_cap", "-")
    volume = q.get("volume", "-")
    high_52w_raw = _safe_str(q.get("high_52w", "-"), "N/A")
    low_52w_raw = _safe_str(q.get("low_52w", "-"), "N/A")
    try:
        high_52w = f"{float(high_52w_raw):.2f}"
    except:
        high_52w = high_52w_raw
    try:
        low_52w = f"{float(low_52w_raw):.2f}"
    except:
        low_52w = low_52w_raw
    open_p = _safe_float(q.get("open", 0))
    high_p = _safe_float(q.get("high", 0))
    low_p = _safe_float(q.get("low", 0))
    chg_amt = _safe_float(q.get("chg_amt", 0))

    # 计算距52周高点回撤
    try:
        h52 = float(high_52w)
        drawdown = ((price / h52) - 1) * 100
        drawdown_text = f"{drawdown:.1f}%"
    except:
        drawdown_text = "N/A"

    # 计算距52周低点涨幅
    try:
        l52 = float(low_52w)
        upside = ((price / l52) - 1) * 100
        upside_text = f"{upside:.1f}%"
    except:
        upside_text = "N/A"

    # 格式化市值
    try:
        mc = float(market_cap)
        if mc >= 1e8:
            mc_text = f"${mc / 1e9:.2f}B"
        elif mc >= 1e4:
            mc_text = f"${mc / 1e4:.2f}万"
        else:
            mc_text = f"${mc:.2f}"
    except:
        mc_text = str(market_cap) if market_cap not in ("-", "") else "N/A"

    # 格式化成交量
    try:
        vol = float(volume)
        if vol >= 1e6:
            vol_text = f"{vol / 1e6:.2f}M"
        elif vol >= 1e3:
            vol_text = f"{vol / 1e3:.2f}K"
        else:
            vol_text = f"{vol:.0f}"
    except:
        vol_text = str(volume) if volume not in ("-", "") else "N/A"

    timestamp = q.get("datetime", datetime.now().strftime("%Y-%m-%d %H:%M"))
    name = _safe_str(q.get("name", symbol.upper()), symbol.upper())
    open_text = f"${open_p:.2f}" if open_p else "N/A"
    high_text = f"${high_p:.2f}" if high_p else "N/A"
    low_text = f"${low_p:.2f}" if low_p else "N/A"
    chg_amt_text = f"{chg_amt:+.2f}" if chg_amt else "N/A"

    # 生成四大师分析
    analysis = f"""## 📊 {name} ({symbol.upper()}) 投资分析报告

> **分析时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> **数据来源**：AkShare 新浪实时行情
> **数据时间戳**：{timestamp}

---

### 一、实时行情快照

| 指标 | 数值 |
|------|------|
| **最新价** | ${price:.2f} |
| **涨跌幅** | {chg_pct:+.2f}% |
| **涨跌额** | {chg_amt_text} |
| **今开** | {open_text} |
| **最高** | {high_text} |
| **最低** | {low_text} |
| **52周高/低** | {high_52w} / {low_52w} |
| **距52周高点** | {drawdown_text} |
| **距52周低点** | {upside_text if upside_text != 'N/A' else 'N/A'} |
| **成交量** | {vol_text} |
| **市值** | {mc_text} |
| **PE** | {pe} |

---

### 二、段永平视角：生意本质

**能不能看懂？**

这门生意的核心模式需要判断：
- 是否有**定价权**？产品是否有差异化？
- 是**好生意**还是**烂生意**？
- 能否估算未来10年的自由现金流？

**关键问题**：这家公司的竞争优势是什么？是品牌、技术、网络效应、还是成本优势？

---

### 三、巴菲特视角：财务质量

**赚的是真钱还是假钱？**

| 财务质量指标 | 判断方向 |
|-------------|---------|
| PE {pe} | {'偏低估值，需看利润质量' if pe not in ('N/A', '-') and pe.replace('.','').replace('-','').isdigit() and float(pe) < 20 else '偏高估值，需警惕' if pe not in ('N/A', '-') else '暂无数据'} |
| 距52周高点 {drawdown_text} | {'已大幅回调，可能有吸引力' if drawdown_text != 'N/A' and float(drawdown_text.replace('%','')) < -30 else '回调不充分' if drawdown_text != 'N/A' else '暂无数据'} |
| 市值 {mc_text} | {'大盘股，抗风险能力强' if mc_text not in ('N/A', '-') and 'B' in mc_text and float(mc_text.replace('$','').replace('B','')) > 100 else '中小盘股，波动较大' if mc_text not in ('N/A', '-') else '暂无数据'} |

**巴菲特的判断**：核心看利润质量——利润是来自客户付费的真钱，还是来自会计调整的假钱？

---

### 四、芒格视角：竞争格局

**反过来想**：

1. 这个行业的竞争格局是改善还是恶化？
2. 未来5-10年，这家公司的竞争地位会变强还是变弱？
3. 有没有潜在的disruptor（新技术、新玩家）？

**关键判断**：竞争护城河的宽度和深度是什么？品牌？技术壁垒？客户锁定？成本优势？

---

### 五、李录视角：风险管理

**风险检查清单**：

| 风险类型 | 当前状态 |
|---------|---------|
| 预期是否已透支？ | {'需检查市场预期是否过高' if chg_pct > 5 else '情绪相对中性' if abs(chg_pct) < 3 else '可能有恐慌性抛售'} |
| 是不是周期顶部？ | {'处于高位，需警惕' if chg_pct > 3 and drawdown_text != 'N/A' and float(drawdown_text.replace('%','')) > -20 else '相对合理'} |
| 管理层是否可信？ | 需进一步调研 |
| 行业是否有结构性威胁？ | 需分析行业趋势 |

**李录的建议**：最好的买入时机是所有人都不看好的时候。

---

### 六、综合判断

**核心原则**：价格是你付出的，价值是你得到的。

当前价位是否值得买入，取决于：
1. 这家公司的**生意模式**是否好？
2. 财务质量是否**经得起审计**？
3. 竞争格局是否**可持续**？
4. 当前价格是否**足够便宜**？

> ⚠️ 本报告基于实时行情数据自动生成，仅供参考，不构成投资建议。
> 完整分析需要结合公司财报、行业研报、管理层访谈等多维度信息。
"""

    return analysis


@app.route("/")
def index():
    return send_from_directory("web", "index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """分析接口。

    请求体: { "market": "a"|"hk"|"us", "symbol": "600519" }
    返回: { "analysis": "markdown文本", "data": {...} }
    """
    body = request.get_json() or {}
    market = (body.get("market", "a")).lower()
    symbol = (body.get("symbol", "")).strip()

    if not symbol:
        return jsonify({"error": "请输入股票代码"}), 400

    # 1. 获取实时行情
    data = {"quotes": [], "klines": []}

    try:
        if market == "a":
            row = rt.get_a_stock_realtime(symbol)
            if row is None:
                return jsonify({"error": f"未找到A股代码 {symbol}"}), 404
            # 转换为统一格式
            data["quotes"] = [{
                "name": row.get("名称", symbol),
                "price": row.get("最新价", 0),
                "chg_pct": row.get("涨跌幅", 0),
                "chg_amt": row.get("涨跌额", 0),
                "open": row.get("今开", 0),
                "high": row.get("最高", 0),
                "low": row.get("最低", 0),
                "high_52w": "-",
                "low_52w": "-",
                "volume": row.get("成交量", 0),
                "pe": "-",
                "market_cap": "-",
                "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }]
        elif market == "hk":
            row = rt.get_hk_stock_realtime(symbol)
            if row is None:
                return jsonify({"error": f"未找到港股代码 {symbol}"}), 404
            data["quotes"] = [{
                "name": row.get("中文名称", symbol),
                "price": row.get("最新价", 0),
                "chg_pct": row.get("涨跌幅", 0),
                "chg_amt": row.get("涨跌额", 0),
                "open": row.get("今开", 0),
                "high": row.get("最高", 0),
                "low": row.get("最低", 0),
                "high_52w": "-",
                "low_52w": "-",
                "volume": row.get("成交量", 0),
                "pe": "-",
                "market_cap": "-",
                "datetime": row.get("日期时间", ""),
            }]
        elif market == "us":
            # 先尝试快速接口
            rows = rt._sina_us_quote([symbol])
            if rows:
                data["quotes"] = rows
            else:
                row = rt.get_us_stock_realtime(symbol)
                if row is None:
                    return jsonify({"error": f"未找到美股代码 {symbol}"}), 404
                data["quotes"] = [row]
        else:
            return jsonify({"error": f"不支持的市场类型: {market}"}), 400
    except Exception as e:
        return jsonify({"error": f"数据获取失败: {str(e)}"}), 500

    # 2. 生成分析报告
    try:
        analysis = generate_analysis(market, symbol, data)
    except Exception as e:
        analysis = f"分析生成失败: {str(e)}"
        traceback.print_exc()

    return jsonify({
        "analysis": analysis,
        "data": data,
        "symbol": symbol.upper(),
        "market": market,
        "timestamp": datetime.now().isoformat(),
    })


def calculate_scores(market: str, symbol: str, q: dict) -> dict:
    """基于实时数据计算四维度评分。

    注意：基于实时行情数据的量化推断，数据有限时给予保守中性评分。
    """
    price = float(q.get("price", 0) or 0)
    chg_pct = float(q.get("chg_pct", 0) or 0)
    pe_raw = q.get("pe", "-")
    try:
        pe = float(pe_raw)
    except (ValueError, TypeError):
        pe = None
    
    market_cap = q.get("market_cap", "-")
    volume_raw = q.get("volume", "-")
    turnover_raw = q.get("turnover", "-")  # 成交额
    
    try:
        high_52w = float(q.get("high_52w", 0) or 0)
    except (ValueError, TypeError):
        high_52w = 0
    try:
        low_52w = float(q.get("low_52w", 0) or 0)
    except (ValueError, TypeError):
        low_52w = 0

    # 计算指标
    try:
        drawdown_from_high = ((price / high_52w) - 1) * 100 if high_52w > 0 else None
    except:
        drawdown_from_high = None
    try:
        upside_from_low = ((price / low_52w) - 1) * 100 if low_52w > 0 else None
    except:
        upside_from_low = None
    try:
        market_cap_val = float(market_cap)
    except:
        market_cap_val = None
    try:
        volume_val = float(volume_raw)
    except:
        volume_val = None
    try:
        turnover_val = float(turnover_raw)
    except:
        turnover_val = None

    # 判断数据丰富程度
    has_pe_data = pe is not None
    has_mc_data = market_cap_val is not None
    has_52w_data = drawdown_from_high is not None
    
    # 如果关键数据缺失，给予基础评分而非0分
    data_quality = "完整" if (has_pe_data and has_mc_data) else "部分" if (has_pe_data or has_mc_data) else "有限"

    # 1. 生意模式评分 (30分) - 段永平视角
    business_score = 0
    business_details = {}
    
    # 差异化程度 (10分)
    diff_score = 5  # 基础分：中性
    if market_cap_val:
        if market_cap_val > 5e11:
            diff_score = 9  # 5000亿+
        elif market_cap_val > 1e11:
            diff_score = 8  # 1000亿+
        elif market_cap_val > 5e10:
            diff_score = 7  # 500亿+
        elif market_cap_val > 1e10:
            diff_score = 5  # 100亿+
        elif market_cap_val > 1e9:
            diff_score = 4  # 10亿+
        else:
            diff_score = 3
    if pe and pe > 30:
        diff_score = min(10, diff_score + 2)
    elif pe and pe > 15:
        diff_score = min(10, diff_score + 1)
    business_details["差异化程度"] = {"score": diff_score, "max": 10, "reason": f"市值和PE{('数据充足' if has_mc_data and has_pe_data else '数据有限，给予中性评分')}"}
    business_score += diff_score
    
    # 定价权 (10分)
    pricing_score = 5  # 基础分
    if pe:
        if pe > 40:
            pricing_score = 9
        elif pe > 25:
            pricing_score = 7
        elif pe > 15:
            pricing_score = 5
        elif pe > 0:
            pricing_score = 3
    else:
        # 无PE数据时，根据涨跌幅推断
        if chg_pct > 3:
            pricing_score = 6  # 上涨可能反映市场认可定价权
        elif chg_pct > 0:
            pricing_score = 5
        elif chg_pct < -3:
            pricing_score = 3
    business_details["定价权"] = {"score": pricing_score, "max": 10, "reason": f"基于{'PE' if has_pe_data else '股价表现'}推断"}
    business_score += pricing_score
    
    # 护城河宽度 (10分)
    moat_score = 5  # 基础分
    if market_cap_val:
        if market_cap_val > 5e11:
            moat_score = 9
        elif market_cap_val > 1e11:
            moat_score = 7
        elif market_cap_val > 5e10:
            moat_score = 6
        elif market_cap_val > 1e10:
            moat_score = 5
        elif market_cap_val > 1e9:
            moat_score = 4
        else:
            moat_score = 3
    if drawdown_from_high is not None and drawdown_from_high > -20:
        moat_score = min(10, moat_score + 1)  # 回调小可能反映护城河宽
    elif drawdown_from_high is not None and drawdown_from_high < -40:
        moat_score = max(0, moat_score - 2)  # 回调大可能反映护城河窄
    business_details["护城河宽度"] = {"score": moat_score, "max": 10, "reason": f"{'市值和股价稳定性' if has_mc_data else '市值'}推断"}
    business_score += moat_score

    # 2. 财务质量评分 (25分) - 巴菲特视角
    financial_score = 0
    financial_details = {}
    
    # ROE (5分)
    roe_score = 3  # 基础分
    if pe and pe > 0:
        if pe < 15:
            roe_score = 5
        elif pe < 25:
            roe_score = 4
        elif pe < 40:
            roe_score = 3
        elif pe < 60:
            roe_score = 2
        else:
            roe_score = 1
    elif chg_pct > 2 and (pe is None):
        roe_score = 4  # 上涨可能反映盈利能力
    financial_details["ROE水平"] = {"score": roe_score, "max": 5, "reason": f"基于{'PE' if has_pe_data else '股价表现'}推断"}
    financial_score += roe_score
    
    # 现金流质量 (5分)
    cashflow_score = 3  # 中性
    if chg_pct > 2:
        cashflow_score = 4  # 上涨可能反映现金流健康
    elif chg_pct < -5:
        cashflow_score = 2  # 大跌可能反映现金流问题
    if turnover_val and turnover_val > 1e9:
        cashflow_score = min(5, cashflow_score + 1)  # 成交额大可能反映流动性好
    financial_details["现金流质量"] = {"score": cashflow_score, "max": 5, "reason": "基于股价表现和成交额推断"}
    financial_score += cashflow_score
    
    # 毛利率稳定性 (5分)
    margin_score = 3  # 中性
    if market_cap_val and market_cap_val > 1e11:
        margin_score = 4  # 大盘股通常毛利率更稳定
    elif chg_pct > 0:
        margin_score = 3
    financial_details["毛利率稳定性"] = {"score": margin_score, "max": 5, "reason": "基于市值和股价稳定性推断"}
    financial_score += margin_score
    
    # 负债水平 (5分)
    debt_score = 3  # 中性（无数据时保守估计）
    financial_details["负债水平"] = {"score": debt_score, "max": 5, "reason": "暂无数据，给予中性评分"}
    financial_score += debt_score
    
    # 自由现金流 (5分)
    fcf_score = 3  # 中性
    if chg_pct > 1:
        fcf_score = 4
    elif chg_pct < -3:
        fcf_score = 2
    financial_details["自由现金流"] = {"score": fcf_score, "max": 5, "reason": "基于股价表现推断"}
    financial_score += fcf_score

    # 3. 竞争格局评分 (25分) - 芒格视角
    competition_score = 0
    competition_details = {}
    
    # 行业地位 (8分)
    position_score = 4  # 基础分：中性
    if market_cap_val:
        if market_cap_val > 1e12:
            position_score = 8
        elif market_cap_val > 5e11:
            position_score = 7
        elif market_cap_val > 1e11:
            position_score = 6
        elif market_cap_val > 5e10:
            position_score = 5
        elif market_cap_val > 1e10:
            position_score = 4
        elif market_cap_val > 1e9:
            position_score = 3
        else:
            position_score = 2
    elif volume_val and volume_val > 1e7:
        position_score = 5  # 成交量大可能反映市场地位
    competition_details["行业地位"] = {"score": position_score, "max": 8, "reason": f"基于{'市值' if has_mc_data else '成交量'}推断"}
    competition_score += position_score
    
    # 技术颠覆风险 (8分)
    disruption_score = 5  # 中性
    if drawdown_from_high is not None:
        if drawdown_from_high < -50:
            disruption_score = 2
        elif drawdown_from_high < -30:
            disruption_score = 4
        elif drawdown_from_high < -10:
            disruption_score = 6
        else:
            disruption_score = 7
    if chg_pct > 5:
        disruption_score = min(8, disruption_score + 1)  # 强势上涨可能反映抗颠覆
    competition_details["技术颠覆风险低"] = {"score": disruption_score, "max": 8, "reason": f"基于{'股价回撤' if has_52w_data else '近期表现'}推断"}
    competition_score += disruption_score
    
    # 新玩家威胁 (9分)
    threat_score = 4  # 中性
    if market_cap_val:
        if market_cap_val > 1e12:
            threat_score = 9
        elif market_cap_val > 5e11:
            threat_score = 8
        elif market_cap_val > 1e11:
            threat_score = 7
        elif market_cap_val > 5e10:
            threat_score = 6
        elif market_cap_val > 1e10:
            threat_score = 5
        elif market_cap_val > 1e9:
            threat_score = 3
        else:
            threat_score = 2
    competition_details["新玩家进入威胁低"] = {"score": threat_score, "max": 9, "reason": f"基于{'市值' if has_mc_data else '行业常识'}推断"}
    competition_score += threat_score

    # 4. 风险管理评分 (20分) - 李录视角
    risk_score = 0
    risk_details = {}
    
    # 安全边际 (8分)
    margin_score = 3  # 中性
    if drawdown_from_high is not None:
        if drawdown_from_high < -50:
            margin_score = 8
        elif drawdown_from_high < -30:
            margin_score = 6
        elif drawdown_from_high < -10:
            margin_score = 4
        else:
            margin_score = 2
    elif pe and pe > 0:
        if pe < 15:
            margin_score = 6
        elif pe < 25:
            margin_score = 4
        elif pe < 40:
            margin_score = 3
        else:
            margin_score = 2
    else:
        # 无数据时，根据近期涨跌推断
        if chg_pct < -3:
            margin_score = 5  # 下跌可能意味着有一定安全边际
        elif chg_pct > 5:
            margin_score = 2  # 大涨可能意味着安全边际不足
    risk_details["安全边际"] = {"score": margin_score, "max": 8, "reason": f"基于{'回撤幅度或PE' if has_52w_data or has_pe_data else '近期涨跌'}推断"}
    risk_score += margin_score
    
    # 周期位置 (6分)
    cycle_score = 3  # 中性
    if chg_pct < -5:
        cycle_score = 5
    elif chg_pct < -2:
        cycle_score = 4
    elif chg_pct > 3:
        cycle_score = 1
    elif chg_pct > 0:
        cycle_score = 3
    risk_details["周期位置"] = {"score": cycle_score, "max": 6, "reason": "基于近期涨跌幅推断"}
    risk_score += cycle_score
    
    # 下行风险 (6分)
    downside_score = 3  # 中性
    if drawdown_from_high is not None and drawdown_from_high < -30:
        downside_score = 5
    elif chg_pct > 5:
        downside_score = 2
    elif chg_pct < -3:
        downside_score = 4
    risk_details["下行风险可控"] = {"score": downside_score, "max": 6, "reason": f"基于{'回撤幅度' if has_52w_data else '近期表现'}推断"}
    risk_score += downside_score

    # 总分
    total_score = business_score + financial_score + competition_score + risk_score

    # 评级
    if total_score >= 85:
        grade = "A+"
        recommendation = "极度优秀，可重仓"
    elif total_score >= 70:
        grade = "A"
        recommendation = "优秀，可配置"
    elif total_score >= 55:
        grade = "B"
        recommendation = "一般，小仓位或观望"
    elif total_score >= 40:
        grade = "C"
        recommendation = "较差，不建议"
    else:
        grade = "D"
        recommendation = "极差，远离"

    return {
        "total_score": total_score,
        "max_score": 100,
        "grade": grade,
        "recommendation": recommendation,
        "data_quality": data_quality,
        "dimensions": {
            "business": {"score": business_score, "max": 30, "weight": "30%", "details": business_details},
            "financial": {"score": financial_score, "max": 25, "weight": "25%", "details": financial_details},
            "competition": {"score": competition_score, "max": 25, "weight": "25%", "details": competition_details},
            "risk": {"score": risk_score, "max": 20, "weight": "20%", "details": risk_details},
        },
    }


def fetch_stock_data(market: str, symbol: str) -> dict:
    """获取单只股票数据。
    注：realtime_data 内部已实现多源补全，返回统一字段。
    """
    try:
        if market == "a":
            row = rt.get_a_stock_realtime(symbol)
            if row is None:
                return None
            # row 已是统一字段格式
            return {
                "name": row.get("name", symbol),
                "price": row.get("price", 0),
                "chg_pct": row.get("chg_pct", 0),
                "chg_amt": row.get("chg_amt", 0),
                "open": row.get("open", 0),
                "high": row.get("high", 0),
                "low": row.get("low", 0),
                "high_52w": row.get("high_52w", "-"),
                "low_52w": row.get("low_52w", "-"),
                "volume": row.get("volume", 0),
                "turnover": row.get("turnover", 0),
                "pe": row.get("pe", "-"),
                "market_cap": row.get("market_cap", "-"),
                "turnover_rate": row.get("turnover_rate", "-"),
                "datetime": row.get("datetime", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            }
        elif market == "hk":
            row = rt.get_hk_stock_realtime(symbol)
            if row is None:
                return None
            return {
                "name": row.get("name", symbol),
                "price": row.get("price", 0),
                "chg_pct": row.get("chg_pct", 0),
                "chg_amt": row.get("chg_amt", 0),
                "open": row.get("open", 0),
                "high": row.get("high", 0),
                "low": row.get("low", 0),
                "high_52w": row.get("high_52w", "-"),
                "low_52w": row.get("low_52w", "-"),
                "volume": row.get("volume", 0),
                "turnover": row.get("turnover", 0),
                "pe": row.get("pe", "-"),
                "market_cap": row.get("market_cap", "-"),
                "turnover_rate": row.get("turnover_rate", "-"),
                "datetime": row.get("datetime", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            }
        elif market == "us":
            # 优先用新浪美股接口（快），获取失败再用 AkShare
            rows = rt._sina_us_quote([symbol])
            if rows:
                result = rows[0]
                if "turnover" not in result:
                    result["turnover"] = result.get("volume", 0)
                # 对新浪结果也做一次补全
                result = rt._enrich_data("us", symbol.upper(), result)
                if "turnover" not in result:
                    result["turnover"] = result.get("volume", 0)
                if "high_52w" not in result:
                    result["high_52w"] = "-"
                if "low_52w" not in result:
                    result["low_52w"] = "-"
                if "pe" not in result:
                    result["pe"] = "-"
                if "market_cap" not in result:
                    result["market_cap"] = "-"
                if "turnover_rate" not in result:
                    result["turnover_rate"] = "-"
                return result
            
            row = rt.get_us_stock_realtime(symbol)
            if row is None:
                return None
            if "turnover" not in row:
                row["turnover"] = row.get("volume", 0)
            if "high_52w" not in row:
                row["high_52w"] = "-"
            if "low_52w" not in row:
                row["low_52w"] = "-"
            if "pe" not in row:
                row["pe"] = "-"
            if "market_cap" not in row:
                row["market_cap"] = "-"
            if "turnover_rate" not in row:
                row["turnover_rate"] = "-"
            return row
        else:
            return None
    except Exception:
        return None


@app.route("/api/score", methods=["POST"])
def score_stock():
    """单只股票评分接口。"""
    body = request.get_json() or {}
    market = (body.get("market", "a")).lower()
    symbol = (body.get("symbol", "")).strip()

    if not symbol:
        return jsonify({"error": "请输入股票代码"}), 400

    data = fetch_stock_data(market, symbol)
    if data is None:
        return jsonify({"error": f"未找到股票代码 {symbol}"}), 404

    scores = calculate_scores(market, symbol, data)

    # 生成策略建议
    strategy_recommendations = {}
    for dim_key, dim_data in scores.get("dimensions", {}).items():
        strategy_recommendations[dim_key] = sd.get_strategy_recommendation_for_score(
            dim_key, dim_data.get("score", 0), dim_data.get("max", 1)
        )

    return jsonify({
        "symbol": symbol.upper(),
        "market": market,
        "data": data,
        "scores": scores,
        "strategy_recommendations": strategy_recommendations,
    })


@app.route("/api/compare", methods=["POST"])
def compare_stocks():
    """多只股票对比接口。"""
    body = request.get_json() or {}
    stocks = body.get("stocks", [])
    # stocks: [{"market": "us", "symbol": "AAPL"}, ...]

    if not stocks or len(stocks) < 2:
        return jsonify({"error": "至少需要2只股票进行对比"}), 400

    results = []
    for s in stocks:
        market = s.get("market", "a").lower()
        symbol = s.get("symbol", "").strip()
        if not symbol:
            continue
        data = fetch_stock_data(market, symbol)
        if data is None:
            results.append({
                "symbol": symbol.upper(),
                "market": market,
                "error": f"未找到代码 {symbol}",
            })
            continue
        scores = calculate_scores(market, symbol, data)
        results.append({
            "symbol": symbol.upper(),
            "market": market,
            "data": data,
            "scores": scores,
        })

    return jsonify({
        "count": len(results),
        "results": results,
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/deep-report", methods=["POST"])
def deep_report():
    """生成个股深度研究报告。"""
    body = request.get_json() or {}
    market = (body.get("market", "a")).lower()
    symbol = (body.get("symbol", "")).strip()

    if not symbol:
        return jsonify({"error": "请输入股票代码"}), 400

    data = fetch_stock_data(market, symbol)
    if data is None:
        return jsonify({"error": f"未找到股票代码 {symbol}"}), 404

    scores = calculate_scores(market, symbol, data)
    analysis = generate_analysis(market, symbol, {"quotes": [data]})

    # 生成深度报告
    report = f"""# 📚 {data.get('name', symbol)} ({symbol.upper()}) 深度研究报告

> **报告类型**：价值投资深度研究
> **分析框架**：四大师视角评分体系
> **生成时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> **数据来源**：AkShare 新浪实时行情

---

## 一、总体评分：{scores['grade']} ({scores['total_score']}/100)

**投资建议**：{scores['recommendation']}

### 评分雷达图

| 维度 | 得分 | 满分 | 权重 | 评级 |
|------|------|------|------|------|
| 🏢 生意模式 | {scores['dimensions']['business']['score']} | 30 | 30% | {'★★★★★' if scores['dimensions']['business']['score'] >= 25 else '★★★★' if scores['dimensions']['business']['score'] >= 18 else '★★★' if scores['dimensions']['business']['score'] >= 12 else '★★'} |
| 💰 财务质量 | {scores['dimensions']['financial']['score']} | 25 | 25% | {'★★★★★' if scores['dimensions']['financial']['score'] >= 20 else '★★★★' if scores['dimensions']['financial']['score'] >= 15 else '★★★' if scores['dimensions']['financial']['score'] >= 10 else '★★'} |
| ⚔️ 竞争格局 | {scores['dimensions']['competition']['score']} | 25 | 25% | {'★★★★★' if scores['dimensions']['competition']['score'] >= 20 else '★★★★' if scores['dimensions']['competition']['score'] >= 15 else '★★★' if scores['dimensions']['competition']['score'] >= 10 else '★★'} |
| 🛡️ 风险管理 | {scores['dimensions']['risk']['score']} | 20 | 20% | {'★★★★★' if scores['dimensions']['risk']['score'] >= 16 else '★★★★' if scores['dimensions']['risk']['score'] >= 12 else '★★★' if scores['dimensions']['risk']['score'] >= 8 else '★★'} |
| **总分** | **{scores['total_score']}** | **100** | **100%** | **{scores['grade']}** |

---

## 二、实时行情数据

| 指标 | 数值 |
|------|------|
| 最新价 | ${float(data.get('price', 0)):.2f} |
| 涨跌幅 | {float(data.get('chg_pct', 0)):+.2f}% |
| 52周高/低 | {data.get('high_52w', 'N/A')} / {data.get('low_52w', 'N/A')} |
| PE | {data.get('pe', 'N/A')} |
| 市值 | {data.get('market_cap', 'N/A')} |
| 成交量 | {data.get('volume', 'N/A')} |

---

## 三、分维度详细评估

### 3.1 生意模式（段永平视角）：{scores['dimensions']['business']['score']}/30

"""
    # 添加生意模式详情
    for k, v in scores['dimensions']['business']['details'].items():
        report += f"- **{k}**: {v['score']}/{v['max']} — {v['reason']}\n"

    report += f"""
### 3.2 财务质量（巴菲特视角）：{scores['dimensions']['financial']['score']}/25

"""
    for k, v in scores['dimensions']['financial']['details'].items():
        report += f"- **{k}**: {v['score']}/{v['max']} — {v['reason']}\n"

    report += f"""
### 3.3 竞争格局（芒格视角）：{scores['dimensions']['competition']['score']}/25

"""
    for k, v in scores['dimensions']['competition']['details'].items():
        report += f"- **{k}**: {v['score']}/{v['max']} — {v['reason']}\n"

    report += f"""
### 3.4 风险管理（李录视角）：{scores['dimensions']['risk']['score']}/20

"""
    for k, v in scores['dimensions']['risk']['details'].items():
        report += f"- **{k}**: {v['score']}/{v['max']} — {v['reason']}\n"

    report += f"""
---

## 四、原始分析报告

{analysis}

---

## 五、大师视角总结

**段永平**（生意模式）：得分 {scores['dimensions']['business']['score']}/30
- {'生意模式优秀，值得深入研究' if scores['dimensions']['business']['score'] >= 20 else '生意模式一般，需谨慎' if scores['dimensions']['business']['score'] >= 12 else '生意模式较差，不建议投资'}

**巴菲特**（财务质量）：得分 {scores['dimensions']['financial']['score']}/25
- {'财务质量良好，数据可信' if scores['dimensions']['financial']['score'] >= 18 else '财务质量一般，需进一步审计' if scores['dimensions']['financial']['score'] >= 10 else '财务质量存疑，需警惕'}

**芒格**（竞争格局）：得分 {scores['dimensions']['competition']['score']}/25
- {'竞争地位稳固，护城河宽阔' if scores['dimensions']['competition']['score'] >= 18 else '竞争地位尚可，需关注变化' if scores['dimensions']['competition']['score'] >= 10 else '竞争地位堪忧，风险较高'}

**李录**（风险管理）：得分 {scores['dimensions']['risk']['score']}/20
- {'安全边际充足，下行风险可控' if scores['dimensions']['risk']['score'] >= 14 else '安全边际一般，需控制仓位' if scores['dimensions']['risk']['score'] >= 8 else '安全边际不足，风险较高'}

---

## 六、最终建议

**综合评级**：{scores['grade']} — {scores['recommendation']}

**操作建议**：
"""
    if scores['total_score'] >= 85:
        report += "- ✅ 可以作为核心持仓配置\n- ✅ 建议仓位：15%-20%\n- ✅ 可分批建仓\n"
    elif scores['total_score'] >= 70:
        report += "- ✅ 可以纳入观察池\n- ⚠️ 建议仓位：5%-10%\n- ⚠️ 等回调时建仓\n"
    elif scores['total_score'] >= 55:
        report += "- ⚠️ 暂时观望\n- ⚠️ 建议仓位：<5%\n- ❌ 等待更好的价格或基本面改善\n"
    else:
        report += "- ❌ 不建议投资\n- ❌ 建议回避\n- ❌ 等待基本面改善\n"

    # 生成策略建议
    strategy_recommendations = {}
    for dim_key, dim_data in scores.get("dimensions", {}).items():
        strategy_recommendations[dim_key] = sd.get_strategy_recommendation_for_score(
            dim_key, dim_data.get("score", 0), dim_data.get("max", 1)
        )

    # 在报告中添加策略建议
    report += """
---

## 七、策略提升建议

> 💡 以下建议基于您的评分结果，结合价值投资完整策略框架给出：

"""
    report += f"**🏢 生意模式（段永平）**：{strategy_recommendations.get('business', '无')}\n\n"
    report += f"**💰 财务质量（巴菲特）**：{strategy_recommendations.get('financial', '无')}\n\n"
    report += f"**⚔️ 竞争格局（芒格）**：{strategy_recommendations.get('competition', '无')}\n\n"
    report += f"**🛡️ 风险管理（李录）**：{strategy_recommendations.get('risk', '无')}\n\n"

    # 建仓策略
    price_val = float(data.get('price', 0) or 0)
    high_52w_val = data.get('high_52w', '-')
    low_52w_val = data.get('low_52w', '-')
    try:
        h52 = float(high_52w_val)
        l52 = float(low_52w_val)
        price_range = h52 - l52
    except:
        h52 = l52 = price_range = None

    report += """
---

## 八、建仓策略

> 📌 基于当前评分与价格位置，给出分批建仓的具体方案

"""
    if scores['total_score'] >= 85:
        report += "**评级：核心持仓型（A+/A）**\n\n"
        report += "| 批次 | 买入条件 | 建议仓位 | 说明 |\n"
        report += "|------|---------|---------|------|\n"
        report += "| 第一批 | 现价直接建仓 | 5%-8% | 评分优秀，安全边际充足，先建立底仓 |\n"
        if price_range and price_val > l52 + price_range * 0.3:
            report += f"| 第二批 | 回调至 ${l52 + price_range * 0.3:.2f} 附近（30%分位） | 5%-7% | 逢低加仓，摊薄成本 |\n"
        else:
            report += "| 第二批 | 回调5%-8%时 | 5%-7% | 逢低加仓，摊薄成本 |\n"
        report += "| 第三批 | 重大市场恐慌/黑天鹅事件 | 3%-5% | 极端情绪下满仓，需预留现金 |\n"
        report += "\n**总仓位建议**：15%-20%\n"
        report += "**持有周期**：3-5年以上\n"
    elif scores['total_score'] >= 70:
        report += "**评级：观察配置型（B+）**\n\n"
        report += "| 批次 | 买入条件 | 建议仓位 | 说明 |\n"
        report += "|------|---------|---------|------|\n"
        if price_range and price_val > l52 + price_range * 0.5:
            report += "| 第一批 | 等待回调至中位价以下 | 3%-5% | 当前价格偏中等，不追高 |\n"
            report += f"| 第二批 | 回调至 ${l52 + price_range * 0.3:.2f} 附近（30%分位） | 3%-5% | 更好的安全边际时加仓 |\n"
        else:
            report += "| 第一批 | 现价轻仓试探 | 3%-5% | 价格处于相对低位，可先试探 |\n"
            report += "| 第二批 | 回调10%或基本面确认改善 | 3%-5% | 确认趋势后加仓 |\n"
        report += "\n**总仓位建议**：5%-10%\n"
        report += "**持有周期**：2-3年\n"
    elif scores['total_score'] >= 55:
        report += "**评级：观望试探型（B/C）**\n\n"
        report += "| 批次 | 买入条件 | 建议仓位 | 说明 |\n"
        report += "|------|---------|---------|------|\n"
        if price_range:
            report += f"| 第一批 | 价格跌至 ${l52 + price_range * 0.2:.2f} 以下（20%分位） | 1%-2% | 极低价小仓位试探 |\n"
        else:
            report += "| 第一批 | 深度回调20%以上 | 1%-2% | 极低价小仓位试探 |\n"
        report += "| 第二批 | 基本面出现明显改善信号 | 1%-2% | 右侧确认后再加仓 |\n"
        report += "| 第三批 | 评分提升至B+以上 | 可加至5% | 基本面转好后再考虑 |\n"
        report += "\n**总仓位建议**：<5%（观察仓）\n"
        report += "**持有周期**：1-2年，随时准备止损\n"
    else:
        report += "**评级：回避型（D）**\n\n"
        report += "- ❌ 当前不建议任何建仓操作\n"
        report += "- ❌ 即使价格大跌也不建议抄底\n"
        report += "- ✅ 建议持续跟踪，等待评分回升至B以上再考虑\n"
        report += "\n**总仓位建议**：0%\n"
        report += "**替代方案**：寻找同行业中评分更高的标的\n"

    report += f"""

### 当前价格参考

| 指标 | 数值 |
|------|------|
| 当前价格 | ${price_val:.2f} |
"""
    if h52 and l52:
        report += f"| 52周最高 | ${h52:.2f} |\n"
        report += f"| 52周最低 | ${l52:.2f} |\n"
        if price_range > 0:
            pos = (price_val - l52) / price_range * 100
            report += f"| 价格分位 | {pos:.1f}%（0%=最低，100%=最高） |\n"
    else:
        report += "| 52周高低 | 暂无数据 |\n"

    report += """
### 建仓纪律

1. **分批原则**：绝不一次性满仓，至少分3批建仓
2. **止损纪律**：单只个股浮亏超过20%且基本面恶化，坚决止损
3. **仓位上限**：单只个股不超过总资产的20%
4. **情绪管理**：市场恐慌时敢于买入，市场狂热时敢于减仓
5. **定期复盘**：每季度重新评分，评分下降两级以上考虑减仓

---

> ⚠️ **免责声明**：本报告基于实时行情数据和公开信息自动生成，评分逻辑基于简化的量化推断，仅供学习参考，不构成投资建议。投资有风险，入市需谨慎。
> 
> 完整的价值投资分析需要深入研究公司财报、行业格局、管理层、竞争对手等多方面信息。
"""

    return jsonify({
        "symbol": symbol.upper(),
        "market": market,
        "data": data,
        "scores": scores,
        "report": report,
        "strategy_recommendations": strategy_recommendations,
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/fund/money/<code>", methods=["GET"])
def fund_money(code):
    """货币基金每万份收益与7日年化收益率.

    返回: { symbol, name, nav_per_10k, annualized_7d, date }
    """
    data = rt._fetch_money_fund(code)
    if data is None:
        return jsonify({"error": f"未获取到货币基金 {code} 数据"}), 404
    return jsonify(data)


@app.route("/api/fund/nav/<code>", methods=["GET"])
def fund_nav(code):
    """通用基金净值（LOF/ETF/场外基金）: 最新净值 + 前一日净值.

    返回: { symbol, name, nav, prev_nav, accumulated_nav, nav_date, daily_change_pct }
    """
    data = rt._fetch_fund_nav(code)
    if data is None:
        return jsonify({"error": f"未获取到基金 {code} 净值数据"}), 404
    return jsonify(data)


@app.route("/api/symbols", methods=["GET"])
def get_symbols():
    """获取快速查询的示例代码。"""
    examples = {
        "a": [
            {"code": "600519", "name": "贵州茅台"},
            {"code": "000858", "name": "五粮液"},
            {"code": "601318", "name": "中国平安"},
            {"code": "300750", "name": "宁德时代"},
        ],
        "hk": [
            {"code": "00700", "name": "腾讯控股"},
            {"code": "09988", "name": "阿里巴巴-W"},
            {"code": "01810", "name": "小米集团-W"},
            {"code": "02259", "name": "紫金黄金"},
        ],
        "us": [
            {"code": "AAPL", "name": "苹果"},
            {"code": "TSM", "name": "台积电"},
            {"code": "NVDA", "name": "英伟达"},
            {"code": "SNDK", "name": "闪迪"},
            {"code": "MU", "name": "美光"},
        ],
    }
    return jsonify(examples)


@app.route("/api/strategy", methods=["GET"])
def get_strategy():
    """获取价值投资策略框架摘要。"""
    return jsonify(sd.get_strategy_summary())


@app.route("/api/strategy/<section_id>", methods=["GET"])
def get_strategy_section(section_id):
    """获取指定策略章节内容。"""
    section = sd.get_strategy_section(section_id)
    if section is None:
        return jsonify({"error": f"未找到章节 {section_id}"}), 404
    return jsonify(section)


@app.route("/api/strategy/full", methods=["GET"])
def get_strategy_full():
    """获取完整策略框架内容。"""
    return jsonify({
        "title": sd.STRATEGY_FRAMEWORK["title"],
        "subtitle": sd.STRATEGY_FRAMEWORK["subtitle"],
        "content": sd.get_all_strategy_content(),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n{'=' * 60}")
    print(f"  投资分析网页服务启动")
    print(f"  访问地址: http://localhost:{port}")
    print(f"  启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 60}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
