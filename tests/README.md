# 跨模块测试

后端模块内部单元测试与源码同目录维护。本目录由成员 6 维护，用于跨模块 API 集成测试和端到端测试。

优先覆盖：认证、权限越权、商品浏览、购物车、下单、经销商申请和企业数据隔离。测试只能使用独立的测试数据库，不能连接本地开发或生产数据库。

## 当前自动化

`api-smoke.test.mjs` 使用 Node.js 内置测试运行器和 `fetch`，不增加项目依赖。当前覆盖：

- 健康检查、Swagger、统一响应结构；
- 匿名商品列表与详情；
- 注册、登录、当前用户；
- 未登录 401、普通用户越权 403、管理员和经销商角色；
- 空购物车与空购物车下单；
- 经销商申请、管理员审批、角色更新和企业数据隔离。

完整“加入购物车 -> 创建订单”依赖商品 SKU/Variant 种子数据、服务端价格和库存接口稳定后再启用，不能用零价格占位逻辑冒充通过。

## 本地运行

先准备独立数据库 `wemove_test`，并在该数据库应用迁移和种子数据。测试后端建议运行于 3100 端口：

```powershell
cd backend
$env:DATABASE_URL="postgresql://wemove:wemove_dev_password@localhost:5432/wemove_test?schema=public"
$env:PORT="3100"
$env:JWT_SECRET="wemove-e2e-local-only-secret"
npm run prisma:deploy
npm run prisma:seed
npm run start
```

另开终端，从仓库根目录执行：

```powershell
$env:E2E_BASE_URL="http://localhost:3100/api/v1"
node --test tests/api-smoke.test.mjs
```

不要把本测试指向共享开发、演示或生产环境；测试会注册临时用户、创建购物车和经销商申请。
