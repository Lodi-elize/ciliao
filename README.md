# 次聊 NFC Chat Prototype ✨

次聊是一个用于验证 NFC 加好友和一对一聊天流程的移动端原型项目。项目包含一个 Expo / React Native App 和一个 Spring Boot 后端服务，支持账号登录、手机号 mock 注册、账户资料、好友搜索、好友申请、通讯录、实时消息、NFC invite payload、NFC 读取事件记录和手动 invite fallback。目标是让“碰一下就发起好友申请，对方同意后开始聊天”这条主链路跑得轻快又清楚。

## 项目结构 🧭

```text
.
├── apps
│   ├── mobile          # Expo / React Native 移动端
│   └── server          # 后端服务，包含 Spring Boot 主实现和早期 Node 原型
├── docs                # 运行和调试文档
├── scripts             # 本地辅助脚本
├── package.json        # npm workspace 入口
└── README.md
```

## 技术栈 🛠️

- 移动端：Expo 54、React Native 0.81、React 19、Zustand、AsyncStorage、react-native-nfc-manager
- 后端主实现：Spring Boot 3.5、Spring Web、Spring Security、Spring Data JPA、WebSocket、Flyway
- 后端原型实现：Node.js、Fastify、Socket.IO、Zod，保留在 `apps/server/src`
- 数据存储：Spring Boot 默认使用本地 H2 文件数据库，生产部署可通过环境变量连接 MySQL
- 测试：Vitest
- 类型检查：TypeScript

## 功能范围 🎯

已包含：

- ✅ 用户名 + 密码注册和登录
- ✅ 手机号 + mock 短信验证码注册
- ✅ 自动登录、退出登录、修改密码
- ✅ 账户资料、昵称、个性签名和头像设置
- ✅ 通讯录和双向好友关系
- ✅ username / userId / 手机号搜索用户
- ✅ 发送、同意、拒绝好友申请
- ✅ NFC invite 发起好友申请
- ✅ NFC 读取事件记录，便于后续统计和排查
- ✅ 手动 invite fallback，便于模拟器、浏览器和无 NFC 设备调试
- ✅ 登录恢复后自动刷新联系人、待处理申请和聊天记录
- ✅ 一对一文字聊天
- ✅ Socket.IO 实时消息推送

暂不包含：

- 🚧 真实短信服务
- 🚧 生产级数据库备份和迁移运维
- 🚧 后台管理系统
- 🚧 密码找回
- 🚧 第三方登录
- 🚧 群聊、图片消息、语音消息
- 🚧 生产级安全、风控和审计

## 本地环境准备 🚀

安装依赖：

```bash
npm install
```

运行 Node 原型后端：

```bash
npm run dev:server
```

后端默认监听：

```text
http://localhost:4000
```

健康检查：

```text
http://localhost:4000/health
```

运行移动端开发服务器：

```bash
npm --workspace apps/mobile run start
```

运行 Spring Boot 后端：

```powershell
cd apps/server
.\mvnw.cmd spring-boot:run
```

Spring Boot 后端同样默认监听：

```text
http://localhost:4000
```

运行 Android 开发构建：

```bash
npm --workspace apps/mobile run android
```

运行 iOS 开发构建：

```bash
npm --workspace apps/mobile run ios
```

## 测试账号 🧪

首次启动后端时，如果数据文件不存在，会自动创建 3 个 seed 测试账号：

| 用户名 | 密码 | 昵称 |
| --- | --- | --- |
| `alice` | `password123` | 小爱 / 星野 |
| `bob` | `password123` | 小波 / 月见 |
| `mika` | `password123` | 米卡 / 初音 |

后端启动时会在空数据源中写入这些 seed 用户。默认好友关系通常用于测试：

- `alice` 和 `bob` 互为好友
- `mika` 和 `bob` 互为好友

## 数据库和数据存储 🗄️

当前项目有两套后端形态：

1. Spring Boot 主实现
2. Node.js 早期原型实现

Spring Boot 主实现默认数据库连接配置在：

```text
apps/server/src/main/resources/application.properties
```

默认使用 H2 文件数据库：

```text
jdbc:h2:file:./data/ciliao-dev
```

生产部署时可以通过环境变量切换到 MySQL：

```text
SPRING_DATASOURCE_URL=jdbc:mysql://服务器地址:3307/calloDB?useSSL=false&serverTimezone=Asia/Shanghai
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=你的密码
SPRING_DATASOURCE_DRIVER=com.mysql.cj.jdbc.Driver
```

数据库表结构由 Flyway 迁移管理：

```text
apps/server/src/main/resources/db/migration
```

当前迁移包含：

