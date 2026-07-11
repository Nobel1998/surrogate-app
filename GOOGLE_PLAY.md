# Google Play 上架指南 — Surrogate Agency USA

Android 包名（不可修改）：`com.surrogateagencyusa`  
EAS 项目：https://expo.dev/accounts/nobel1998/projects/surrogateagencyusa

## 最新 Production AAB（可直接下载上传）

| 字段 | 值 |
|------|-----|
| 版本 | 1.7.6 (versionCode **6**) |
| Build ID | `8ac4f081-f00c-491a-92d6-bda8f9eb1e10` |
| AAB 下载 | https://expo.dev/artifacts/eas/mjM7YjLZfcGyviFeYe7pN833QwPx8dYOd1T5q8CVhMk.aab |
| Expo Builds 页 | https://expo.dev/accounts/nobel1998/projects/surrogateagencyusa/builds/8ac4f081-f00c-491a-92d6-bda8f9eb1e10 |

重新构建：`npm run eas:build:android:production`

> **构建修复说明**：已移除未使用的 `react-native-push-notification` 依赖（会导致 Gradle 失败）。通知功能仍通过 `RealNotificationService` 模拟/本地 Alert 实现。

## 合规 URL（部署 mysurro.com 后填入 Play Console）

| 用途 | URL |
|------|-----|
| Privacy policy | `https://mysurro.com/privacy-policy` |
| Account deletion | `https://mysurro.com/delete-account` |
| 官网 | `https://mysurro.com` |
| 联系 | `https://babytreesurrogacy.com/contact-us/` |

页面源码：`admin-dashboard/app/privacy-policy/page.tsx`、`admin-dashboard/app/delete-account/page.tsx`

---

## 阶段一：Play Console 创建 App

1. 打开 https://play.google.com/console → **Create app**
2. 填写：
   - App name: **Surrogate Agency USA**
   - Default language: **English (United States)**
   - App or game: **App**
   - Free or paid: **Free**
3. 勾选政策声明 → Create app
4. **Dashboard** 左侧待办全部完成（见下方清单）

### Dashboard 待办清单

- [ ] **App access** — 选「All or some functionality is restricted」；提供测试账号（邮箱+密码）及登录步骤说明
- [ ] **Ads** — 本 App 无广告 → No
- [ ] **Content rating** — 完成 IARC 问卷（涉及健康/医疗信息，如实填写）
- [ ] **Target audience** — 18+；非面向儿童
- [ ] **News app** — No
- [ ] **COVID-19 apps** — No
- [ ] **Data safety** — 见下文「Data safety 填写参考」
- [ ] **Government apps** — No
- [ ] **Financial features** — No（若无应用内支付）
- [ ] **Privacy policy** — `https://mysurro.com/privacy-policy`
- [ ] **Account deletion** — `https://mysurro.com/delete-account`（Data safety 表单内）

---

## 阶段二：Data safety 填写参考

| 数据类型 | 收集 | 用途 | 是否共享 |
|----------|------|------|----------|
| Email address | 是 | 账号、通信 | 否（Supabase 为处理器） |
| Name | 是 | 账号、服务 | 否 |
| Phone number | 是 | 联系 | 否 |
| Health info | 是 | 代孕申请、医疗记录 | 否 |
| Photos/videos | 是 | Journey、证件 | 否 |
| User IDs | 是 | 认证 | 否 |

- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes**（App 内 Delete Account + 网页说明）
- Account deletion URL: **https://mysurro.com/delete-account**

---

## 阶段三：构建 AAB

```bash
cd /Users/wangxinheng/Desktop/代孕app
npx eas login
npm run eas:build:android:production
```

- 首次选择 **Let EAS manage credentials**（Keystore 存于 EAS）
- 产物为 **.aab**（非 APK）
- 构建完成后：Expo Dashboard → Builds → 下载 AAB

---

## 阶段四：首次上传（必须手动）

