#!/bin/bash
PORT=$(grep API_PORT /opt/asset-platform/assert_PLATFORM/server/.env 2>/dev/null | cut -d= -f2 || echo 3000)
echo "Port: $PORT"
curl -s http://127.0.0.1:$PORT/api/finance/quotes -X POST -H 'Content-Type: application/json' -d '{"codes":[{"code":"02259","market":"港股市场"},{"code":"09606","market":"港股市场"}]}'