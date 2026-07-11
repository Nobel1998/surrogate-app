# Play Console 操作清单（按顺序勾选）

配合 [GOOGLE_PLAY.md](./GOOGLE_PLAY.md) 使用。AAB 已构建完成，以下步骤需在 Google Play Console 手动完成。

## 1. 创建 App

- [ ] https://play.google.com/console → Create app
- [ ] 名称：Surrogate Agency USA
- [ ] 包名将在**首次上传 AAB 时**绑定为 `com.surrogateagencyusa`

## 2. 部署合规页面（mysurro.com）

部署 `admin-dashboard` 后确认可访问：

- [ ] https://mysurro.com/privacy-policy
- [ ] https://mysurro.com/delete-account

## 3. 首次上传 AAB（Internal testing）

- [ ] 下载 AAB：https://expo.dev/artifacts/eas/mjM7YjLZfcGyviFeYe7pN833QwPx8dYOd1T5q8CVhMk.aab
- [ ] Play Console → Testing → Internal testing → Create release
- [ ] Upload AAB → Release notes → Review → Start rollout

## 4. App content（Dashboard 待办）

- [ ] Privacy policy URL
- [ ] Account deletion URL
- [ ] Data safety（参考 GOOGLE_PLAY.md 表格）
- [ ] Content rating（IARC）
- [ ] Target audience（18+）
- [ ] App access（测试账号 + 登录说明）

## 5. Store listing

- [ ] App icon 512×512
- [ ] Feature graphic 1024×500
- [ ] 手机截图 ≥2 张（`admin-dashboard/public/screenshots/`）
- [ ] Short / Full description（文案见 GOOGLE_PLAY.md）

## 6. Internal testing 真机验证

- [ ] 添加测试人员 Gmail
- [ ] 安装并验证：登录、核心功能、Delete Account

## 7. Production 提交

- [ ] Production → Create release → 同一或更新 AAB
- [ ] Send for review

## 8. 上架后（可选）

- [ ] `app.json` 已含 `android.playStoreUrl`
- [ ] 配置 EAS Submit Service Account 后：`npm run eas:submit:android`
