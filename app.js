import { parseConfig } from './lib/config.js';

const gallery = document.getElementById('gallery');
const notice = document.getElementById('notice');
const template = document.getElementById('site-template');

async function init() {
  try {
    const response = await fetch('./sites.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`站点配置读取失败（${response.status}）。`);
    const config = parseConfig(await response.json());
    for (const key of ['brand', 'label', 'tagline', 'copyright', 'footer']) {
      document.querySelector(`[data-${key}]`).textContent = config[key];
    }
    document.title = `${config.brand.replace(/\.$/, '')} · ${config.label}`;
    const sites = config.sites.filter(site => !site.hidden);
    const cards = document.createDocumentFragment();
    for (const [index, site] of sites.entries()) {
      const card = template.content.firstElementChild.cloneNode(true);
      const address = new URL(site.url);
      const image = card.querySelector('img');
      const fallback = card.querySelector('.preview-fallback');
      card.href = site.url;
      card.setAttribute('aria-label', `访问${site.name}（在新标签页打开）`);
      card.querySelector('.site-name').textContent = site.name;
      card.querySelector('.site-domain').textContent = address.host + (address.pathname === '/' ? '' : address.pathname) + address.search + address.hash;
      card.querySelector('.fallback-name').textContent = address.hostname.split('.')[0].replace(/^./, letter => letter.toUpperCase()) + '.';
      image.alt = `${site.name}的首页预览`;
      image.loading = index < 2 ? 'eager' : 'lazy';
      image.addEventListener('load', () => { image.classList.add('is-loaded'); fallback.hidden = true; }, { once: true });
      image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; }, { once: true });
      image.src = site.preview;
      cards.append(card);
    }
    gallery.replaceChildren(cards);
    notice.textContent = sites.length ? '' : '暂时还没有公开站点。';
    notice.hidden = sites.length > 0;
  } catch (error) {
    notice.textContent = '站点列表暂时无法载入，请稍后刷新。';
    console.error(error);
  } finally {
    gallery.setAttribute('aria-busy', 'false');
  }
}

init();
