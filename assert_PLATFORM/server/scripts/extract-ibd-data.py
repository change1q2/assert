#!/usr/bin/env python3
"""
InnoDB .ibd 数据恢复工具
从被删除的 InnoDB 表空间中提取可读数据
"""
import subprocess
import sys
import os
import re
import json
from datetime import datetime

def run_cmd(cmd, timeout=30):
    """执行命令并返回输出"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return f"TIMEOUT: {cmd}"
    except Exception as e:
        return f"ERROR: {e}"

def get_mysql_conn():
    """获取 MySQL 连接信息"""
    result = run_cmd("docker ps | grep -i mysql | awk '{print $1}' | head -1")
    container_id = result.strip().split('\n')[-1].strip()
    if not container_id:
        print("❌ 未找到 MySQL 容器")
        sys.exit(1)
    
    pwd_result = run_cmd(f"docker exec {container_id} env | grep -i MYSQL_ROOT_PASSWORD | cut -d= -f2")
    password = pwd_result.strip().split('\n')[-1].strip() or "123456"
    
    return container_id, password

def extract_strings_from_ibd(container_id, table_name, min_length=4):
    """从 .ibd 文件提取可读字符串"""
    ibd_path = f"/var/lib/mysql/asset_platform/{table_name}.ibd"
    
    # 使用 strings 提取
    cmd = f"docker exec {container_id} strings -n {min_length} {ibd_path}"
    result = run_cmd(cmd, timeout=60)
    
    strings = [line.strip() for line in result.split('\n') if line.strip()]
    return strings

def classify_strings(strings, table_name):
    """根据表名对字符串进行分类"""
    classified = {
        'sql_like': [],
        'json_like': [],
        'numeric': [],
        'text': [],
        'dates': [],
        'emails': [],
        'ids': []
    }
    
    patterns = {
        'sql_like': [r'^(INSERT|SELECT|UPDATE|DELETE|CREATE)\s', r'^(INTO|FROM|WHERE|VALUES)\s'],
        'json_like': [r'^[{[].*[}\]]$', r'^\s*"[^"]+"\s*:'],
        'dates': [r'\d{4}-\d{2}-\d{2}', r'\d{2}/\d{2}/\d{4}'],
        'emails': [r'@.*\.'],
        'ids': [r'^[a-f0-9]{8,}$', r'^[a-zA-Z0-9_-]{16,}$']
    }
    
    for s in strings:
        matched = False
        for category, pats in patterns.items():
            for pat in pats:
                if re.search(pat, s, re.IGNORECASE):
                    classified[category].append(s)
                    matched = True
                    break
            if matched:
                break
        if not matched and len(s) > 3:
            if re.match(r'^[\d,.]+$', s):
                classified['numeric'].append(s)
            else:
                classified['text'].append(s)
    
    return classified

def extract_record_data(strings):
    """尝试从 strings 中重建 records 表的数据"""
    records = []
    
    # 查找金额模式 (可能是收支记录的金额)
    amounts = []
    for s in strings:
        # 金额模式: 数字或带小数点的数字
        if re.match(r'^-?\d+(\.\d{1,2})?$', s):
            amounts.append(float(s))
    
    # 查找日期
    dates = []
    for s in strings:
        if re.match(r'\d{4}-\d{2}-\d{2}', s):
            dates.append(s)
    
    # 查找类别关键词
    categories = ['餐饮', '交通', '购物', '工资', '奖金', '投资', '转账', '租金', '水电', '通讯', '医疗', '教育', '娱乐', '旅行', '其他', '收入', '支出', '股票', '基金', '债券', '现金', '银行', '支付宝', '微信']
    found_categories = []
    for s in strings:
        for cat in categories:
            if cat in s:
                found_categories.append((cat, s))
                break
    
    # 查找账户名
    account_patterns = []
    for s in strings:
        if len(s) > 20:  # 可能是账户名
            account_patterns.append(s)
    
    return {
        'amounts': amounts[:50],
        'dates': dates[:50],
        'categories': found_categories[:30],
        'account_strings': account_patterns[:30]
    }

def extract_account_data(strings):
    """尝试重建 accounts 表的数据"""
    accounts = {
        'names': [],
        'currencies': [],
        'types': [],
        'balances': []
    }
    
    currency_patterns = ['CNY', 'USD', 'HKD', 'EUR', 'JPY', 'GBP']
    account_types = ['现金账户', '投资账户', '负债账户', '外币账户', '基金平台', '券商', '银行']
    
    for s in strings:
        if s in currency_patterns:
            accounts['currencies'].append(s)
        for t in account_types:
            if t in s:
                accounts['types'].append((t, s))
                break
        if len(s) > 3 and len(s) < 30 and not re.match(r'^[\d,.]+$', s):
            if not s.startswith('INSERT') and not s.startswith('SELECT'):
                accounts['names'].append(s)
    
    # 查找余额 (大数)
    for s in strings:
        if re.match(r'^\d{3,}(\.\d{1,2})?$', s):
            val = float(s)
            if val > 100:  # 可能是余额
                accounts['balances'].append(val)
    
    return accounts

def extract_finance_data(strings):
    """尝试重建 finance_assets 表的数据"""
    finance = {
        'names': [],
        'codes': [],
        'prices': [],
        'quantities': []
    }
    
    # 股票/基金代码模式: 6位数字
    for s in strings:
        if re.match(r'^\d{6}$', s):
            finance['codes'].append(s)
        elif re.match(r'^[A-Z]{1,5}\d{4,6}$', s):  # 如 AAPL, TSLA
            finance['codes'].append(s)
    
    # 价格 (小数)
    for s in strings:
        if re.match(r'^\d+\.\d{2,4}$', s):
            val = float(s)
            if 0.01 < val < 100000:  # 合理的价格范围
                finance['prices'].append(val)
    
    return finance

def generate_recovery_sql(container_id, password, extracted_data):
    """生成恢复 SQL 脚本"""
    sql = []
    sql.append("-- ========================================")
    sql.append("-- 从 InnoDB .ibd 提取的数据恢复 SQL")
    sql.append(f"-- 生成时间: {datetime.now()}")
    sql.append("-- ========================================")
    sql.append("")
    
    # Records
    if extracted_data.get('records'):
        rec = extracted_data['records']
        sql.append("-- === 收支记录 (RECORDS) ===")
        sql.append("-- 注意: 以下数据是从 .ibd 文件的字符串中提取的，需要人工审核")
        sql.append("-- 字段: user_id, id, type, category, subcategory, amount, currency, account_id, record_date, note")
        sql.append("")
        
        if rec.get('amounts'):
            sql.append("-- 提取到的金额:")
            for i, amount in enumerate(rec['amounts'][:20]):
                sql.append(f"--   {i+1}. {amount}")
        
        if rec.get('dates'):
            sql.append("-- 提取到的日期:")
            for i, date in enumerate(rec['dates'][:20]):
                sql.append(f"--   {i+1}. {date}")
        
        if rec.get('categories'):
            sql.append("-- 提取到的类别:")
            for i, (cat, context) in enumerate(rec['categories'][:15]):
                sql.append(f"--   {i+1}. {cat} (上下文: {context[:30]})")
    
    # Accounts
    if extracted_data.get('accounts'):
        acc = extracted_data['accounts']
        sql.append("")
        sql.append("-- === 账户 (ACCOUNTS) ===")
        if acc.get('names'):
            sql.append("-- 提取到的账户名:")
            for i, name in enumerate(acc['names'][:20]):
                sql.append(f"--   {i+1}. {name}")
        if acc.get('balances'):
            sql.append("-- 提取到的余额:")
            for i, bal in enumerate(acc['balances'][:15]):
                sql.append(f"--   {i+1}. {bal:,.2f}")
    
    # Finance Assets
    if extracted_data.get('finance'):
        fin = extracted_data['finance']
        sql.append("")
        sql.append("-- === 理财资产 (FINANCE_ASSETS) ===")
        if fin.get('codes'):
            sql.append("-- 提取到的代码:")
            for i, code in enumerate(fin['codes'][:20]):
                sql.append(f"--   {i+1}. {code}")
        if fin.get('prices'):
            sql.append("-- 提取到的价格:")
            for i, price in enumerate(fin['prices'][:15]):
                sql.append(f"--   {i+1}. {price:.2f}")
    
    sql.append("")
    sql.append("-- ========================================")
    sql.append("-- 使用说明:")
    sql.append("-- 1. 检查上面提取的数据")
    sql.append("-- 2. 根据数据模式手动构建 INSERT 语句")
    sql.append("-- 3. 使用 INSERT IGNORE INTO 避免主键冲突")
    sql.append("-- 4. 先在测试环境验证，再导入生产")
    sql.append("-- ========================================")
    
    return '\n'.join(sql)

def main():
    print("=" * 50)
    print("  InnoDB .ibd 数据恢复工具")
    print("=" * 50)
    
    container_id, password = get_mysql_conn()
    print(f"MySQL 容器: {container_id}")
    
    extracted_data = {}
    
    # 分析各个表
    tables = ['records', 'accounts', 'finance_assets', 'debts']
    
    for table in tables:
        print(f"\n{'='*50}")
        print(f"分析 {table}.ibd ...")
        
        # 提取字符串
        strings = extract_strings_from_ibd(container_id, table)
        print(f"  提取到 {len(strings)} 个字符串")
        
        if len(strings) == 0:
            print(f"  ⚠ 无数据或提取失败")
            continue
        
        # 分类
        classified = classify_strings(strings, table)
        print(f"  SQL语句: {len(classified['sql_like'])}")
        print(f"  JSON数据: {len(classified['json_like'])}")
        print(f"  日期: {len(classified['dates'])}")
        print(f"  文本: {len(classified['text'])}")
        print(f"  数字: {len(classified['numeric'])}")
        
        # 显示前20个有意义的字符串
        print(f"\n  --- 前20个字符串 ---")
        for s in strings[:20]:
            if len(s) > 2:
                print(f"    {s[:80]}")
        
        # 表特定提取
        if table == 'records':
            extracted_data['records'] = extract_record_data(strings)
            rec = extracted_data['records']
            if rec.get('amounts'):
                print(f"\n  💰 发现 {len(rec['amounts'])} 个金额值")
                print(f"     范围: {min(rec['amounts']):.2f} - {max(rec['amounts']):.2f}")
            if rec.get('dates'):
                print(f"  📅 发现 {len(rec['dates'])} 个日期")
            if rec.get('categories'):
                print(f"  🏷️  发现 {len(rec['categories'])} 个类别关键词")
        
        elif table == 'accounts':
            extracted_data['accounts'] = extract_account_data(strings)
            acc = extracted_data['accounts']
            if acc.get('balances'):
                print(f"\n  💳 发现 {len(acc['balances'])} 个余额值")
            if acc.get('names'):
                print(f"  📝 发现 {len(acc['names'])} 个名称字符串")
        
        elif table == 'finance_assets':
            extracted_data['finance'] = extract_finance_data(strings)
            fin = extracted_data['finance']
            if fin.get('codes'):
                print(f"\n  📈 发现 {len(fin['codes'])} 个代码")
            if fin.get('prices'):
                print(f"  💰 发现 {len(fin['prices'])} 个价格")
    
    # 生成恢复 SQL
    print(f"\n{'='*50}")
    print("生成恢复 SQL ...")
    recovery_sql = generate_recovery_sql(container_id, password, extracted_data)
    
    output_file = f"/tmp/ibd_recovery_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    with open(output_file, 'w') as f:
        f.write(recovery_sql)
    
    print(f"\n✅ 恢复脚本已生成: {output_file}")
    print(f"\n提示: 检查提取的数据后，手动构建 INSERT 语句进行恢复")

if __name__ == '__main__':
    main()
