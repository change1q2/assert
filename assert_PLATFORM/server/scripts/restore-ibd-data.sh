#!/bin/bash
# InnoDB .ibd 深度恢复脚本
# 用于从被删除但未覆盖的 InnoDB 表空间中提取数据
# 在服务器上运行: bash /opt/restore-ibd-data.sh

set +e

echo "========================================"
echo "  InnoDB 数据深度恢复"
echo "========================================"

CONTAINER_ID=$(docker ps | grep -i mysql | awk '{print $1}' | head -1)
[ -z "$CONTAINER_ID" ] && echo "❌ No MySQL container" && exit 1

MYSQL_ROOT_PASSWORD=$(docker exec "$CONTAINER_ID" env | grep -i "MYSQL_ROOT_PASSWORD" | cut -d= -f2)
[ -z "$MYSQL_ROOT_PASSWORD" ] && MYSQL_ROOT_PASSWORD="123456"
MYSQL="docker exec $CONTAINER_ID mysql -u root -p$MYSQL_ROOT_PASSWORD"

RECOVER_DIR="/tmp/ibd_recovery_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RECOVER_DIR"

# ========== 方法 1: 使用 strings 提取可读数据 ==========
echo ""
echo "=== 方法 1: 从 .ibd 文件提取可读字符串 ==="

for TABLE in records accounts finance_assets debts; do
  IBD_FILE="/var/lib/mysql/asset_platform/${TABLE}.ibd"
  if docker exec "$CONTAINER_ID" test -f "$IBD_FILE"; then
    echo ""
    echo "--- $TABLE.ibd ---"
    SIZE=$(docker exec "$CONTAINER_ID" stat -c%s "$IBD_FILE" 2>/dev/null)
    echo "文件大小: $SIZE bytes ($(echo "scale=2; $SIZE/1024/1024" | bc 2>/dev/null || echo "N/A") MB)"
    
    # 提取可读字符串（至少4个字符连续）
    docker exec "$CONTAINER_ID" strings -n 4 "$IBD_FILE" > "$RECOVER_DIR/${TABLE}_strings.txt" 2>/dev/null
    STR_COUNT=$(wc -l < "$RECOVER_DIR/${TABLE}_strings.txt" 2>/dev/null)
    echo "提取到 $STR_COUNT 个字符串"
    
    # 显示前100个
    echo "前100个字符串:"
    head -100 "$RECOVER_DIR/${TABLE}_strings.txt"
    
    # 尝试识别 JSON 数据 (独立资产等可能存为 JSON)
    echo ""
    echo "--- 查找 JSON 数据 ---"
    grep -o '\[{.*}\]' "$RECOVER_DIR/${TABLE}_strings.txt" | head -5
    grep -o '"[a-zA-Z_]*":' "$RECOVER_DIR/${TABLE}_strings.txt" | sort | uniq -c | sort -rn | head -10
  fi
done

# ========== 方法 2: 创建临时 MySQL 实例 + innodb_force_recovery ==========
echo ""
echo "=== 方法 2: InnoDB 强制恢复 ==="

# 尝试创建恢复实例
RESTORE_DIR="/tmp/mysql_restore_$(date +%s)"
mkdir -p "$RESTORE_DIR"

# 复制必要的 .ibd 文件
echo "复制 .ibd 文件..."
docker cp "$CONTAINER_ID":/var/lib/mysql/asset_platform/records.ibd "$RESTORE_DIR/" 2>/dev/null
docker cp "$CONTAINER_ID":/var/lib/mysql/asset_platform/accounts.ibd "$RESTORE_DIR/" 2>/dev/null
docker cp "$CONTAINER_ID":/var/lib/mysql/asset_platform/finance_assets.ibd "$RESTORE_DIR/" 2>/dev/null
docker cp "$CONTAINER_ID":/var/lib/mysql/asset_platform/debts.ibd "$RESTORE_DIR/" 2>/dev/null

# 检查表结构（从当前数据库获取）
echo ""
echo "获取表结构..."
$MYSQL asset_platform -e "SHOW CREATE TABLE records\G" 2>/dev/null > "$RECOVER_DIR/records_schema.txt"
$MYSQL asset_platform -e "SHOW CREATE TABLE accounts\G" 2>/dev/null > "$RECOVER_DIR/accounts_schema.txt"
$MYSQL asset_platform -e "SHOW CREATE TABLE finance_assets\G" 2>/dev/null > "$RECOVER_DIR/finance_assets_schema.txt"
$MYSQL asset_platform -e "SHOW CREATE TABLE debts\G" 2>/dev/null > "$RECOVER_DIR/debts_schema.txt"

# ========== 方法 3: 分析现有 records 数据的模式 ==========
echo ""
echo "=== 方法 3: 分析现有数据模式 ==="

echo ""
echo "--- 现有 records 样本 ---"
$MYSQL asset_platform -e "SELECT * FROM records LIMIT 5;" 2>/dev/null

