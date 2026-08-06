#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时股票数据采集工具 v3
统一入口：AkShare (A股/港股/美股 — 新浪数据源) + yfinance (财务详情)
增强策略：主源获取后，检测缺失关键字段（PE/市值/52周高低等），
          自动从 东方财富、同花顺、腾讯、网易、富途、长桥 等备用源补全。
"""

import sys
import json
import os
import re
import time
import pickle
from datetime import datetime

import requests

CACHE_DIR = "d:/code/.rt_cache"
CACHE_TTL_SEC = 300  # 5 分钟


def _cache_path(key: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, f"{key}.pkl")


def _cache_get(key: str, ttl: int = CACHE_TTL_SEC):
    p = _cache_path(key)
    if not os.path.exists(p):
        return None
    age = time.time() - os.path.getmtime(p)
    if age > ttl:
        return None
    try:
        with open(p, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None


def _cache_put(key: str, obj):
    try:
        with open(_cache_path(key), "wb") as f:
            pickle.dump(obj, f)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# 通用：AkShare 新浪数据源（无需东财，连接稳定）
# ---------------------------------------------------------------------------
def _ak_a_spot_df():
    """AkShare 新浪 A 股全量快照（5分钟缓存）."""
    import akshare as ak
    cached = _cache_get("a_spot")
    if cached is not None:
        return cached
    df = ak.stock_zh_a_spot()
    _cache_put("a_spot", df)
    return df


def _ak_hk_spot_df():
    """AkShare 新浪 港股全量快照（5分钟缓存）."""
    import akshare as ak
    cached = _cache_get("hk_spot")
    if cached is not None:
        return cached
    df = ak.stock_hk_spot()
    _cache_put("hk_spot", df)
    return df


def _ak_us_spot_df():
    """AkShare 新浪 美股全量快照（10分钟缓存，量大拉取慢）."""
    import akshare as ak
    cached = _cache_get("us_spot", ttl=600)
    if cached is not None:
        return cached
    df = ak.stock_us_spot()
    _cache_put("us_spot", df)
    return df


def _sina_us_quote(symbols):
    """新浪美股直接接口（推荐：单次快，无需拉全量）.

    symbols: list[str] e.g. ['sndk','mu']
    返回: list[dict]
    """
    import requests
    url = f"https://hq.sinajs.cn/list={','.join('gb_' + s.lower() for s in symbols)}"
    headers = {"Referer": "https://finance.sina.com.cn"}
    r = requests.get(url, headers=headers, timeout=10)
    if r.status_code != 200:
        raise ConnectionError(f"http {r.status_code}")
    out = []
    for line in r.text.strip().split("\n"):
        # 新浪美股字段顺序（实测）：
        # [0]name [1]price [2]chg_pct [3]datetime [4]chg_amt [5]open [6]high [7]low
        # [8]52w_high [9]52w_low [10]volume [12]=市值(=price*shares) [13]turnover_rate
        # [14]pe [15]eps [19]shares [24]last_trade [25]prev_trade
        # [26]prev_close [30]=人民币计价市值(待换算) [33]post_market_cap
        if '="' not in line:
            continue
        body = line.split('="', 1)[1].rstrip('";')
        fields = body.split(",")
        if len(fields) < 32:
            continue
        out.append({
            "symbol":        line.split("gb_", 1)[1].split("=", 1)[0],
            "name":          fields[0],
            "price":         fields[1],
            "chg_pct":       fields[2],
            "datetime":      fields[3],
            "chg_amt":       fields[4],
            "open":          fields[5],
            "high":          fields[6],
            "low":           fields[7],
            "high_52w":      fields[8],
            "low_52w":       fields[9],
            "volume":        fields[10],     # 成交量(股)
            "market_cap":    fields[12],     # 市值(=price*shares)
            "turnover_rate": fields[13],
            "pe":            fields[14],
            "eps":           fields[15],
            "shares":        fields[19],     # 流通股数
            "prev_close":    fields[26],     # 昨收
        })
    return out


# ---------------------------------------------------------------------------
# A 股
# ---------------------------------------------------------------------------
def get_a_stock_realtime(symbol: str):
    """A股实时数据 — AkShare 新浪 + 多源补全."""
    import akshare as ak
    print(f"\n{'=' * 60}")
    print(f"A股实时数据: {symbol}  (AkShare 新浪)")
    print(f"{'=' * 60}")
    try:
        df = _ak_a_spot_df()
        row = df[df["代码"].str.contains(symbol, na=False)]
        if row.empty:
            print(f"  ⚠️ AkShare A股列表未找到代码 {symbol}，尝试东方财富直连...")
            # 对于基金代码（50xxxx/15xxxx/16xxxx/51xxxx/52xxxx等），AkShare股票列表不含基金
            # 直接调用东方财富接口获取实时行情
            em_data = _fetch_eastmoney("a", symbol)
            if em_data and em_data.get("price") not in (None, "", "-"):
                result = {
                    "name": em_data.get("name", symbol),
                    "code": em_data.get("code", symbol),
                    "price": em_data.get("price"),
                    "open": em_data.get("open", "-"),
                    "high": em_data.get("high", "-"),
                    "low": em_data.get("low", "-"),
                    "prev_close": em_data.get("prev_close", "-"),
                    "chg_amt": em_data.get("chg_amt", "-"),
                    "chg_pct": em_data.get("chg_pct", "-"),
                    "volume": em_data.get("volume", "-"),
                    "turnover": em_data.get("turnover", "-"),
                    "pe": em_data.get("pe", "-"),
                    "market_cap": em_data.get("market_cap", "-"),
                    "high_52w": "-",
                    "low_52w": "-",
                    "turnover_rate": em_data.get("turnover_rate", "-"),
                    "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                for label, val in result.items():
                    if label not in ("code",):
                        print(f"  {label:14s} {val}")
                result = _enrich_data("a", symbol, result)
                return result
            print(f"  ❌ 东方财富也未找到代码 {symbol}")
            return None
        row = row.iloc[0]
        data = row.to_dict()
        # 转换为统一字段
        result = {
            "name": data.get("名称"),
            "code": data.get("代码"),
            "price": data.get("最新价"),
            "open": data.get("今开"),
            "high": data.get("最高"),
            "low": data.get("最低"),
            "prev_close": data.get("昨收"),
            "chg_amt": data.get("涨跌额"),
            "chg_pct": data.get("涨跌幅"),
            "volume": data.get("成交量"),
            "turnover": data.get("成交额"),
            "pe": data.get("市盈率-动态") if "市盈率-动态" in data else "-",
            "market_cap": "-",
            "high_52w": "-",
            "low_52w": "-",
            "turnover_rate": "-",
            "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        # 打印
        for label, val in result.items():
            if label not in ("code",):
                print(f"  {label:14s} {val}")
        
        # 数据补全
        result = _enrich_data("a", symbol, result)
        return result
    except Exception as e:
        print(f"  ❌ AkShare A股失败: {e}")
        return None


# ---------------------------------------------------------------------------
# 港股
# ---------------------------------------------------------------------------
def get_hk_stock_realtime(symbol: str):
    """港股实时数据 — AkShare 新浪 + 多源补全.

    symbol 接受 5位纯数字（02259 / 06181）或带 .HK 后缀。
    """
    import akshare as ak
    code = symbol.replace(".HK", "").zfill(5)
    print(f"\n{'=' * 60}")
    print(f"港股实时数据: {code}.HK  (AkShare 新浪)")
    print(f"{'=' * 60}")
    try:
        df = _ak_hk_spot_df()
        row = df[df["代码"] == code]
        if row.empty:
            row = df[df["代码"].str.contains(code, na=False)]
        if row.empty:
            print(f"  ❌ 未找到代码 {code}")
            return None
        row = row.iloc[0]
        data = row.to_dict()
        result = {
            "name": data.get("中文名称") or data.get("英文名称"),
            "code": data.get("代码"),
            "price": data.get("最新价"),
            "open": data.get("今开"),
            "high": data.get("最高"),
            "low": data.get("最低"),
            "prev_close": data.get("昨收"),
            "chg_amt": data.get("涨跌额"),
            "chg_pct": data.get("涨跌幅"),
            "volume": data.get("成交量"),
            "turnover": data.get("成交额"),
            "pe": "-",
            "market_cap": "-",
            "high_52w": "-",
            "low_52w": "-",
            "turnover_rate": "-",
            "datetime": data.get("日期时间", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        }
        for label, val in result.items():
            if label not in ("code",):
                print(f"  {label:14s} {val}")
        
        result = _enrich_data("hk", code, result)
        return result
    except Exception as e:
        print(f"  ❌ AkShare 港股失败: {e}")
        return None


# ---------------------------------------------------------------------------
# 美股
# ---------------------------------------------------------------------------
def get_us_stock_realtime(symbol: str):
    """美股实时数据 — AkShare 新浪 + 多源补全.

    symbol 接受 ticker，例如 SNDK / MU / 000660.KS。
    """
    import akshare as ak
    symbol_u = symbol.upper()
    print(f"\n{'=' * 60}")
    print(f"美股实时数据: {symbol_u}  (AkShare 新浪)")
    print(f"{'=' * 60}")
    try:
        df = _ak_us_spot_df()
        row = df[df["symbol"].str.upper() == symbol_u]
        if row.empty:
            print(f"  ❌ 未找到 {symbol_u}")
            return None
        row = row.iloc[0]
        data = row.to_dict()
        result = {
            "name": data.get("cname") or data.get("name"),
            "code": data.get("symbol"),
            "price": data.get("price"),
            "open": data.get("open"),
            "high": data.get("high"),
            "low": data.get("low"),
            "prev_close": data.get("preclose"),
            "chg_amt": data.get("diff"),
            "chg_pct": data.get("chg"),
            "volume": data.get("volume") or data.get("amplitude"),
            "turnover": "-",
            "pe": data.get("pe"),
            "market_cap": "-",  # AkShare 美股 market 字段是分类，不是市值
            "high_52w": "-",
            "low_52w": "-",
            "turnover_rate": "-",
            "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        for label, val in result.items():
            if label not in ("code",):
                print(f"  {label:14s} {val}")
        
        result = _enrich_data("us", symbol_u, result)
        return result
    except Exception as e:
        print(f"  ❌ AkShare 美股失败: {e}")
        return None


# ---------------------------------------------------------------------------
# 备用数据源：东方财富 / 同花顺 / 腾讯 / 网易 / 富途 / 长桥
# ---------------------------------------------------------------------------

def _fetch_eastmoney(market: str, symbol: str) -> dict:
    """东方财富实时行情（备用源，数据最全）.
    
    接口: push2his.eastmoney.com / push2.eastmoney.com
    """
    result = {}
    try:
        if market == "a":
            secid = f"1.{symbol}" if symbol.startswith(("6", "5")) else f"0.{symbol}"
            url = f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f71,f116,f117,f162,f167,f170"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                d = r.json().get("data", {})
                if d:
                    price = d.get("f43")
                    if price and price != "-":
                        price = float(price) / 100 if float(price) > 100000 else float(price)
                    result.update({
                        "price": price,
                        "open": d.get("f46"),
                        "high": d.get("f44"),
                        "low": d.get("f45"),
                        "prev_close": d.get("f60"),
                        "chg_pct": d.get("f170"),
                        "volume": d.get("f47"),
                        "turnover": d.get("f48"),
                        "turnover_rate": d.get("f168") if "f168" in d else d.get("f71"),
                        "pe": d.get("f162"),
                        "market_cap": d.get("f116"),
                        "circulating_cap": d.get("f117"),
                        "pb": d.get("f167"),
                        "code": d.get("f57"),
                        "name": d.get("f58"),
                    })
                    if result.get("pe") and float(result["pe"]) > 0:
                        result["pe"] = float(result["pe"]) / 100 if float(result["pe"]) > 10000 else float(result["pe"])
                    if result.get("market_cap"):
                        result["market_cap"] = float(result["market_cap"])
        elif market == "hk":
            secid = f"116.{symbol}"
            url = f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f162,f167,f170"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                d = r.json().get("data", {})
                if d:
                    price = d.get("f43")
                    if price and price != "-":
                        price = float(price) / 100 if float(price) > 100000 else float(price)
                    result.update({
                        "price": price,
                        "open": d.get("f46"),
                        "high": d.get("f44"),
                        "low": d.get("f45"),
                        "chg_pct": d.get("f170"),
                        "volume": d.get("f47"),
                        "turnover": d.get("f48"),
                        "pe": d.get("f162"),
                        "market_cap": d.get("f116"),
                        "pb": d.get("f167"),
                        "code": d.get("f57"),
                        "name": d.get("f58"),
                    })
                    if result.get("pe") and float(result["pe"]) > 0:
                        result["pe"] = float(result["pe"]) / 100 if float(result["pe"]) > 10000 else float(result["pe"])
                    if result.get("market_cap"):
                        result["market_cap"] = float(result["market_cap"])
        elif market == "us":
            # 美股东方财富接口需要特殊的 secid 前缀
            url = f"https://push2.eastmoney.com/api/qt/stock/get?secid=105.{symbol.upper()}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f162,f167,f170"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                d = r.json().get("data", {})
                if d:
                    price = d.get("f43")
                    if price and price != "-":
                        price = float(price) / 100 if float(price) > 100000 else float(price)
                    result.update({
                        "price": price,
                        "open": d.get("f46"),
                        "high": d.get("f44"),
                        "low": d.get("f45"),
                        "chg_pct": d.get("f170"),
                        "volume": d.get("f47"),
                        "pe": d.get("f162"),
                        "market_cap": d.get("f116"),
                        "high_52w": d.get("f60"),
                        "code": d.get("f57"),
                        "name": d.get("f58"),
                    })
                    if result.get("pe") and float(result["pe"]) > 0:
                        result["pe"] = float(result["pe"]) / 100 if float(result["pe"]) > 10000 else float(result["pe"])
                    if result.get("market_cap"):
                        result["market_cap"] = float(result["market_cap"])
    except Exception:
        pass
    return result


def _fetch_tencent(market: str, symbol: str) -> dict:
    """腾讯股票接口（备用源）."""
    result = {}
    try:
        if market == "a":
            prefix = "sh" if symbol.startswith(("6", "5")) else "sz"
            url = f"https://qt.gtimg.cn/q={prefix}{symbol}"
            r = requests.get(url, timeout=8, headers={"Referer": "https://finance.qq.com"})
            if r.status_code == 200:
                body = r.text.split('="', 1)[1].rstrip('";')
                fields = body.split("~")
                if len(fields) > 40:
                    result.update({
                        "price": fields[3],
                        "code": fields[2],
                        "name": fields[1],
                        "price_change": fields[31],
                        "chg_pct": fields[32],
                        "volume": fields[36],
                        "turnover": fields[37],
                        "pe": fields[39] if len(fields) > 39 else "-",
                        "high_52w": fields[41] if len(fields) > 41 else "-",
                        "low_52w": fields[42] if len(fields) > 42 else "-",
                        "turnover_rate": fields[38] if len(fields) > 38 else "-",
                        "market_cap": fields[45] if len(fields) > 45 else "-",
                    })
        elif market == "hk":
            url = f"https://qt.gtimg.cn/q=hk{symbol}"
            r = requests.get(url, timeout=8, headers={"Referer": "https://finance.qq.com"})
            if r.status_code == 200:
                body = r.text.split('="', 1)[1].rstrip('";')
                fields = body.split("~")
                if len(fields) > 30:
                    result.update({
                        "price": fields[3],
                        "code": fields[2],
                        "name": fields[1],
                        "chg_pct": fields[32] if len(fields) > 32 else "-",
                        "volume": fields[6],
                        "pe": fields[39] if len(fields) > 39 else "-",
                        "high_52w": fields[41] if len(fields) > 41 else "-",
                        "low_52w": fields[42] if len(fields) > 42 else "-",
                    })
        elif market == "us":
            url = f"https://qt.gtimg.cn/q=us{symbol.lower()}"
            r = requests.get(url, timeout=8, headers={"Referer": "https://finance.qq.com"})
            if r.status_code == 200:
                body = r.text.split('="', 1)[1].rstrip('";')
                fields = body.split("~")
                if len(fields) > 30:
                    result.update({
                        "price": fields[1],
                        "code": fields[2],
                        "name": fields[0],
                        "chg_pct": fields[6] if len(fields) > 6 else "-",
                        "volume": fields[10] if len(fields) > 10 else "-",
                        "pe": fields[38] if len(fields) > 38 else "-",
                        "market_cap": fields[44] if len(fields) > 44 else "-",
                    })
    except Exception:
        pass
    return result


def _fetch_163(market: str, symbol: str) -> dict:
    """网易股票接口（备用源）."""
    result = {}
    try:
        if market == "a":
            prefix = "0" if symbol.startswith(("6", "5")) else "1"
            url = f"https://api.money.126.net/data/feed/{prefix}{symbol}"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                text = r.text
                data_str = text.split('(', 1)[1].split(')', 1)[0]
                data = json.loads(data_str)
                key = list(data.keys())[0]
                d = data[key]
                result.update({
                    "price": d.get("price"),
                    "name": d.get("name"),
                    "code": d.get("symbol"),
                    "open": d.get("open"),
                    "high": d.get("high"),
                    "low": d.get("low"),
                    "chg_pct": d.get("percent"),
                    "volume": d.get("volume"),
                    "turnover": d.get("turnover"),
                    "pe": d.get("PERatio"),
                    "market_cap": d.get("mktcap"),
                    "high_52w": d.get("high52week"),
                    "low_52w": d.get("low52week"),
                    "turnover_rate": d.get("turnoverRatio"),
                })
        elif market == "hk":
            url = f"https://api.money.126.net/data/feed/116{symbol}"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                text = r.text
                data_str = text.split('(', 1)[1].split(')', 1)[0]
                data = json.loads(data_str)
                key = list(data.keys())[0]
                d = data[key]
                result.update({
                    "price": d.get("price"),
                    "name": d.get("name"),
                    "code": d.get("symbol"),
                    "chg_pct": d.get("percent"),
                    "volume": d.get("volume"),
                    "pe": d.get("PERatio"),
                    "market_cap": d.get("mktcap"),
                })
    except Exception:
        pass
    return result


def _fetch_ths(market: str, symbol: str) -> dict:
    """同花顺接口（备用源，数据质量高）."""
    result = {}
    try:
        if market == "a":
            url = f"http://d.10jqka.com.cn/v2/line/hs_{symbol}/01/last.js"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://stockpage.10jqka.com.cn"})
            if r.status_code == 200:
                text = r.text
                if "(" in text:
                    data_str = text.split("(", 1)[1].rstrip(");")
                    data = json.loads(data_str)
                    d = data.get("data", {})
                    if d:
                        result.update({
                            "price": d.get("1") or d.get("price"),
                            "chg_pct": d.get("32") or d.get("percent"),
                            "volume": d.get("5") or d.get("volume"),
                            "turnover": d.get("6") or d.get("turnover"),
                            "pe": d.get("47") or d.get("pe"),
                            "market_cap": d.get("44") or d.get("mktcap"),
                        })
    except Exception:
        pass
    return result


def _fetch_from_futu_longport(market: str, symbol: str) -> dict:
    """从富途/长桥公开行情接口获取（备用源）.
    
    富途和长桥的实时行情接口通常基于东方财富数据二次封装。
    这里通过搜索东方财富更完整的接口作为富途/长桥数据的代理。
    """
    result = {}
    try:
        if market == "us":
            url = f"https://push2.eastmoney.com/api/qt/stock/get?secid=105.{symbol.upper()}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f117,f162,f167,f170"
            r = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code == 200:
                d = r.json().get("data", {})
                if d:
                    price = d.get("f43")
                    if price and price != "-":
                        price = float(price) / 100 if float(price) > 100000 else float(price)
                    result.update({
                        "price": price,
                        "pe": d.get("f162"),
                        "market_cap": d.get("f116"),
                        "high_52w": d.get("f60"),
                        "code": d.get("f57"),
                        "name": d.get("f58"),
                    })
    except Exception:
        pass
    return result


def _fetch_yfinance(market: str, symbol: str) -> dict:
    """yfinance 备用源 — 专门用于补全 PE、市值、52周高低等财务数据.
    
    注意：yfinance 调用较慢，仅作为最后备用源。
    """
    result = {}
    if market != "us":
        return result
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        if not info:
            return result
        
        # 提取关键字段
        mc = info.get("marketCap")
        if mc:
            result["market_cap"] = float(mc)
        
        pe = info.get("trailingPE") or info.get("forwardPE")
        if pe:
            result["pe"] = float(pe)
        
        h52 = info.get("fiftyTwoWeekHigh")
        if h52:
            result["high_52w"] = float(h52)
        
        l52 = info.get("fiftyTwoWeekLow")
        if l52:
            result["low_52w"] = float(l52)
        
        # 其他可用字段
        pb = info.get("priceToBook")
        if pb:
            result["pb"] = float(pb)
        
        turnover_rate = info.get("volume") and info.get("sharesOutstanding")
        if turnover_rate and info.get("sharesOutstanding"):
            result["turnover_rate"] = round((info.get("volume", 0) / info.get("sharesOutstanding", 1)) * 100, 2)
        
        if info.get("shortName") or info.get("longName"):
            result["name"] = info.get("shortName") or info.get("longName")
        
    except Exception:
        pass
    return result


# 备用源优先级列表
_BACKUP_SOURCES = [
    ("东方财富", _fetch_eastmoney),
    ("腾讯", _fetch_tencent),
    ("网易", _fetch_163),
    ("同花顺", _fetch_ths),
    ("富途/长桥", _fetch_from_futu_longport),
    ("yfinance", _fetch_yfinance),
]

# 需要补全的关键字段及其转换函数
_KEY_FIELDS = [
    "pe", "market_cap", "high_52w", "low_52w", "volume", "turnover",
    "turnover_rate", "pb", "open", "high", "low", "chg_pct"
]


def _enrich_data(market: str, symbol: str, primary_data: dict) -> dict:
    """主源数据补全：检测缺失关键字段，依次从备用源补全.
    
    Returns:
        dict: 补全后的完整数据字典
    """
    if not primary_data:
        return primary_data

    result = dict(primary_data)
    missing = []
    
    # 检查哪些关键字段缺失
    for field in _KEY_FIELDS:
        val = result.get(field)
        if val is None or val == "" or val == "-":
            missing.append(field)
        # 对于数值型字段，0 或 "0" 视为缺失（但字符串 "0.00" 不是缺失）
        elif field in ("pe", "market_cap", "high_52w", "low_52w", "pb") and val in (0, "0", 0.0, "0.0"):
            missing.append(field)
    
    if not missing:
        return result
    
    print(f"  🔍 检测到缺失字段: {missing}")
    print(f"  🔄 尝试从备用源补全...")
    
    for source_name, fetcher in _BACKUP_SOURCES:
        if not missing:
            break
        try:
            backup_data = fetcher(market, symbol)
            if not backup_data:
                continue
            
            filled = []
            for field in list(missing):
                bval = backup_data.get(field)
                if bval is not None and bval != "" and bval != "-" and bval != 0:
                    result[field] = bval
                    filled.append(field)
                    missing.remove(field)
            
            if filled:
                print(f"    ✅ [{source_name}] 补全: {filled}")
            if not missing:
                print(f"    🎉 所有缺失字段已补全!")
                break
        except Exception as e:
            print(f"    ❌ [{source_name}] 获取失败: {str(e)[:60]}")
            continue
    
    if missing:
        print(f"    ⚠️ 仍未补全: {missing} (将留空)")

    return result


# ---------------------------------------------------------------------------
# 货币基金：每万份收益 + 7日年化收益率（东方财富 pingzhongdata）
# ---------------------------------------------------------------------------
def _fetch_money_fund(code: str) -> dict:
    """货币基金：每万份收益 + 7日年化收益率.

    数据源: https://fund.eastmoney.com/pingzhongdata/{code}.js
        - Data_millionCopiesIncome: 历史每万份收益 [[ts, val], ...]
        - Data_sevenDaysYearIncome: 历史7日年化(%) [[ts, val], ...]
        - fS_name: 基金名称

    Returns:
        dict: { symbol, name, nav_per_10k, annualized_7d, date } 或 None
    """
    code = str(code).strip()
    if not re.match(r"^\d{6}$", code):
        return None

    cached = _cache_get(f"mf_{code}")
    if cached is not None:
        return cached

    try:
        url = f"https://fund.eastmoney.com/pingzhongdata/{code}.js"
        r = requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://fund.eastmoney.com/",
        })
        if r.status_code != 200:
            return None
        text = r.text

        name_m = re.search(r'var fS_name = "(.*?)";', text)
        inc_m = re.search(r"var Data_millionCopiesIncome = (\[\[.*?\]\]);", text, re.S)
        sev_m = re.search(r"var Data_sevenDaysYearIncome = (\[\[.*?\]\]);", text, re.S)

        name = name_m.group(1) if name_m else ""

        nav_per_10k = None
        annualized_7d = None
        date_str = ""

        if inc_m:
            try:
                arr = json.loads(inc_m.group(1))
                if arr:
                    ts, val = arr[-1]
                    nav_per_10k = val
                    date_str = datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
            except (ValueError, IndexError):
                nav_per_10k = None

        if sev_m:
            try:
                arr = json.loads(sev_m.group(1))
                if arr:
                    ts, val = arr[-1]
                    annualized_7d = val
                    if not date_str:
                        date_str = datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
            except (ValueError, IndexError):
                annualized_7d = None

        # 非货币基金页面不含这两个字段，直接返回 None
        if nav_per_10k is None and annualized_7d is None:
            return None

        result = {
            "symbol": code,
            "name": name,
            "nav_per_10k": nav_per_10k,
            "annualized_7d": annualized_7d,
            "date": date_str,
        }
        _cache_put(f"mf_{code}", result)
        return result
    except Exception as e:
        print(f"  ❌ 货币基金数据获取失败 {code}: {e}")
        return None


# ---------------------------------------------------------------------------
# 通用基金净值（LOF/ETF/场外基金）：最新净值 + 前一日净值（pingzhongdata）
# ---------------------------------------------------------------------------
def _fetch_fund_nav(code: str) -> dict:
    """通用基金净值：最新净值 + 前一日净值 + 累计净值.

    数据源: https://fund.eastmoney.com/pingzhongdata/{code}.js
        - Data_netWorthTrend: 历史单位净值 [{"x": ts, "y": nav, ...}, ...]
        - Data_ACWorthTrend: 历史累计净值 [[ts, accum_nav], ...]
        - fS_name: 基金名称

    Returns:
        dict: { symbol, name, nav, prev_nav, accumulated_nav, nav_date, daily_change_pct } 或 None
    """
    code = str(code).strip()
    if not re.match(r"^\d{6}$", code):
        return None

    cached = _cache_get(f"fn_{code}")
    if cached is not None:
        return cached

    try:
        url = f"https://fund.eastmoney.com/pingzhongdata/{code}.js"
        r = requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://fund.eastmoney.com/",
        })
        if r.status_code != 200:
            return None
        text = r.text

        name_m = re.search(r'var fS_name = "(.*?)";', text)
        # Data_netWorthTrend 格式: [{"x": ts, "y": nav, ...}, ...]
        nwt_m = re.search(r'var Data_netWorthTrend = (\[.*?\]);', text, re.S)
        # Data_ACWorthTrend 格式: [[ts, accum_nav], ...]
        acw_m = re.search(r"var Data_ACWorthTrend = (\[\[.*?\]\]);", text, re.S)

        name = name_m.group(1) if name_m else ""

        nav = None
        prev_nav = None
        nav_date = ""

        if nwt_m:
            try:
                arr = json.loads(nwt_m.group(1))
                if arr and len(arr) >= 1:
                    last = arr[-1]
                    nav = last.get("y")
                    ts = last.get("x", 0)
                    if ts:
                        nav_date = datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")
                if arr and len(arr) >= 2:
                    prev_nav = arr[-2].get("y")
            except (ValueError, IndexError, KeyError):
                pass

        accumulated_nav = None
        if acw_m:
            try:
                arr = json.loads(acw_m.group(1))
                if arr:
                    accumulated_nav = arr[-1][1]
            except (ValueError, IndexError):
                pass

        if nav is None:
            return None

        daily_change_pct = None
        if nav and prev_nav and prev_nav > 0:
            daily_change_pct = round((nav - prev_nav) / prev_nav * 100, 4)

        result = {
            "symbol": code,
            "name": name,
            "nav": nav,
            "prev_nav": prev_nav,
            "accumulated_nav": accumulated_nav,
            "nav_date": nav_date,
            "daily_change_pct": daily_change_pct,
        }
        _cache_put(f"fn_{code}", result)
        return result
    except Exception as e:
        print(f"  ❌ 基金净值获取失败 {code}: {e}")
        return None


# ---------------------------------------------------------------------------
# 美股快速查询（新浪美股直连，单次快，推荐）
# ---------------------------------------------------------------------------
def get_us_fast(symbols):
    """美股快速查询（新浪 hq.sinajs.cn，单次 < 1s）.

    symbols: 单个或多个 ticker 字符串/列表
    """
    if isinstance(symbols, str):
        symbols = [symbols]
    print(f"\n{'=' * 60}")
    print(f"美股快速查询: {', '.join(symbols)}  (新浪直连)")
    print(f"{'=' * 60}")
    try:
        rows = _sina_us_quote(symbols)
    except Exception as e:
        print(f"  ❌ 新浪美股接口失败: {e}")
        return None
    if not rows:
        print("  ❌ 无数据")
        return None
    for r in rows:
        def _num(v, default="-", fmt=None):
            if v in (None, "", "0", "0.00", "0.0000"):
                return default
            try:
                f = float(v)
                if fmt == "B":
                    return f"${f / 1e9:.2f}B"
                if fmt == "亿":
                    return f"{f / 1e8:.2f}亿"
                if fmt == "万":
                    return f"{f / 1e4:.2f}万"
                if fmt == "M":
                    return f"{f / 1e6:.2f}M"
                if f < 0:
                    return f"-{abs(f):.2f}"
                return f"{f:.2f}"
            except (ValueError, TypeError):
                return str(v)
        print(f"\n  ─ {r['name']} ({r['symbol'].upper()}) ─")
        print(f"  最新价:    ${_num(r['price'])}")
        print(f"  涨跌幅:    {r['chg_pct']}%")
        print(f"  涨跌额:    ${_num(r['chg_amt'])}")
        print(f"  昨收:      ${_num(r['prev_close'])}")
        print(f"  今开:      ${_num(r['open'])}")
        print(f"  最高:      ${_num(r['high'])}")
        print(f"  最低:      ${_num(r['low'])}")
        print(f"  52周高/低: ${_num(r['high_52w'])} / ${_num(r['low_52w'])}")
        print(f"  成交量:    {_num(r['volume'], fmt='M')}")
        print(f"  换手率:    {r['turnover_rate']}%")
        print(f"  PE:        {r['pe']}")
        print(f"  EPS:       {r['eps']}")
        print(f"  市值:      {_num(r['market_cap'], fmt='B')}")
        print(f"  数据时间:  {r['datetime']}")
    return rows


# ---------------------------------------------------------------------------
# yfinance 美股历史 + 财务（带重试）
# ---------------------------------------------------------------------------
def _yf_call(fn, *args, retries: int = 4, backoff: float = 6.0, **kwargs):
    """调用 yfinance，遇到 429 限流时指数退避重试。"""
    import yfinance as yf
    last_err = None
    for i in range(retries):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_err = e
            wait = backoff * (2 ** i)
            print(f"    [yfinance 重试 {i + 1}/{retries}] {str(e)[:80]} — 等待 {wait:.0f}s")
            time.sleep(wait)
    raise last_err


def get_us_history(symbol: str, period: str = "1mo"):
    """美股 K 线 — yfinance（带重试）."""
    print(f"\n{'=' * 60}")
    print(f"美股 K 线: {symbol}  period={period}  (yfinance)")
    print(f"{'=' * 60}")
    import yfinance as yf
    try:
        hist = _yf_call(lambda: yf.Ticker(symbol).history(period=period))
        if hist is None or hist.empty:
            print("  ❌ 无数据")
            return None
        print(f"  数据区间:   {hist.index[0].strftime('%Y-%m-%d')} ~ {hist.index[-1].strftime('%Y-%m-%d')}")
        print(f"  条数:       {len(hist)}")
        print(f"  期间最高:   ${hist['High'].max():.2f}")
        print(f"  期间最低:   ${hist['Low'].min():.2f}")
        print(f"  期间均价:   ${hist['Close'].mean():.2f}")
        print(f"  区间涨跌:   {((hist['Close'].iloc[-1] / hist['Close'].iloc[0]) - 1) * 100:.2f}%")
        print("\n  最近5日:")
        print(hist.tail(5)[["Open", "High", "Low", "Close", "Volume"]])
        return hist
    except Exception as e:
        print(f"  ❌ yfinance 历史数据获取失败: {e}")
        return None


def get_us_financials(symbol: str):
    """美股财务比率 — yfinance（带重试）."""
    print(f"\n{'=' * 60}")
    print(f"美股财务数据: {symbol}  (yfinance)")
    print(f"{'=' * 60}")
    import yfinance as yf
    try:
        info = _yf_call(lambda: yf.Ticker(symbol).info)

        def _pct(v):
            if v is None: return "N/A"
            try: return f"{float(v) * 100:.2f}%"
            except: return "N/A"

        def _b(v):
            if v is None: return "N/A"
            try: return f"${float(v) / 1e9:.2f}B"
            except: return "N/A"

        print("  === 估值 ===")
        print(f"  PE(TTM):    {info.get('trailingPE', 'N/A')}")
        print(f"  PE(Fwd):    {info.get('forwardPE', 'N/A')}")
        print(f"  PB:         {info.get('priceToBook', 'N/A')}")
        print(f"  PS(TTM):    {info.get('priceToSalesTrailing12Months', 'N/A')}")
        print(f"  EV/EBITDA:  {info.get('enterpriseToEbitda', 'N/A')}")

        print("\n  === 盈利 ===")
        print(f"  ROE:        {_pct(info.get('returnOnEquity'))}")
        print(f"  ROA:        {_pct(info.get('returnOnAssets'))}")
        print(f"  毛利率:     {_pct(info.get('grossMargins'))}")
        print(f"  EBITDA率:   {_pct(info.get('ebitdaMargins'))}")
        print(f"  净利率:     {_pct(info.get('profitMargins'))}")

        print("\n  === 增长 ===")
        print(f"  营收增长:   {_pct(info.get('revenueGrowth'))}")
        print(f"  利润增长:   {_pct(info.get('earningsGrowth'))}")

        print("\n  === 财务健康 ===")
        print(f"  总现金:     {_b(info.get('totalCash'))}")
        print(f"  总债务:     {_b(info.get('totalDebt'))}")
        print(f"  净现金:     {_b((info.get('totalCash') or 0) - (info.get('totalDebt') or 0))}")
        print(f"  D/E:        {info.get('debtToEquity', 'N/A')}")
        print(f"  流动比率:   {info.get('currentRatio', 'N/A')}")

        print("\n  === 分红 ===")
        print(f"  股息率:     {_pct(info.get('dividendYield'))}")
        print(f"  派息率:     {_pct(info.get('payoutRatio'))}")

        return info
    except Exception as e:
        print(f"  ❌ yfinance 财务数据失败: {e}")
        return None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
USAGE = """
用法:
  python realtime_data.py a      <6位代码>          # A股实时 (AkShare 新浪)
  python realtime_data.py hk     <5位代码|.HK>     # 港股实时 (AkShare 新浪)
  python realtime_data.py us     <TICKER>          # 美股实时 (AkShare 新浪全量)
  python realtime_data.py us-q   <TICKER> [T2 T3]  # 美股快速查询 (新浪直连,推荐)
  python realtime_data.py us-h   <TICKER> [period] # 美股K线 (yfinance)
  python realtime_data.py us-f   <TICKER>          # 美股财务 (yfinance)
"""


def main():
    print(f"\n当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if len(sys.argv) < 3:
        print(USAGE)
        sys.exit(0)
    mode, symbol = sys.argv[1], sys.argv[2]
    if mode == "a":
        get_a_stock_realtime(symbol)
    elif mode == "hk":
        get_hk_stock_realtime(symbol)
    elif mode == "us":
        get_us_stock_realtime(symbol)
    elif mode == "us-q":
        get_us_fast(sys.argv[2:])
    elif mode == "us-h":
        period = sys.argv[3] if len(sys.argv) > 3 else "1mo"
        get_us_history(symbol, period)
    elif mode == "us-f":
        get_us_financials(symbol)
    else:
        print(USAGE)


if __name__ == "__main__":
    main()
