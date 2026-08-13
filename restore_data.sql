-- 恢复 user_id=1 的理财资产数据
DELETE FROM finance_assets WHERE user_id = 1;

-- 显式指定列名，补充 quantity 和 status/archive_date
INSERT INTO finance_assets (
  user_id, id, kind, asset_kind, account_id, category, subcategory,
  tertiary_category, market, currency, name, code, position_group,
  position_category, cost_price, shares, quantity, available_shares,
  current_price, pnl, pnl_percent, avg_buy_price, holding_days,
  position_weight, total_fees, today_pnl, today_pnl_percent, prev_price,
  price_date, sort_order, sync_version, deleted_at, origin_device_id,
  client_op_id, tags, status, archive_date
)
SELECT
  user_id, id, kind, asset_kind, account_id, category, subcategory,
  tertiary_category, market, currency, name, code, position_group,
  position_category, cost_price, shares, shares AS quantity, available_shares,
  current_price, pnl, pnl_percent, avg_buy_price, holding_days,
  position_weight, total_fees, today_pnl, today_pnl_percent, prev_price,
  price_date, sort_order, sync_version, deleted_at, origin_device_id,
  client_op_id, tags, 'active' AS status, NULL AS archive_date
FROM asset_platform_restore.finance_assets
WHERE user_id = 1;

SELECT COUNT(*) AS restored_count FROM finance_assets WHERE user_id = 1;
