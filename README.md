# CupGIS 门户

暖白背景、双列网站预览、名称和域名。手机上自动变为单列，点击整张卡片在新标签页访问。支持系统深色模式与键盘操作。页面是纯静态 HTML/CSS/JavaScript，无运行时后端，无需密钥。

## 快速增加网站或页面

**只编辑根目录的 `sites.json`。** 在 `sites` 数组末尾增加一项（注意前一项后面的逗号）：

```json
{ "name": "新网站", "url": "https://new.cupgis.cn/" }
```

提交到 `main` 后，门户会显示新入口，GitHub Actions 会尝试生成首页预览并提交到仓库。网址也可以是同一个网站中的不同页面，每个页面会得到独立的预览图。仅支持完整 HTTPS 网址。

- **排序：** 调整 `sites` 中的先后顺序。
- **删除：** 删除对应配置项。
- **临时隐藏：** 添加 `"hidden": true`（只是从门户隐藏，公开配置文件中仍然可见）。
- **改首页文字：** 修改 `brand`、`label`、`tagline`、`copyright`、`footer`。

## 预览图

预览图是网页截图，不是实时嵌入的 iframe。截图尺寸为 1440 × 900；卡片统一比例，不需要访问者同时加载五个地图应用。

### 自动生成

修改 `sites.json` 并推送后，Actions → **Update website previews** 自动运行。也可以进入该工作流点击 **Run workflow** 手动刷新。工作流只在配置/截图代码变更或手动运行时执行，没有定时任务；不需要 Cloudflare Token。

截图失败会保留旧图；如果从未成功截图，显示简洁的文字占位，访问入口仍正常。工作流的 Summary 会说明哪些站点成功。所有站点均失败时，工作流会报失败并保留原图。网络超时、反爬、登录限制或空白渲染可能导致截图失败；脚本不处理登录或绕过验证。

工作流使用仓库自带的 `GITHUB_TOKEN` 写回图片。若组织策略或分支保护阻止机器人推送，可使用下方本地生成方式，将图片和配置一起提交。

### 手动指定图片

把自己的截图放到 `assets/previews/`，并指定 `preview`。设置后自动截图流程会跳过该项，不会覆盖这张图：

```json
{
  "name": "新网站",
  "url": "https://new.cupgis.cn/",
  "preview": "assets/previews/my-cover.jpg"
}
```

支持 JPG、PNG、WebP，也支持完整的 HTTPS 图片网址。建议使用本地图片以避免第三方访问限制。

### 地图加载慢或有浮层

仅在需要时增加 `capture` 配置；`waitMs` 是页面初始加载后的额外等待时间（0–20000 毫秒）。可用 `waitFor` 等待某个实际可见的 CSS 元素，`hide` 隐藏截图中不需要的浮层；这些设置只影响截图，不修改子站：

```json
{
  "name": "地图应用",
  "url": "https://new.cupgis.cn/",
  "capture": {
    "waitMs": 8000,
    "waitFor": "#app canvas",
    "hide": [".cookie-banner"]
  }
}
```

这里的选择器只是示例，请替换成目标页面真实存在的元素；不需要时不填写。

## 本地预览与检查

需要 Node.js 22 或更新版本。

```sh
npm ci
npm run dev
```

打开终端显示的 `http://127.0.0.1:4173/`。请通过 HTTP 服务预览，不要直接双击 HTML（浏览器会限制读取配置）。

```sh
npm test
npm run build
```

构建会检查配置并生成干净的 `dist/` 目录，可上传到任意静态托管。

本地生成预览图：

```sh
npx playwright install chromium
npm run previews
```

只刷新某个站点：

```sh
npm run previews -- data.cupgis.cn
```

Windows 如需使用已安装的 Microsoft Edge，可在 PowerShell 中运行（无需下载 Chromium）：

```powershell
$env:PREVIEW_BROWSER_CHANNEL = "msedge"
npm run previews
```

## 部署到 Cloudflare Pages

连接此 GitHub 仓库，设置：

| 配置项 | 内容 |
| --- | --- |
| 生产分支 | `main` |
| 框架预设 | None |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| Node.js 版本 | 24 |

在 Pages 的 Custom domains 中添加 `cupgis.cn`，按控制台提示完成绑定。已有子站继续保留各自的域名与部署。截图写回后，Cloudflare 的 Git 集成可对新提交进行构建；若已有项目关闭了自动构建，需要手动触发部署。

如使用 GitHub Pages，也可将仓库根目录作为静态源（`main` / `/ (root)`）。注意：`GITHUB_TOKEN` 产生的提交不会触发新的 Pages 构建，机器人更新图片后需要手动重跑 Pages 部署，或将截图和配置一起从本地提交。推荐当前的 Cloudflare Pages Git 集成流程。

## 文件位置

| 文件 | 用途 |
| --- | --- |
| `sites.json` | 日常维护入口：站点和首页文字 |
| `index.html` / `styles.css` / `app.js` | 页面结构、外观与配置加载 |
| `assets/previews/` | 网站截图，可自行放置封面 |
| `scripts/capture-previews.mjs` | 预览图生成脚本 |
| `.github/workflows/previews.yml` | 自动截图并保存 |

门户只展示配置中的公开入口，不扫描 DNS，也不在网页里放任何管理密钥。
