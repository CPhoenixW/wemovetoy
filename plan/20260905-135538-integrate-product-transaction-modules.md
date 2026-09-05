# 商品与交易模块集成计划

## 目标

以 `develop` 为基线合并 `develop2`，形成同时包含商品、购物车、订单和经销商模块的可运行集成版本。

## 已确认条件

- 本地 Docker PostgreSQL 容器 `wemove-postgres` 正常运行于 `localhost:5432`。
- `develop` 包含商品模块和商品迁移；`develop2` 包含购物车、订单、经销商模块及其迁移。
- 两分支共同基线为 `118489c`，均修改 Prisma schema、AppModule 和 User 关联。

## 实施与验收

1. 在独立分支合并两条开发分支，保留全部模块与迁移。
2. 合并 Prisma schema、模块注册，并为购物车项、订单项增加 SKU 外键。
3. 对本地 Docker 数据库执行迁移和种子数据，执行后端与前端 CI 等价检查。
4. 启动后端，验证健康检查与 Swagger 可访问。

## 风险与回退

- 本地开发库仅新增表和外键，不删除数据。
- 集成结果只写入 `integration/develop-develop2`，不覆盖 `main`、`develop` 或 `develop2`。
