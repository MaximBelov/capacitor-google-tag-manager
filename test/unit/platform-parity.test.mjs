// Every method of the TypeScript API has its native method on both platforms and its section in the README, and neither
// platform has a method the API does not declare. A miss on either side compiles fine and fails only on a phone. Plain
// Node, no install. addListener and removeAllListeners come from Capacitor's base classes and are left out. The methods
// that drive gtm.js exist only on the web, by design: they are named here, and must stay out of both native plugins (a
// native method of the same name would take the call away from Capacitor's UNIMPLEMENTED answer).
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const inherited = new Set(['addListener', 'removeAllListeners']);
const webOnly = ['push', 'start'];

const definitions = read('src/definitions.ts');
const api = [...definitions.matchAll(/^\s+(\w+)\([^)]*\):\s*Promise</gm)]
  .map((m) => m[1])
  .filter((name) => !inherited.has(name))
  .sort();
const swift = read('ios/Sources/GoogleTagManagerPlugin/GoogleTagManagerPlugin.swift');
const kotlin = read('android/src/main/kotlin/io/github/maximbelov/googletagmanager/GoogleTagManagerPlugin.kt');
const ios = [...swift.matchAll(/CAPPluginMethod\(name:\s*"(\w+)"/g)].map((m) => m[1]).sort();
const iosFunctions = [...swift.matchAll(/@objc (?:override )?(?:public )?func (\w+)\(_ call: CAPPluginCall\)/g)]
  .map((m) => m[1])
  .sort();
const android = [...kotlin.matchAll(/@PluginMethod\s+(?:override\s+)?fun (\w+)\(/g)].map((m) => m[1]).sort();
const native = api.filter((name) => !webOnly.includes(name));

test('the API declares its methods', () => {
  assert.deepEqual(api, ['isAvailable', 'push', 'start']);
});

test('iOS registers exactly the native methods of the API', () => {
  assert.deepEqual(ios, native);
});

test('iOS has an @objc function for every registered method', () => {
  assert.deepEqual(iosFunctions, native);
});

test('Android annotates exactly the native methods of the API', () => {
  assert.deepEqual(android, native);
});

test('the web implements every method of the API', () => {
  const web = read('src/web.ts');
  for (const method of api) {
    assert.match(web, new RegExp(`^  async ${method}\\(`, 'm'), `src/web.ts has no ${method}()`);
  }
});

test('the web-only methods say so where they are declared, and neither native plugin mentions them', () => {
  for (const method of webOnly) {
    const doc = definitions.match(new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s+${method}\\(`));
    assert.ok(doc, `src/definitions.ts has no JSDoc for ${method}()`);
    assert.match(doc[1], /Web only\./, `${method}() is not documented as web only`);
    assert.match(doc[1], /UNIMPLEMENTED/, `${method}() does not say what Android and iOS answer`);
    assert.doesNotMatch(swift, new RegExp(`\\b${method}\\b`), `iOS mentions ${method}`);
    assert.doesNotMatch(kotlin, new RegExp(`\\b${method}\\b`), `Android mentions ${method}`);
  }
});

test('the plugin has the same name in JavaScript, Swift and Kotlin', () => {
  assert.match(read('src/index.ts'), /registerPlugin<GoogleTagManagerPlugin>\('GoogleTagManager'/);
  assert.match(swift, /jsName = "GoogleTagManager"/);
  assert.match(kotlin, /name = "GoogleTagManager"/);
});

test('both platforms answer with the field the API declares', () => {
  assert.match(definitions, /^\s+available: boolean;/m);
  assert.match(swift, /"available":/, 'iOS sends no available');
  assert.match(kotlin, /"available"/, 'Android sends no available');
});

// The SDK is the reason the plugin exists, so its dependency is pinned on every route an app installs it by.
test('every install route depends on the Tag Manager SDK', () => {
  assert.match(read('Package.swift'), /google-tag-manager-ios-sdk\.git", "9\.1\.0"\.\.<"10\.0\.0"/);
  assert.match(read('Package.swift'), /\.product\(name: "GoogleTagManager", package: "google-tag-manager-ios-sdk"\)/);
  // Declared is not linked: the SDK is a static archive nobody calls, so the linkage target references its entry point.
  assert.match(read('ios/Sources/GoogleTagManagerLinkage/GoogleTagManagerLinkage.m'), /\[TAGManager class\]/);
  assert.match(read('CapacitorGoogleTagManager.podspec'), /s\.dependency 'GoogleTagManager', '~> 9\.1'/);
  assert.match(
    read('android/build.gradle'),
    /implementation "com\.google\.android\.gms:play-services-tagmanager:\$playServicesTagManagerVersion"/,
  );
});

test('the README documents every method', () => {
  const readme = read('README.md');
  for (const method of api) {
    assert.match(readme, new RegExp(`### ${method}\\(`), `README.md has no section for ${method}()`);
  }
});
