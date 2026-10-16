const defaults = {
  brand: 'CupGIS.', label: '独立站点集', tagline: '关于空间，也关于探索。',
  copyright: 'CupGIS', footer: '保持好奇，继续探索。',
};

export function previewPath(url) {
  const address = new URL(url);
  const host = address.host.replace(/[^a-z0-9.-]/gi, '-');
  const route = address.pathname + address.search + address.hash;
  if (route === '/') return `assets/previews/${host}.jpg`;
  // Include the route so multiple pages on one hostname get distinct previews.
  let hash = 2166136261;
  for (const character of route) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `assets/previews/${host}-${(hash >>> 0).toString(16)}.jpg`;
}

function publicUrl(value, label) {
  if (typeof value !== 'string') throw new Error(`${label} 必须是完整的 HTTPS 网址。`);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} 不是有效网址。`); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`${label} 必须使用 HTTPS，且不能包含账户密码。`);
  }
  return url.href;
}

export function parseConfig(input) {
  if (!input || !Array.isArray(input.sites)) throw new Error('sites.json 需要包含 sites 数组。');
  const config = { ...defaults, sites: [] };
  for (const key of Object.keys(defaults)) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'string') throw new Error(`${key} 必须是文字。`);
      config[key] = input[key];
    }
  }
  const addresses = new Set();
  for (const [index, entry] of input.sites.entries()) {
    const label = `第 ${index + 1} 个站点`;
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`${label} 缺少 name。`);
    const url = publicUrl(entry.url, `${label}的 url`);
    if (addresses.has(url)) throw new Error(`${label}的 url 与其他站点重复。`);
    addresses.add(url);
    if (entry.hidden !== undefined && typeof entry.hidden !== 'boolean') throw new Error(`${label}的 hidden 必须为 true 或 false。`);
    const site = { name: entry.name.trim(), url, hidden: entry.hidden === true, preview: previewPath(url) };
    if (entry.preview !== undefined) {
      if (typeof entry.preview !== 'string' || !entry.preview.trim()) throw new Error(`${label}的 preview 必须为图片路径。`);
      const image = new URL(entry.preview, 'https://portal.invalid/');
      if (image.protocol !== 'https:' || image.username || image.password) throw new Error(`${label}的 preview 必须是本地路径或 HTTPS 图片网址。`);
      site.preview = entry.preview;
      site.customPreview = true;
    }
    const capture = entry.capture ?? {};
    if (typeof capture !== 'object' || capture === null || Array.isArray(capture)) throw new Error(`${label}的 capture 必须是对象。`);
    const waitMs = capture.waitMs ?? 4000;
    if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > 20000) throw new Error(`${label}的 capture.waitMs 需要为 0–20000 的整数。`);
    if (capture.hide !== undefined && (!Array.isArray(capture.hide) || capture.hide.some(selector => typeof selector !== 'string' || !selector.trim()))) throw new Error(`${label}的 capture.hide 必须是 CSS 选择器数组。`);
    if (capture.waitFor !== undefined && (typeof capture.waitFor !== 'string' || !capture.waitFor.trim())) throw new Error(`${label}的 capture.waitFor 必须是 CSS 选择器。`);
    site.capture = { waitMs, hide: capture.hide ?? [], waitFor: capture.waitFor };
    config.sites.push(site);
  }
  return config;
}