| 文件 | 说明 |
| --- | --- |
| `V1__initial_chat_schema.sql` | 初始用户、联系人、会话和消息表 |
| `V2__add_user_signature.sql` | 用户个性签名 |
| `V3__add_nfc_read_events.sql` | NFC 读取事件记录 |
| `V4__add_friend_requests.sql` | 好友申请和申请状态 |

Node.js 原型后端仍保留本地 JSON 文件存储：

```text
apps/server/data/prototype-store.json
```

里面保存：

- 用户资料
- 密码哈希
- 登录 session
- mock 短信验证码
- 好友关系
- 聊天消息

Node 原型可以通过环境变量覆盖数据文件路径：

```powershell
$env:NFC_CHAT_DATA_PATH="E:\somewhere\prototype-store.json"
npm run dev:server
```

重置 Node 原型本地数据：

```text
删除 apps/server/data/prototype-store.json
```

下次启动 Node 原型后端时会重新生成 seed 用户。Spring Boot 后端的数据重置取决于当前使用的 H2 或 MySQL 数据库。

## 后端接口概览 🔌

常用接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `GET` | `/users` | 查看用户列表 |
| `POST` | `/auth/register/username` | 用户名注册 |
| `POST` | `/auth/mock-sms/request` | 请求 mock 短信验证码 |
| `POST` | `/auth/register/phone` | 手机号注册 |
| `POST` | `/auth/login` | 登录 |
| `GET` | `/auth/me` | 获取当前登录用户 |
| `POST` | `/auth/logout` | 退出登录 |
| `POST` | `/auth/change-password` | 修改密码 |
| `GET` | `/contacts` | 获取通讯录 |
| `POST` | `/contacts` | 直接添加好友（保留接口） |
| `GET` | `/invites/:userId` | 查看邀请用户 |
| `POST` | `/friend-search` | 通过 username、userId 或手机号搜索用户 |
| `GET` | `/friend-requests/incoming` | 获取待处理好友申请 |
| `POST` | `/friend-requests` | 创建好友申请 |
| `POST` | `/friend-requests/:requestId/accept` | 同意好友申请并建立双向好友关系 |
| `POST` | `/friend-requests/:requestId/reject` | 拒绝好友申请 |
| `POST` | `/nfc/read-events` | 记录 NFC 读取事件 |
| `GET` | `/messages/:contactId` | 获取聊天记录 |
| `POST` | `/messages` | 发送消息 |

需要登录的接口使用 Bearer token：

```text
Authorization: Bearer <token>
```

## NFC Invite Payload 📡

NFC tag 可以写入 NDEF URI 或 text record：

```text
nfcchat://add-friend?userId=bob
```

App 读取 NFC 内容后会解析目标用户，记录一次 NFC 读取事件，并走好友申请流程。对方同意申请后，双方才会出现在彼此通讯录中。测试时也可以直接在 App 里使用手动 invite fallback。新注册用户会生成真实 `user id`，可以用后端返回的用户 id 组成 invite payload。

## 真机运行说明 📱

因为项目使用了 `react-native-nfc-manager`，完整 NFC 功能不能依赖 Expo Go，需要使用 development build 或正式安装包。

## 安装与分发说明 📦

### Android APK

