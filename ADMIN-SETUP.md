# 满帆网站后台部署说明

当前分支：`feature/admin-cms`。保留七页英文网站，新增中文 `/admin/` 后台，采用 Vercel Functions + Supabase 数据库、Auth 和 Storage。无需安装运行时 npm 依赖。

## 已实现

- 管理员邮箱密码登录，服务端验证允许的邮箱；HttpOnly 会话 cookie，最长一小时后重新登录。
- 编辑七个页面的标题和段落、全站联系邮箱与所在地。
- 六个原有产品系列和三篇原有文章可编辑；新增、草稿、发布、取消发布，上传 JPG/PNG/WebP 图片（最大 2 MB）。正文为纯文本，空行分段。
- 两处表单直接保存询盘，保留项目详细字段、提交时间与来源；后台每页 50 条，当前页搜索、四种跟进状态和内部备注。
- 服务端字段验证、同源写入、数据库级请求限流（每 IP：15 分钟 5 次询盘 / 10 次登录）、隐藏诱捕字段。
- 数据库全部启用 RLS 并禁止匿名及普通登录用户直接访问；数据库服务密钥仅在服务器使用。公开接口不返回草稿正文或询盘数据。

## 一次性配置

1. 在自己的 Supabase 账号创建项目，在 SQL Editor 执行 `db/setup.sql`。
2. 在 Authentication → Users 创建管理员邮箱/密码，确认邮箱已验证。建议关闭公开注册。账号必须也列在下方 `ADMIN_EMAILS` 内，普通用户不能进入后台。密码不要写进代码。
3. 在 Vercel 项目设置中添加以下环境变量：

| 变量 | 值 |
|---|---|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 后端 service_role 密钥，仅配置到 Vercel，不提交 GitHub |
| `ADMIN_EMAILS` | 管理员邮箱，多个使用英文逗号分隔 |
| `SITE_ORIGIN` | `https://manfanbag-website.vercel.app`，末尾不要斜杠；绑定域名后改成实际访问域名 |
| `RATE_LIMIT_SECRET` | 随机密钥，可用 `openssl rand -hex 32` 生成 |

4. 将分支提交到 GitHub。Vercel 使用 Other 框架，Build Command 为 `npm run build`，Output Directory 为 `dist`。`vercel.json` 已设置构建配置。不要把发布目录设置成仓库根目录，避免暴露说明和数据库脚本。
5. 重新部署，然后打开 `/admin/`。原有内容会自动出现在编辑器中，无需导入；每次保存才写入数据库。新文章和产品会加入对应子页面。
6. 使用预览部署测试时，为 Preview 环境单独设置与该预览 URL 一致的 `SITE_ORIGIN`。生产和预览最好使用不同的 Supabase 项目。

## 上线验收

- 未登录请求询盘接口应返回 401；普通 Supabase 用户应返回 403。
- 登录后修改一段文案，确认刷新前台可见；创建草稿确认前台不可见，再发布确认可见。
- 上传图片、修改原有产品、下架并检查对应入口。
- 分别从 Contact Us / Start a Project 提交测试询盘，确认后台收到全部字段；修改状态与备注，再刷新确认保存。
- 用手机验证表单、导航和后台布局。
- 退出登录后重新访问询盘接口，确认无法读取。

## 本地运行

安装 Node.js 22 或以上，将 `.env.example` 复制为 `.env.local` 并填写变量；本地 `SITE_ORIGIN` 使用 `http://localhost:3000`。运行 `npm run dev`。

`npm test` 为接口权限、草稿隔离、字段校验、询盘成功/失败、限流与 cookie 检查。本次 10 项模拟接口测试、构建与七页本地链接检查已通过。浏览器下载受网络限制，尚未完成浏览器视觉验收；也尚未连接真实 Supabase 或进行生产验收。

## 当前边界

- 这是接入现有静态站的 CMS，内容通过 JavaScript 加载，旧的静态文本会在接口异常时保留。取消发布不是保密或彻底删除：原有公开内容仍在静态 HTML 和 Git 历史中。
- 新增内容暂时没有独立文章 URL；显示在 Collections 或 Insights 中。SEO 所需的服务器渲染、独立文章页和结构化数据需后续完善。
- 不含询盘邮件通知、附件上传、富文本编辑器或多级角色。管理员可在 Supabase 控制台重置密码及执行数据维护。
- 询盘接口失败时保留访客已填信息，并显示错误及邮件联络方式，不会假报提交成功。上线必须先配置数据库，再切换到此版本。
- 图片为公开网站素材；不要上传客户私密附件。

官方配置参考：
- https://supabase.com/docs/guides/auth/passwords
- https://vercel.com/docs/functions/runtimes/node-js