echo ""
echo "--- 现有 accounts 样本 ---"
$MYSQL asset_platform -e "SELECT id, name, currency, type, balance FROM accounts LIMIT 5;" 2>/dev/null

# ========== 方法 4: 检查 binlog 索引 ==========
echo ""
echo "=== 方法 4: Binlog 分析 ==="

echo "Binlog 文件列表:"
docker exec "$CONTAINER_ID" cat /var/lib/mysql/binlog.index 2>/dev/null

# 使用 mysqlbinlog 分析 binlog（写文件方式，避免输出限制）
echo ""
echo "--- 解码最近的 binlog ---"
docker exec "$CONTAINER_ID" bash -c '
  for BF in /var/lib/mysql/binlog.000010; do
    BASENAME=$(basename "$BF")
    echo "解码 $BF ..."
    mysqlbinlog --verbose --verbose --base64-output=DECODE-ROWS "$BF" > /tmp/binlog_decoded_latest.txt 2>/dev/null
    echo "解码完成: $(stat -c%s /tmp/binlog_decoded_latest.txt 2>/dev/null) bytes"
    
    if [ -s /tmp/binlog_decoded_latest.txt ]; then
      echo ""
      echo "--- 统计 ---"
      echo "DELETE: $(grep -c 'DELETE FROM' /tmp/binlog_decoded_latest.txt 2>/dev/null)"
      echo "INSERT: $(grep -c 'INSERT INTO' /tmp/binlog_decoded_latest.txt 2>/dev/null)"  
      echo "UPDATE: $(grep -c 'UPDATE ' /tmp/binlog_decoded_latest.txt 2>/dev/null)"
      echo "records: $(grep -c 'records' /tmp/binlog_decoded_latest.txt 2>/dev/null)"
      echo "accounts: $(grep -c 'accounts' /tmp/binlog_decoded_latest.txt 2>/dev/null)"
      
      # 显示前100行
      echo ""
      echo "--- 前100行 ---"
      head -100 /tmp/binlog_decoded_latest.txt
    fi
  done
'

# ========== 方法 5: 从容器内直接查询 InnoDB 内部状态 ==========
echo ""
echo "=== 方法 5: InnoDB 状态检查 ==="

$MYSQL -e "SHOW ENGINE INNODB STATUS\G" 2>/dev/null | grep -A5 "record\|delete\|insert" | head -30

# ========== 方法 6: 使用 INFORMATION_SCHEMA ==========
echo ""
echo "=== 方法 6: 表空间分析 ==="

$MYSQL -e "
  SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    DATA_FREE,
    DATA_LENGTH + DATA_FREE as total_space,
    ENGINE
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = 'asset_platform'
  ORDER BY DATA_LENGTH DESC
  LIMIT 10;
" 2>/dev/null

# ========== 生成恢复 SQL 模板 ==========
echo ""
echo "=== 生成恢复 SQL ==="

cat > "$RECOVER_DIR/recovery_template.sql" << 'SQLEOF'
-- 数据恢复模板
-- 根据 .ibd 文件中的残留数据手动恢复

-- 1. 恢复 records (收支记录)
-- INSERT INTO asset_platform.records 
-- (user_id, id, type, category, subcategory, amount, currency, account_id, record_date, note)
-- VALUES 
-- (user_id, 'id', 'type', 'category', 'subcategory', amount, 'currency', 'account_id', 'date', 'note');

-- 2. 恢复 accounts (账户)  
-- INSERT INTO asset_platform.accounts
-- (user_id, id, name, currency, type, balance, liability)
-- VALUES
-- (user_id, 'id', 'name', 'currency', 'type', balance, liability);

-- 3. 恢复 finance_assets (理财资产)
-- INSERT INTO asset_platform.finance_assets
-- (user_id, id, name, type, market, cost, shares, price, value)
-- VALUES
-- (user_id, 'id', 'name', 'type', 'market', cost, shares, price, value);
SQLEOF

echo "恢复模板已生成: $RECOVER_DIR/recovery_template.sql"

# ========== 总结 ==========
echo ""
echo "========================================"
echo "  总结"
echo "========================================"
echo ""
echo "恢复文件目录: $RECOVER_DIR/"
echo ""
echo "可用文件:"
ls -la "$RECOVER_DIR/" 2>/dev/null
echo ""
echo "下一步:"
echo "  1. 检查 $RECOVER_DIR/records_strings.txt 中的可读数据"
echo "  2. 从 binlog 解码文件中查找 INSERT 语句"
echo "  3. 使用恢复模板手动重建数据"
echo ""
echo "高级恢复选项:"
echo "  - innodb_force_recovery: 重启 MySQL 并设置 innodb_force_recovery=1"
echo "  - percona-xtrabackup: 使用物理备份恢复"
echo "  - undrop-for-innodb: 专业 InnoDB 恢复工具"
echo "========================================"