Google 要求**第一次**在 Play Console 手动上传 AAB：

1. Play Console → **Testing → Internal testing**
2. **Create new release** → Upload → 选择 EAS 下载的 `.aab`
3. Release name: `1.7.6 (1)`（或当前 versionCode）
4. Release notes（英文示例）：

```
- Initial Google Play release
- Member portal for surrogacy journey, documents, and matching
- In-app account deletion (User Center → Delete Account)
```

5. **Save** → **Review release** → **Start rollout to Internal testing**

---

## 阶段五：Store listing

路径：**Grow → Store presence → Main store listing**

### 文案（可直接粘贴）

**Short description**（≤80 字符）：

```
Member app for Babytree Surrogacy clients—journey updates, docs & matching.
```

**Full description**：

```
Surrogate Agency USA (MySurro) is the official member app for Babytree Surrogacy agency clients and surrogates already enrolled in our program.

Features:
• Sign in securely to your member account
• Track your surrogacy journey and milestones
• View and manage match-related documents
• Browse agency events and updates
• Apply or update your surrogate application
• Contact support and manage your profile
• Delete your account at any time from User Center

This app is intended for existing and prospective members working with Babytree Surrogacy. An account is required for most features.

Questions? Visit https://babytreesurrogacy.com/contact-us/
```

**Category**: Medical（或 Lifestyle，与描述一致即可）

### 图形素材

| 素材 | 尺寸 | 说明 |
|------|------|------|
| App icon | 512×512 PNG | 无透明通道；可用 `assets/icon.png` 导出 |
| Feature graphic | 1024×500 | 横幅，展示品牌 + 一句标语 |
| Phone screenshots | 至少 2 张 | 复用 iOS 已过审截图（真实 UI，非仅启动页） |

截图路径参考：`admin-dashboard/public/screenshots/`

---

## 阶段六：Internal testing

1. **Testing → Internal testing → Testers** → 创建邮件列表，添加测试人员 Gmail
2. 复制 **opt-in link** 发给测试者
3. 验证清单：
   - [ ] 注册 / 登录
   - [ ] 核心 Tab 可访问
   - [ ] 拍照 / 选图上传
   - [ ] User Center → Delete Account 两步确认并成功删除
   - [ ] Supabase 后端连接正常（无 fetch failed）

---

## 阶段七：Production 发布

1. Internal 测试通过后 → **Production → Create new release**
2. 上传同一 AAB 或更新构建（versionCode 递增）
3. 确认 Dashboard 全部绿色 ✓
4. **Send for review**

审核通过后，Play Store 链接：

`https://play.google.com/store/apps/details?id=com.surrogateagencyusa`

（已在 `app.json` 的 `android.playStoreUrl` 预配置）

---

## EAS Submit 自动化（第二次发版起）

1. [Google Service Account 指南](https://docs.expo.dev/submit/android/#creating-a-google-service-account)
2. Play Console → Users and permissions → 邀请 Service Account（Release manager）
3. `eas credentials` 上传 JSON key
4. 提交：

```bash
npm run eas:submit:android
# 或构建并自动提交：
eas build --platform android --profile production --auto-submit
```

`eas.json` 中 `track: internal` 用于测试；正式版改为 `production`。

---

## 测试账号模板（App access）

```
Email: [提供测试邮箱]
Password: [提供测试密码]

Steps:
1. Open the app
2. Tap Sign In
3. Enter the credentials above
4. Main tabs (Journey, Match, Events, Profile) are available after login
```

---

## 常见问题

**包名能否修改？** 不能。Play Console 创建后 `com.surrogateagencyusa` 永久绑定。

**Keystore 丢失？** 使用 EAS 管理的 Keystore，勿删除 EAS 项目凭证。

**与 iOS 版本号** 可共用 `app.json` 的 `version`（如 1.7.6）；Android `versionCode` 由 EAS `autoIncrement` 管理。
