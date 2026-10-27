# 大水书阁

**[打开网站](https://dashui-shuge-preview.vercel.app)** · **[阅读《还是让我来吧》](https://dashui-shuge-preview.vercel.app/book/7.html)** · **[从第一章开始](https://dashui-shuge-preview.vercel.app/book/7/701.html)**

大水书阁的免费静态阅读与界面预览版本。访客无需登录即可阅读原创小说，支持纸感、明亮、夜间、粉色四种阅读模式及字号、行距和正文宽度设置。

## 已加入的小说

《还是让我来吧》，作者 **ad钙**，连载中，当前 **九章**。正文位于 [`content/novel`](content/novel)，书名与作者等信息位于 [`content/book.json`](content/book.json)。仅加入作者指定目录中第一至第九章正文，没有加入创作笔记、世界设定、人物志、旧稿或其他项目。第十章尚未加入。

小说正文著作权归作者 ad钙 所有，未经许可不得转载。网站程序的开源许可证见 [LICENSE](LICENSE)。二者分别适用，不因程序开源而转移小说版权。

## 目录

- `public/`：Vercel 实际发布目录，含阅读页面、静态资源和浏览器示例 API。
- `content/`：原创小说的公开正文和元数据。
- `templates/`：大水书阁页面快照，保留现有布局，用于生成原创详情、目录和阅读页。
- `src/`：界面预览的 API 模拟与适配源码。
- `build_site.py`：从已加入的正文重新生成页面；仅使用本仓库内的数据。
- `import_novel.py`：只按明确章节文件名导入原稿，移除章末“连续性记录”；不递归导入父目录。
- `verify_site.py`：核对九章正文、阅读导航和排除项。
- `docs/002-original-README.md`：保留此仓库原始 README 内容。

## 本地运行

需要 Python 3.12+。在仓库目录按顺序运行：

```powershell
python build_site.py
python -m unittest test_import_novel.py
node --test preview-api.test.cjs novel-api.test.cjs
python verify_site.py
python -m http.server 8096 --bind 127.0.0.1 --directory public
```

打开 http://127.0.0.1:8096 。本地停止按 Ctrl+C。Node 仅用于测试，不是网站运行依赖。静态文件已提交，即使不构建也可直接预览。

## 发布与更新

Vercel 项目为 `dashui-shuge-preview`，配置文件 `vercel.json` 指定 `public` 为输出目录，无服务端 Functions、付费模型或数据库。使用 Vercel 官方控制台或已登录的 CLI 部署。GitHub 修改不会自动更新网站，除非另外接好该仓库的 Git 自动部署；本次发布流程会单独更新 Vercel 并验收。

更新正文后需要重新运行生成、检查并部署。请勿把 `.env`、CLI 登录文件、私人数据或整个创作目录放入本仓库。本仓库与原雾间项目独立。

## 当前交互边界

原创小说正文是实际内容，所有访客都能阅读。其人物资料仍在整理，未开放真实角色聊天，不套用样书人物。

另外六本作品为明确标识的虚构样书，用于体验人物资料、关系、固定示例聊天和讨论界面。聊天没有调用真实 AI。书架、进度、留言、草稿和示例聊天仅存于当前浏览器，不会同步或公开给其他访客；演示编辑身份不是正式管理权限。

后续正式共享评论、真实模型、登录和跨设备存储仍需服务端环境。本版本不修改 `mist.ly0688.online` 原站入口。

## 来源

基于 [novel-plus](https://github.com/201206030/novel-plus) 定制的大水书阁页面导出，Java/Spring Boot 完整开发项目仍独立保留。本仓库交付可直接部署的免费静态版本，不含服务器配置、数据库或平台密钥。
