#!/bin/bash
# Auto-patch Next.js Watchpack NormalizeError bug on container start
# This fixes the path mismatch issue on Windows Docker bind mounts
NPP="/app/node_modules/next/dist/shared/lib/page-path/normalize-page-path.js"
if [ -f "$NPP" ] && ! grep -q "PATCHED: NormalizeError" "$NPP"; then
  echo "⚙️  Patching Next.js Watchpack NormalizeError bug..."
  node /tmp/_patch_next.js "$NPP"
fi
exec "$@"
