# 🚀 更新现有 Vercel 部署

## 📋 **更新内容**

现在admin-dashboard包含两个管理功能：
- ✅ **Surrogacy Applications** - 原有功能
- ✅ **Events Management** - 新增功能  
- ✅ **统一导航** - 在一个网站中管理两个功能
- ✅ **Dashboard统计** - 显示Applications和Events的汇总信息

---

## 🔄 **更新步骤**

### **方法1：通过 Vercel Dashboard（推荐）**

1. **登录 Vercel Dashboard**
   - 前往 [vercel.com/dashboard](https://vercel.com/dashboard)
   - 找到你现有的项目

2. **重新部署**
   - 点击项目名称进入项目详情
   - 点击 "Deployments" 标签页
   - 点击 "Redeploy" 或者上传新的代码

3. **上传更新的代码**
   - 如果之前是上传的ZIP文件，重新上传整个 `admin-dashboard` 文件夹
   - 如果是连接的Git仓库，将代码推送到仓库

### **方法2：通过 Vercel CLI**

```bash
cd /Users/wangxinheng/Desktop/代孕app/admin-dashboard
npx vercel --prod
```

### **方法3：重新上传文件**

1. **准备文件**
   ```bash
   cd /Users/wangxinheng/Desktop/代孕app
   zip -r admin-dashboard-updated.zip admin-dashboard/
   ```

2. **上传到 Vercel**
   - 在 Vercel 项目设置中选择 "Import Git Repository" > "Upload"
   - 上传新的ZIP文件

---

## ⚙️ **环境变量检查**

在 **Vercel → Project → Settings → Environment Variables**（或自建服务器环境）中配置。本地可参考根目录下的 **[.env.example](.env.example)** 复制为 `.env.local`。

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL（Dashboard → Settings → API） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` `public` 密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | **生产必需**：`service_role` 密钥（仅服务端，勿提交到 Git） |
| `NEXT_PUBLIC_SITE_URL` | 站点对外根地址，**无末尾斜杠**。例如生产：`https://mysurro.com`。用于服务端回调本站 API（如代孕阶段变更通知）。本地可省略或设为 `http://localhost:3000` |

未设置 `NEXT_PUBLIC_SITE_URL` 时，部署在 Vercel 上会回退使用 `VERCEL_URL`；自定义域名生产环境**建议显式设为** `https://mysurro.com`，避免内部请求仍指向 `*.vercel.app`。

---

## 🌐 **自定义域名（mysurro.com）**

目标：浏览器访问 **https://mysurro.com** 即打开本管理后台（Next.js，非静态虚拟主机上传）。

1. **Vercel 项目设置**
   - **Root Directory** 设为 **`admin-dashboard`**（与仓库结构一致）。
   - 完成上文环境变量，尤其 `SUPABASE_SERVICE_ROLE_KEY` 与 `NEXT_PUBLIC_SITE_URL=https://mysurro.com`。

2. **绑定域名**
   - Vercel → Project → **Settings → Domains** → Add `mysurro.com`（可选再加 `www.mysurro.com`）。
   - 按页面提示在域名注册商或 DNS 服务商处添加 **A 记录**或 **CNAME**（以 Vercel 当前说明为准）。
   - 等待 DNS 生效（常见数分钟至 48 小时）。

3. **验证**
   - 打开 `https://mysurro.com` 应出现后台登录页；若曾用 `*.vercel.app` 登录，需在**新域名下重新登录**（Cookie 按主机名隔离）。

**自建 VPS**：`npm run build` 后使用 `standalone` 输出运行 Node，用 Nginx/Caddy 反代到应用端口，TLS 证书绑定 `mysurro.com`，环境变量与上表相同。

---

## 🧪 **更新后测试**

### **1. 访问网站**
打开你的 Vercel 部署URL，例如：
```
https://your-admin-dashboard.vercel.app
```

### **2. 测试导航**
- ✅ 点击 "Applications" 标签 - 应该显示现有的申请管理
- ✅ 点击 "Events" 标签 - 应该显示新的事件管理
- ✅ 查看Dashboard统计 - 显示Applications和Events的汇总

### **3. 测试功能**
- ✅ **Applications**: 批准/拒绝申请
- ✅ **Events**: 创建/编辑/删除事件
- ✅ **统计数据**: 查看实时统计

---

## 📱 **与手机端的同步**

更新部署后：
1. **管理员**可以在网页上创建/管理事件
2. **用户**会在手机App的Events页面看到新事件
3. **实时同步**：网页端的更改立即反映在手机端

---

## 🔧 **故障排除**

### **如果看不到Events页面**
1. 检查 `/events` 路径是否可访问
2. 确认 Supabase 环境变量设置正确
3. 查看浏览器控制台的错误信息

### **如果统计数据不显示**
1. 确认已运行 `supabase_events_setup.sql`
2. 检查 Supabase 数据库连接
3. 验证RLS权限设置

### **如果应用无法加载**
1. 检查构建日志中的错误
2. 确认所有依赖已正确安装
3. 重新部署项目

---

## 📂 **文件结构**

更新后的admin-dashboard结构：
```
admin-dashboard/
├── app/
│   ├── page.tsx           # Dashboard首页 (Applications + 统计)
│   ├── events/
│   │   ├── page.tsx       # Events管理页面
│   │   └── EventForm.tsx  # 事件创建/编辑表单
│   └── layout.tsx         # 包含导航的布局
├── components/
│   ├── Navigation.tsx     # 统一导航组件
│   ├── DashboardStats.tsx # 统计数据组件
│   └── ApproveButton.tsx  # 原有的批准按钮
└── lib/
    └── supabaseClient.js  # Supabase配置
```

---

现在你的后台管理系统功能更完整了！🎉









































