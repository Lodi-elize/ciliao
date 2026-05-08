# 次聊后端 Docker 部署

当前部署方式把 Spring Boot jar 作为文件挂载到容器内：

```text
../../apps/server/target/server-0.0.1-SNAPSHOT.jar -> /app/server.jar
```

这样 Docker 镜像只需要在首次部署或 Dockerfile 变化时重建。以后更新后端代码，只要替换 jar 并重启容器。

## 本地打包 jar

```powershell
cd E:\workPlace\次聊\apps\server
.\mvnw.cmd clean package -DskipTests
```

生成：

```text
apps/server/target/server-0.0.1-SNAPSHOT.jar
```

## 首次部署

把上传包放到服务器，例如：

```text
/opt/ciliao/
  apps/server/Dockerfile
  apps/server/target/server-0.0.1-SNAPSHOT.jar
  deploy/server/docker-compose.yml
  deploy/server/.env
```

服务器执行：

```bash
cd /opt/ciliao/deploy/server
cp .env.example .env
nano .env
docker compose up -d --build
```

## 后续更新

本地重新打包 jar 后，只覆盖服务器文件：

```text
/opt/ciliao/apps/server/target/server-0.0.1-SNAPSHOT.jar
```

然后服务器执行：

```bash
cd /opt/ciliao/deploy/server
docker compose restart ciliao-server
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

成功返回：

```json
{"ok":true}
```

## 注意

- `.env` 只放服务器，不要提交真实密码。
- Flyway 迁移会在后端启动时自动执行。
- APK 不包含后端，手机 App 只是连接 `http://122.51.23.38:4000`。
