#!/usr/bin/env bash
set -euo pipefail

export EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1

METRO_PORT="${EXPO_METRO_PORT:-8081}"
METRO_URL="http://127.0.0.1:${METRO_PORT}"

open_expo_on_emulator() {
  adb reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}" >/dev/null 2>&1 || true
  adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:${METRO_PORT}" >/dev/null 2>&1 \
    || adb shell monkey -p host.exp.exponent -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 \
    || true
}

wait_for_android_bundle() {
  local bundle_url="http://127.0.0.1:${METRO_PORT}/index.ts.bundle?platform=android&dev=true"
  for _ in $(seq 1 120); do
    if curl -sf "$bundle_url" >/dev/null 2>&1; then
      echo "Android Bundled"
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for Android bundle" >&2
  exit 1
}

if curl -sf "${METRO_URL}/status" >/dev/null 2>&1; then
  echo "Metro already running on ${METRO_URL}"
  open_expo_on_emulator
  wait_for_android_bundle
  exit 0
fi

echo "Starting Metro and opening Android..."
exec npx expo start --android --port "${METRO_PORT}"
