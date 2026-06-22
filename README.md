# Assert Workspace

当前仓库已升级为多项目结构：

- `assert_PLATFORM`：后端平台、MySQL schema、发布清单接口、后续同步服务
- `assert_WEB`：主 Web 端，包含产品下载页
- `assert_PC`：Windows 客户端骨架
- `assert_ANDROID`：Android 客户端骨架
- `assert_IOS`：iOS 客户端骨架
- `assert_HARMONY`：HarmonyOS 客户端骨架
- `packages`：共享清单格式与后续协议

## 本地启动

在仓库根目录执行：

```powershell
npm run api
```

```powershell
npm run web
```

默认地址：

- Web：`http://127.0.0.1:4173`
- API：`http://127.0.0.1:3000`

## 安装包发布

服务器发布目录默认使用：

- `/opt/assert-releases/web`
- `/opt/assert-releases/pc`
- `/opt/assert-releases/android`
- `/opt/assert-releases/ios`
- `/opt/assert-releases/harmony`

本地开发默认使用：

- `assert_PLATFORM/releases/<platform>/`

发布一个新安装包：

```powershell
npm run release:publish -- --platform=pc --file=F:\builds\Assert_PC_Setup.exe --version=2.1.0 --build=20260617.1 --notes="修复同步与下载页"
```

发布后，`assert_PLATFORM/releases/<platform>/manifest.json` 会自动更新，Web 端“产品下载页”刷新后即可看到最新包。

## GitHub 推送

首次或换机器时：

```powershell
npm run push:setup
```

日常推送：

```powershell
npm run push:github -- "这里写提交说明"
```
