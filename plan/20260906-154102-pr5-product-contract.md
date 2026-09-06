# PR #5 商品与 SKU 契约收敛计划

## 已确认目标

- 将 PR #5（`fix/products-public-variant`）补齐至 `docs/接口契约与联调标准.md` 第 3 节要求，并保留公开详情 SKU 脱敏修复。
- 通过本地和 GitHub CI 验证后，PR 应不再存在商品/SKU 范围内的阻塞项；本次不合并 PR，也不改动成员 3 的购物车/订单实现分支。

## 现状与约束

- 当前 PR 已有公开详情 SKU DTO，但 SKU 单件和批量接口仍允许匿名或泄露内部字段；`check-stock` 仍对外暴露。
- 公开商品查询仍复用含 `status` 的查询 DTO；Dealer 商品目录没有独立 DTO 或 SKU 视图。
- `ProductsModule` 已导出 `VariantsService`，但 `getPurchasableVariant` 的 audience、异常、价格类型与返回字段不符合契约。
- 数据库模型和迁移已满足本次需求，不新增迁移。购物车和订单的依赖接入由 `feature/cart-order-catalog-integration` 消费新的服务契约。

## 实施步骤

1. 为公开商品查询、公开商品列表、Dealer 商品和受认证 SKU 查询定义独立 DTO，白名单化响应字段。
2. 调整商品查询服务：公开列表拒绝 `status` 查询并只返回 ACTIVE 商品；Dealer 目录固定 ACTIVE、返回零售价/Dealer 价及可售 SKU；后台继续保留完整管理视图。
3. 重构 SKU 服务：提供导出的 `PriceAudience`、`PurchasableVariant` 和严格的 `getPurchasableVariant(variantId, audience)`；不存在抛 404，不可售抛 400，金额保留 Prisma Decimal 供交易模块使用。
4. 调整 SKU Controller：单件和批量接口要求 JWT，按调用者角色生成最小响应；移除公开库存探测路由；保留 Admin SKU 管理入口。
5. 扩展单元与 API 冒烟测试，覆盖公开字段隔离、公开 `status` 查询拒绝、匿名 SKU 查询 401、Dealer/普通用户价格差异、批量响应和不可售 SKU。
6. 运行 Prisma 校验、ESLint、Jest、构建、数据库迁移/种子和 API 冒烟；复核完整差异后提交并推送至 PR #5，等待 GitHub CI。

## 验收与风险

- 所有公开商品和公开 SKU 响应均不含 `dealerPrice`、`stock`、`reserved`、`status` 等内部字段。
- SKU 的真实价格和库存只能从导出的内部服务读取；Controller 不暴露库存检查能力。
- Dealer DTO 的 `unitPrice` 使用 Dealer 价并在缺失时回退零售价；可售库存不为负数。
- 风险：下游购物车/订单分支当前仍调用占位实现，必须在本 PR 合入后按新 `RETAIL` / `DEALER` 契约更新后再合并。
- 回滚：回退本 PR 新增提交即可恢复当前行为；不涉及数据库数据结构变更。
