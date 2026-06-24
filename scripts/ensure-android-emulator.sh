#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${ANDROID_AVD:-Pixel_7_API_35}"

setup_android_path() {
  if [ -n "${ANDROID_HOME:-}" ]; then
    export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
  elif [ -d "/d/Devops/Android/Sdk" ]; then
    export ANDROID_HOME="/d/Devops/Android/Sdk"
    export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
  fi
}

wait_for_boot() {
  for _ in $(seq 1 120); do
    boot=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$boot" = "1" ]; then
      return 0
    fi
    sleep 2
  done
  echo "Timed out waiting for emulator boot" >&2
  exit 1
}

setup_android_path

if adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+\s+device'; then
  echo "Android emulator already running"
else
  echo "No Android emulator detected. Starting ${AVD_NAME}..."
  nohup emulator -avd "$AVD_NAME" -no-snapshot-load >/dev/null 2>&1 &
  adb wait-for-device
  wait_for_boot
  echo "Emulator boot completed"
fi

adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
adb devices
