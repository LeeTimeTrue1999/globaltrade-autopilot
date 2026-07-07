# 部署方案

## 1. 推荐环境

### 本地开发

用于开发和测试：

```text
Node.js
Docker Desktop
PostgreSQL Docker 容器
Redis Docker 容器
```

### 内部服务器

用于 2-10 人共享：

```text
Ubuntu LTS / Debian
Docker
Docker Compose
Nginx 或 Caddy
PostgreSQL
Redis
应用服务
```

### 生产环境

用于长期运营：

```text
应用服务器
托管 PostgreSQL
Redis
对象存储
日志系统
监控告警
备份系统
```

## 2. 单台服务器 Docker Compose 目标结构

```text
server
  |-- nginx/caddy
  |-- web
  |-- api
  |-- worker
  |-- postgres
  |-- redis
  |-- minio optional
```

服务说明：

| 服务 | 作用 | 是否必须 |
| --- | --- | --- |
| web | 前端页面 | 必须 |
| api | 后端 API | 必须 |
| worker | 定时任务和同步任务 | MVP 后期必须 |
| postgres | 主数据库 | 必须 |
| redis | 缓存和任务队列 | 平台同步后必须 |
| minio | 本地对象存储 | 可选 |
| nginx/caddy | HTTPS 和反向代理 | 共享使用必须 |

## 3. 域名和 HTTPS

多人共享时建议准备域名：

```text
trade.yourcompany.com
```

HTTPS 必须开启。没有 HTTPS 时不要传输：

- 登录密码。
- 平台 API Key。
- 订单数据。
- 买家信息。

## 4. 网络策略

公网只开放：

```text
80
443
```

SSH：

```text
22 仅允许管理员 IP 或 VPN
```

不开放公网：

```text
5432 PostgreSQL
6379 Redis
9000 MinIO
```

## 5. 部署前检查清单

上线前必须确认：

- 域名已解析。
- HTTPS 可用。
- 管理员账号已创建。
- 默认密码已修改。
- 数据库不能公网访问。
- Redis 不能公网访问。
- `.env` 不在前端目录。
- 备份脚本已运行成功。
- 恢复流程至少演练一次。
- 审计日志已启用。

## 6. 推荐目录

服务器上建议：

```text
/opt/globaltrade/
  docker-compose.yml
  .env
  data/
    postgres/
    redis/
    minio/
  backups/
    postgres/
  logs/
```

注意：

- `.env` 权限只给部署用户读取。
- `backups/` 建议同步到另一台机器或对象存储。
- `logs/` 需要定期清理。

## 7. 发布流程

MVP 可先使用手动发布：

1. 本地测试通过。
2. 打包前端和后端。
3. 上传服务器。
4. 执行数据库迁移。
5. 重启服务。
6. 检查健康接口。
7. 检查前端页面。
8. 检查任务队列。

正式版建议 CI/CD：

1. 提交代码。
2. 自动测试。
3. 构建镜像。
4. 推送镜像仓库。
5. 服务器拉取镜像。
6. 滚动更新。
7. 失败自动回滚。

## 8. 备份和恢复

### 备份频率

建议：

- 每日凌晨数据库全量备份。
- 重要配置变更前手动备份。
- 每周保留长期备份。

### 恢复要求

必须能回答：

- 最近一次备份在哪里？
- 谁能恢复？
- 恢复到新服务器需要多久？
- 恢复后如何验证数据完整？

## 9. 监控和告警

MVP 告警方式可以先用邮件、企业微信或飞书。

最少告警项：

- Web 服务不可用。
- API 服务不可用。
- 数据库连接失败。
- 磁盘使用超过 80%。
- 备份失败。
- 平台同步任务连续失败。

## 10. 多人使用上线门槛

只有满足以下条件，才建议给团队使用：

- 登录权限完成。
- 角色权限完成。
- 审批流完成。
- 审计日志完成。
- 数据库持久化完成。
- 自动备份完成。
- HTTPS 完成。
- 管理员操作有记录。

