# Gallery 图库模块 · Supabase 手把手配置

本指南配合仓库内 `supabase/gallery_schema.sql` 使用。  
**图片文件**仍走兰空图床；**Supabase** 只存「哪篇文章有哪些图片 URL」。

---

## 第一步：注册 Supabase 项目

1. 打开 [https://supabase.com](https://supabase.com) 并登录  
2. 点击 **New project**  
3. 填写：
   - **Name**：例如 `problog-gallery`
   - **Database Password**：自己记牢（仅 Supabase 内部用，代码里不用填这个密码）
   - **Region**：选离用户近的（如 Northeast Asia）  
4. 等待约 1～2 分钟，项目状态变为 **Active**

---

## 第二步：执行 SQL 建表（不用手动画表）

1. 左侧菜单 **SQL Editor**  
2. 点击 **New query**  
3. 打开本仓库文件：`supabase/gallery_schema.sql`  
4. **全选复制** → 粘贴到 Supabase 编辑器  
5. 点击 **Run**（或 Ctrl+Enter）  
6. 底部应显示 **Success**，无红色报错  

验证：左侧 **Table Editor** 应出现两张表：

- `galleries`
- `gallery_images`

---

## 第三步：复制 API 密钥到 Vercel

1. Supabase 左侧 **Project Settings**（齿轮）→ **API**  
2. 复制下面两项（**不要**把 service_role 发到公开场合）：

| 名称 | 填到 Vercel 环境变量 |
|------|----------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| service_role `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

3. 打开 [Vercel 项目](https://vercel.com) → **Settings** → **Environment Variables**  
4. 添加上述两个变量（Production / Preview / Development 都勾选）  
5. 兰空（若尚未配置）：

| 变量名 | 值 |
|--------|-----|
| `LSKY_TOKEN` | 你的兰空 Bearer Token（**仅填 token，不要重复写 Bearer 两次**） |
| `LSKY_URL` | 可选，默认 `https://img.x1file.top` |

6. **Redeploy** 一次部署，环境变量才会生效  

本地开发：在项目根目录建 `.env.local`（不要提交 git）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
LSKY_TOKEN=1|你的兰空token
```

---

## 第四步：后台如何使用

1. 打开网站 `/admin`  
2. 新建或编辑一篇 **Post**  
3. 先点底部 **确认发布 / 保存修改**（确保有 `slug`）  
4. 展开 **「图库（Gallery · Supabase）」**  
5. 拖拽或选择多张图片 → 自动上传兰空  
6. 点击 **保存图库** → 写入 Supabase  
7. 前台 Gallery 主题打开该文章 → 应看到网格 + **加载更多**

说明：

- Notion 正文块可只写简短说明（放摘要里）；有大图库时前台优先显示 Supabase 图库  
- 无图库数据时，仍显示原来的 Notion 正文排版  

---

## 安全说明

- `SUPABASE_SERVICE_ROLE_KEY` **只能**放在服务端（Vercel / `.env.local`），不要写进前端代码  
- SQL 已开启 RLS 且未开放匿名策略，外网无法直接读表，只能通过本站 API  
- 若兰空 Token 曾在聊天/截图中泄露，请到兰空后台 **作废并重新生成**  

---

## 故障排查

| 现象 | 处理 |
|------|------|
| 提示 `invalid path specified in request URL` | `NEXT_PUBLIC_SUPABASE_URL` 填错了：应仅为 `https://xxxx.supabase.co`，**不要**带 `/rest/v1` 或末尾斜杠 |
| 保存图库提示 Supabase 未配置 | 检查 Vercel 两个 Supabase 变量是否已填并重新部署 |
| 上传成功但保存失败 | Table Editor 确认两张表存在；SQL 是否完整执行 |
| 前台无图库 | 确认全站主题为 Gallery；该 slug 是否已点「保存图库」 |
| 兰空上传失败 | 检查 `LSKY_TOKEN`；Token 格式可为 `1|xxx` 或 `Bearer 1|xxx`（代码会自动补 Bearer） |
| 提示「图片大小超出限制」 | **兰空后台**限制，非 Supabase。登录兰空管理端 → **策略 / 用户组 / 储存策略** → 将「单张上传大小」调到 ≥10MB（商用图库建议 20～50MB）；本站可用 `LSKY_MAX_UPLOAD_MB=50` |
| Vercel 上传报 `Request En... is not valid JSON` | **Vercel 函数请求体上限 4.5MB**。线上 **>3.5MB** 会自动压缩为 JPEG 后再上传（画质略降，可正常展示） |
| 提示 `CSRF token mismatch` | 浏览器直传兰空会触发 Laravel CSRF；现已统一走服务端代理，不应再出现 |
| 提示 `POST method is not supported... DELETE` | 旧版曾调用兰空不存在的 `/api/v1/images/tokens`；已改为压缩+代理，重新部署即可 |