本项目当前稳定 APK 打包脚本会同时产出 debug 和 release 两个安装包：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-apks-stable.ps1
```

输出位置：

```text
apps/mobile/build-output/次聊-debug-stable.apk
apps/mobile/build-output/次聊-release.apk
```

当前 `次聊-release.apk` 适合本地安装测试和交付预览，但 release 构建仍使用 debug keystore 签名。正式上架应用商店前，需要先配置生产 keystore。详细说明见：

```text
docs/android-apk-build-stable.md
```

### iPhone / TestFlight

iPhone 用户不能直接安装 Android APK。面向 iPhone 用户分发时，推荐使用 Apple Developer Program + TestFlight：

1. 注册 Apple Developer Program，通常为 99 美元/年。
2. 在 App Store Connect 创建 App。
3. 使用 EAS Build 或 macOS + Xcode 构建 iOS 包。
4. 上传 build 到 App Store Connect。
5. 在 TestFlight 中创建内部或外部测试组。
6. 通过邮箱邀请测试用户，或创建公开邀请链接。

TestFlight 本身不按测试用户收费，但使用 TestFlight / App Store Connect 分发通常需要 Apple Developer Program。外部测试首次可用前，Apple 可能会进行一次 Beta 审核。每个 TestFlight build 有有效期，过期后需要上传新 build。

Windows 环境推荐使用 EAS 云构建：

```bash
npm install -g eas-cli
eas login
cd apps/mobile
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```

iOS 发布前建议先把移动端 API 地址切换为公网 HTTPS。iOS NFC 需要真机测试，模拟器不能验证 NFC 读卡链路。

如果只是在自己的 iPhone 上调试，可以使用 macOS + Xcode + 免费 Apple Account 侧载开发包，但通常会有设备数和签名有效期限制，不适合普通用户分发。

### HarmonyOS / 鸿蒙

鸿蒙用户需要分情况处理：

- 仍兼容 Android APK 的 HarmonyOS 手机：可以直接安装 `次聊-release.apk`，用户需要允许“安装未知来源应用”。
- HarmonyOS NEXT / 纯血鸿蒙：不能直接安装当前 Android APK，需要单独开发或移植鸿蒙原生版本，并通过 AppGallery Connect、DevEco Studio、ArkTS / HarmonyOS SDK 等链路重新打包分发。

因此短期测试可以先提供 APK 覆盖兼容 Android 的华为设备；如果要覆盖 HarmonyOS NEXT 用户，需要规划独立鸿蒙版本。

### Android 真机 🤖

1. 让电脑和手机连接同一个 Wi-Fi。
2. 查看电脑局域网 IP，例如 `192.168.1.20`。
3. 启动后端并监听局域网。

Node 原型后端：

```powershell
$env:HOST="0.0.0.0"
$env:PORT="4000"
npm run dev:server
```

Spring Boot 后端：

```powershell
$env:PORT="4000"
cd apps/server
.\mvnw.cmd spring-boot:run
```

4. 确认 Windows 防火墙允许 Node.js 访问 4000 端口。
5. 在手机浏览器访问：

```text
http://电脑IP:4000/health
```

看到 `{"ok":true}` 后，说明手机可以访问后端。

6. 用电脑 IP 作为移动端 API 地址重新运行或构建：

```powershell
$env:EXPO_PUBLIC_API_URL="http://电脑IP:4000"
npm --workspace apps/mobile run android
```

项目已有构建产物目录：

```text
apps/mobile/build-output
```

如果使用已有 APK，需要确认它构建时写入的 API 地址能被手机访问。手机上的 `localhost` 指向手机自身，不是开发电脑。

### iOS 真机 🍎

iOS 真机需要 macOS、Xcode 和 Apple 开发者签名。运行前设置后端地址：

```bash
EXPO_PUBLIC_API_URL=http://电脑IP:4000 npm --workspace apps/mobile run ios
```

`apps/mobile/app.json` 已配置 NFC 权限说明和 NDEF entitlements。

## 常用命令 ⚡

```bash
# 安装依赖
npm install

# 启动 Node 原型后端
npm run dev:server

# 启动 Spring Boot 后端
cd apps/server
./mvnw spring-boot:run

# 启动 Expo
npm --workspace apps/mobile run start

# Android 开发构建
npm --workspace apps/mobile run android

# iOS 开发构建
npm --workspace apps/mobile run ios

# Android APK 稳定打包
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-apks-stable.ps1

# 运行所有测试
npm test

# 类型检查
npm run typecheck

# 打包 Spring Boot jar 并准备服务器上传目录
.\scripts\prepare-server-upload.ps1
```

## 验收流程 ✅

1. 启动后端。
2. 启动 App。
3. 使用 `alice / password123` 登录 A 设备。
4. 使用 `bob / password123` 登录 B 设备，或注册一个新账号。
5. A 通过 NFC 或手动 invite 搜索到 B，并发送好友申请。
6. B 在待处理好友申请中同意 A。
7. 确认 A 和 B 通讯录里都出现对方。
8. A 给 B 发送文字消息。
9. B 收到消息并回复。
10. 重启 App，确认自动登录、待处理申请刷新和聊天记录仍然存在。
11. 修改密码后退出登录，确认旧密码失效，新密码可登录。

## 部署建议 🌐

当前项目适合局域网测试和功能验证。如果要长期部署给真实用户使用，建议先完成：

- 增加数据库迁移和备份策略
- 使用 HTTPS 域名部署后端
- 增加生产级认证、限流、日志和错误监控
- 配置真实短信服务
- 为 Android / iOS 使用正式签名和发布渠道

生产环境移动端构建时，应将 API 地址设置为公网 HTTPS 后端：

```bash
EXPO_PUBLIC_API_URL=https://your-domain.com
```

Spring Boot Docker 部署说明在：

```text
deploy/server/README.md
```

本地可以用脚本生成服务器上传目录：

```powershell
.\scripts\prepare-server-upload.ps1
```

生成位置：

```text
deploy/server-upload/ciliao-server-docker
```

## 备注 💬

这是一个面向 NFC 社交聊天流程的原型项目，目标是快速验证登录、加好友、通讯录和实时聊天主链路。当前实现以本地开发和真机测试为主，生产化前需要补齐数据库、安全、运维和应用发布相关能力。
