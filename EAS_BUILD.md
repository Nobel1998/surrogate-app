# EAS 构建与远程测试

项目已配置 EAS，使用 **preview** 配置（内部分发），方便远程用户通过链接安装测试。

## 两个概念别搞混

| 位置 | 是什么 | 如何出现“最新” |
|------|--------|------------------|
| **Branches → preview**（你打开的页面） | **EAS Update（OTA）** 的更新记录，不是安装包 | 执行一次 `npm run eas:update` 发布到 preview 分支，该页面就会显示这条更新 |
| **Builds**（项目左侧菜单） | 原生安装包（.ipa / .apk）列表 | 执行 `npm run eas:build` 完成构建后，在 **Builds** 里能看到最新构建和下载链接 |

所以：**在 https://expo.dev/.../branches/preview 看不到最新版本** 是正常的，除非你发布过 OTA 更新。要看到“最新版本”可以：

- **只看安装包**：到同一项目下 **Builds** 里看最新一次构建。
- **让 preview 分支有记录**：在项目根目录执行 `npm run eas:update`（会发布当前代码到 preview 分支，之后 branches/preview 页面会显示这次更新）。

## 上传最新版本到 EAS（方便远程用户测试）

**必须在本地终端交互执行**（EAS 需要交互式配置 iOS 证书 / Android Keystore，无法在非交互模式完成）。

1. **登录 EAS**（若未登录）：
   ```bash
   npx eas login
   ```

2. **执行构建**（会提示选择/生成凭证，按提示操作即可）：
   ```bash
   npm run eas:build
   ```
   即：`eas build --profile preview --platform all`
   - 首次 **Android**：会提示生成 Keystore，选 “Generate new keystore” 即可，之后会保存在 EAS 云端。
   - 首次 **iOS**：会提示配置内部分发证书/描述文件，按提示选择 “Let EAS manage” 即可。

   或分别构建：
   - 仅 iOS：`npm run eas:build:ios`
   - 仅 Android：`npm run eas:build:android`

3. 构建完成后，在 [Expo Dashboard](https://expo.dev) 对应项目 → **Builds** 中可看到构建记录，点进某次构建即可获得：
   - **Android**：APK 下载链接或二维码
   - **iOS**：安装链接（内部分发，测试用户在设备 Safari 打开链接即可安装）

把对应链接或二维码发给远程测试用户即可安装测试。

## 发布 OTA 更新（让 Branches → preview 显示最新）

若希望 [Branches → preview](https://expo.dev/accounts/nobel1998/projects/surrogateagencyusa/branches/preview) 页面上出现“最新版本”记录，需要把当前 JS 包发布到该分支：

```bash
npm run eas:update
```

按提示输入本次更新的说明（或直接回车）。发布成功后，branches/preview 页面会显示这条更新。已安装过 preview 构建的用户，打开 app 时会自动拉取这次 OTA 更新（无需重新安装）。

## 配置说明

- **app.json**：已设置 `expo.android.package`（`com.surrogateagencyusa`），满足 EAS 非交互构建要求。
- **eas.json**：`preview` 使用 `distribution: "internal"`，无需上架商店即可分发给测试用户。
