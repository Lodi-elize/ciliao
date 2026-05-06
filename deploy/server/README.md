# 次聊后端 Docker 部署

本目录用于把 Spring Boot 后端部署到服务器 Docker。不要把真实 `.env` 提交到仓库。

## 1. 本地打包 jar

在项目根目录执行：

```powershell
cd E:\workPlace\次聊\apps\server
.\mvnw.cmd clean package -DskipTests
```

确认生成：

```text
apps/server/target/server-0.0.1-SNAPSHOT.jar
```

## 2. 上传到服务器

把这些内容上传到服务器同一个目录，例如 `/opt/ciliao`：

```text
apps/server/Dockerfile
apps/server/target/server-0.0.1-SNAPSHOT.jar
deploy/server/docker-compose.yml
deploy/server/.env.example
```

服务器目录建议：

```text
/opt/ciliao/
  apps/server/Dockerfile
  apps/server/target/server-0.0.1-SNAPSHOT.jar
  deploy/server/docker-compose.yml
  deploy/server/.env
```

## 3. 创建 .env

在服务器上：

```bash
cd /opt/ciliao/deploy/server
cp .env.example .env
nano .env
```

把 `SPRING_DATASOURCE_PASSWORD` 改成真实密码。

## 4. 启动 Docker 服务

```bash
cd /opt/ciliao/deploy/server
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f ciliao-server
```

验证：

```bash
curl http://127.0.0.1:4000/health
curl http://122.51.23.38:4000/health
```

应返回：

```json
{"ok":true}
```

## 5. 放行端口

服务器系统防火墙：

```bash
sudo ufw allow 4000/tcp
```

云服务器安全组也要放行：

```text
入站 TCP 4000
来源 0.0.0.0/0
```

## 6. 更新后端版本

本地重新打包 jar，上传覆盖服务器的：

```text
/opt/ciliao/apps/server/target/server-0.0.1-SNAPSHOT.jar
```

然后服务器执行：

```bash
cd /opt/ciliao/deploy/server
docker compose up -d --build
```

## 注意

- APK 不包含后端，手机 App 只是连接 `http://122.51.23.38:4000`。
- MySQL 密码只放服务器 `.env`，不要写入移动端或仓库。
- 当前第一版使用 HTTP IP + 端口，后续正式使用建议加域名、HTTPS 和 Nginx。
