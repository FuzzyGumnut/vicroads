#!/bin/bash
FILENAME="db-dump-$(date +%Y%m%d-%H%M).json"
echo "📦 Dumping to $FILENAME..."

sqlite3 db.sqlite ".headers on" ".mode json" "
  SELECT 'users' as table_name, * FROM users
  UNION ALL
  SELECT 'keys' as table_name, * FROM keys  
  UNION ALL
  SELECT 'logins' as table_name, * FROM logins
;" | jq '.' > "$FILENAME"

echo "✅ Done! $(wc -l < "$FILENAME") lines"
