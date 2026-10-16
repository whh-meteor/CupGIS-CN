import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseConfig, previewPath } from '../lib/config.js';

test('the configured sites are valid and have independent preview paths', async () => {
  const config = parseConfig(JSON.parse(await readFile(new URL('../sites.json', import.meta.url), 'utf8')));
  assert.equal(new Set(config.sites.map(site => site.preview)).size, config.sites.length);
});

test('adding a page only requires a name and URL, with separate previews on the same host', () => {
  const config = parseConfig({ sites: [
    { name: '首页', url: 'https://example.com/' },
    { name: '其他页面', url: 'https://example.com/tools?a=1#demo' },
  ] });
  assert.equal(config.brand, 'CupGIS.');
  assert.notEqual(config.sites[0].preview, config.sites[1].preview);
  assert.equal(previewPath('https://example.com/'), 'assets/previews/example.com.jpg');
  assert.notEqual(previewPath('https://example.com:8443/'), previewPath('https://example.com/'));
});

test('rejects unsafe links, malformed entries and duplicate destinations before publishing', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com/', 'https://user:password@example.com/', 'invalid']) {
    assert.throws(() => parseConfig({ sites: [{ name: '站点', url }] }));
  }
  assert.throws(() => parseConfig({ sites: [{ url: 'https://example.com/' }] }));
  assert.throws(() => parseConfig({ sites: [{ name: 'A', url: 'https://example.com' }, { name: 'B', url: 'https://example.com/' }] }));
  assert.throws(() => parseConfig({ sites: [{ name: 'A', url: 'https://example.com/', capture: { waitMs: -1 } }] }));
});

test('supports custom covers and temporary hiding without changing the page code', () => {
  const { sites } = parseConfig({ sites: [
    { name: 'Custom', url: 'https://example.com/', preview: 'assets/custom.png', hidden: true },
  ] });
  assert.equal(sites[0].preview, 'assets/custom.png');
  assert.equal(sites[0].customPreview, true);
  assert.equal(sites[0].hidden, true);
});
