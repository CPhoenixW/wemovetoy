# WEMOVE SPORTS

WEMOVE SPORTS 是一个供 6 人课程小组协作开发的玩具品牌网站项目。当前集成版本包含认证、用户、JWT、三角色权限、PostgreSQL + Prisma、商品、购物车、订单和经销商模块。

## 当前范围

- 后端：NestJS、TypeScript、PostgreSQL、Prisma、Swagger。
- 已实现：健康检查、注册、登录、当前用户查询、`USER` / `DEALER` / `ADMIN` 角色基础设施，商品浏览与管理 API，经销商申请/审批，购物车和订单基础流程。
- 前端：Next.js 工程、登录页和产品页面骨架；业务页面由前端成员继续接入真实 API。

购物车价格、订单商品快照与库存校验仍待商品域和交易域共同完成；支付、图片上传和完整后台页面不在当前集成范围。详细边界见 [开发文档](docs/开发文档.md)。

完整目录骨架、模块职责、阶段计划与验收标准见[项目架构与迭代路线图](docs/项目架构与迭代路线图.md)。

## 快速启动

前置条件：Docker Desktop、Node.js（建议当前 LTS）和 npm。请从仓库根目录执行：

```bash
cp .env.example .env
docker compose up -d
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

启动后可访问：

- API 健康检查：`http://localhost:3000/api/v1/health`
- Swagger：`http://localhost:3000/api/docs`

如果修改了 `.env` 中的 `PORT`，以上 URL 的端口也相应变化。完整的排障、迁移和联调步骤见 [使用文档](docs/使用文档.md)。

## 前端启动

后端运行后，另开一个终端执行：

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

前端默认地址为 `http://localhost:3001`，使用根目录后端的 `http://localhost:3000/api/v1`。目前提供产品路由和登录骨架；商品页面将在商品 API 完成后接入真实数据。

## 团队入口

- [开发文档](docs/开发文档.md)：模块归属、接口约定、迁移与 Git 协作规范。
- [使用文档](docs/使用文档.md)：本地安装、运行、测试、Swagger 与种子账号。
- [项目架构与迭代路线图](docs/项目架构与迭代路线图.md)：全项目骨架、分工与后续开发顺序。
- [团队职责与协作流程](docs/团队职责与协作流程.md)：六名成员的交付边界、依赖和验收责任。

不要提交 `.env`、真实令牌、数据库备份或任何包含真实密码的数据。
