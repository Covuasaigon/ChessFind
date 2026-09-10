#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
node -e "if(Number(process.versions.node.split('.')[0])<24){console.error('Cần Node.js 24 trở lên.');process.exit(1)}"
exec node --env-file-if-exists=CAU-HINH.env server/server.mjs
