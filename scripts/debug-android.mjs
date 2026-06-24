import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const AVD_NAME = process.env.ANDROID_AVD ?? 'Pixel_7_API_35';
const METRO_PORT = process.env.EXPO_METRO_PORT ?? '8081';

function resolveAndroidHome() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    'D:\\Devops\\Android\\Sdk',
    '/d/Devops/Android/Sdk',
  ].filter(Boolean);

  for (const home of candidates) {
    const emulator = join(home, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
    if (existsSync(emulator)) {
      return home;
    }
  }

  throw new Error(
    'ANDROID_HOME not found. Set ANDROID_HOME to your Android SDK path (e.g. D:\\Devops\\Android\\Sdk).'
  );
}

function sdkBin(androidHome, name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  return join(androidHome, name === 'emulator' ? 'emulator' : 'platform-tools', exe);
}

function run(bin, args, options = {}) {
  return execFileSync(bin, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasRunningEmulator(adb) {
  const output = run(adb, ['devices']);
  return /emulator-\d+\s+device/m.test(output);
}

async function waitForBoot(adb) {
  for (let i = 0; i < 120; i += 1) {
    try {
      const boot = run(adb, ['shell', 'getprop', 'sys.boot_completed']).trim();
      if (boot === '1') {
        return;
      }
    } catch {
      // adb not ready yet
    }
    await sleep(2000);
  }
  throw new Error('Timed out waiting for emulator boot');
}

async function ensureEmulator() {
  const androidHome = resolveAndroidHome();
  const adb = sdkBin(androidHome, 'adb');
  const emulator = sdkBin(androidHome, 'emulator');

  if (hasRunningEmulator(adb)) {
    console.log('Android emulator already running');
  } else {
    console.log(`No Android emulator detected. Starting ${AVD_NAME}...`);
    const child = spawn(emulator, ['-avd', AVD_NAME, '-no-snapshot-load'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    run(adb, ['wait-for-device']);
    await waitForBoot(adb);
    console.log('Emulator boot completed');
  }

  try {
    run(adb, ['reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  } catch {
    // non-fatal
  }

  console.log(run(adb, ['devices']).trim());
}

async function openExpoOnEmulator() {
  const androidHome = resolveAndroidHome();
  const adb = sdkBin(androidHome, 'adb');

  try {
    run(adb, ['reverse', `tcp:${METRO_PORT}`, `tcp:${METRO_PORT}`]);
  } catch {
    // non-fatal
  }

  try {
    run(adb, [
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `exp://127.0.0.1:${METRO_PORT}`,
    ]);
  } catch {
    try {
      run(adb, ['shell', 'monkey', '-p', 'host.exp.exponent', '-c', 'android.intent.category.LAUNCHER', '1']);
    } catch {
      // Expo Go may already be open
    }
  }
}

async function waitForAndroidBundle() {
  const bundleUrl = `http://127.0.0.1:${METRO_PORT}/index.ts.bundle?platform=android&dev=true`;
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(bundleUrl);
      if (response.ok) {
        console.log('Android Bundled');
        return;
      }
    } catch {
      // Metro still starting
    }
    await sleep(2000);
  }
  throw new Error('Timed out waiting for Android bundle');
}

async function metroIsRunning() {
  try {
    const response = await fetch(`http://127.0.0.1:${METRO_PORT}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

function spawnExpo() {
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['expo', 'start', '--android', '--port', METRO_PORT],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    }
  );

  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function startExpoFlow() {
  process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

  if (await metroIsRunning()) {
    console.log(`Metro already running on http://127.0.0.1:${METRO_PORT}`);
    await openExpoOnEmulator();
    await waitForAndroidBundle();
    return;
  }

  console.log('Starting Metro and opening Android...');
  spawnExpo();
}

async function main() {
  const mode = process.argv[2] ?? 'all';

  if (mode === 'emulator') {
    await ensureEmulator();
    return;
  }

  if (mode === 'expo') {
    await startExpoFlow();
    return;
  }

  await ensureEmulator();
  await startExpoFlow();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
