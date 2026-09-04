# WEMOVE SPORTS 课程项目：1号成员后端基础架构任务说明

## 1. 项目目标

本课程项目基于 WEMOVE SPORTS 玩具品牌网站需求进行精简开发。

当前阶段不追求完整商业平台，而是先搭建一个可以供 6 人团队并行开发的稳定基础框架。

课程版后续主要实现两条业务链：

1. **商品销售链路**
   - Admin 新增商品
   - 官网展示商品
   - 用户加入购物车
   - 生成订单
   - Admin 查看订单

2. **Dealer 经销商链路**
   - 用户提交 Dealer 申请
   - Admin 审核
   - Dealer 登录
   - Dealer 查看专属商品价格

---

# 2. 1号成员定位

1号成员不是“把整个后端写完”，而是：

> **Backend Infrastructure / Authentication / Integration Owner**

核心职责：

- 搭建后端基础架构
- 设计公共数据库结构
- 实现用户、登录、JWT、权限
- 制定 API 和代码规范
- 提供其他后端成员可扩展的模块结构
- 负责数据库 Migration 规范
- 负责后续代码 Review、集成和部署

业务模块边界：

- 1号：`auth`、`users`、`common`
- 2号：`products`、`categories`
- 3号：`cart`、`orders`、`dealers`

---

# 3. 技术栈

## Frontend

- Next.js
- TypeScript

## Backend

- NestJS
- TypeScript

## Database

- PostgreSQL
- Prisma ORM

## Authentication

- JWT
- bcrypt

## API Documentation

- Swagger

## Environment

- Docker / docker-compose

---

# 4. 推荐仓库结构

```text
wemove/
├── frontend/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── filters/
│   │   │   └── dto/
│   │   ├── products/      # 2号开发
│   │   ├── categories/    # 2号开发
│   │   ├── cart/          # 3号开发
│   │   ├── orders/        # 3号开发
│   │   ├── dealers/       # 3号开发
│   │   └── admin/
│   │
│   └── prisma/
│       └── schema.prisma
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# 5. 第一阶段必须完成的基础能力

## 5.1 NestJS 基础项目

完成：

- NestJS 初始化
- `/api` 全局前缀
- CORS
- ValidationPipe
- ConfigModule
- 环境变量读取
- Swagger
- 全局异常处理

增加：

```http
GET /api/health
```

返回示例：

```json
{
  "status": "ok"
}
```

---

# 6. PostgreSQL + Prisma

完成：

- PostgreSQL Docker 服务
- Prisma 初始化
- Prisma Client
- Migration 工作流
- Seed 基础用户

开发环境要求：

```bash
docker compose up -d
npm install
npx prisma migrate dev
npm run start:dev
```

即可启动。

---

# 7. 第一版用户模型

先只实现 3 种角色：

```text
USER
DEALER
ADMIN
```

建议 Prisma 模型：

```prisma
enum UserRole {
  USER
  DEALER
  ADMIN
}

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String?
  role         UserRole @default(USER)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

暂时不要实现复杂 RBAC 表。

---

# 8. Auth 模块

需要完成以下接口。

## 注册

```http
POST /api/auth/register
```

Request：

```json
{
  "email": "user@example.com",
  "password": "12345678",
  "name": "Test User"
}
```

默认：

```text
role = USER
```

---

## 登录

```http
POST /api/auth/login
```

Request：

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

Response：

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "Test User",
      "role": "USER"
    }
  }
}
```

---

## 当前用户

```http
GET /api/auth/me
Authorization: Bearer <token>
```

返回当前用户信息。

---

# 9. 权限系统

实现：

- `JwtAuthGuard`
- `RolesGuard`
- `@Roles()` decorator

示例：

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get()
findAll() {}
```

权限规则：

```text
/api/admin/**     → ADMIN
/api/dealer/**    → DEALER
/api/products/**  → Public
```

测试：

```text
USER → /api/admin/*  => 403
DEALER → /api/dealer/* => 200
未登录 → 受保护接口 => 401
```

---

# 10. API 统一规范

所有成员后续 API 尽量遵守相同格式。

## 成功

```json
{
  "success": true,
  "data": {},
  "message": "success"
}
```

## 错误

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

## 列表分页

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

# 11. 数据库协作规则

其他成员可以继续增加表，但必须通过 Prisma Migration。

禁止：

- 手动直接修改共享数据库表结构
- 删除其他模块字段
- 无 Migration 修改 schema

标准流程：

```bash
# 修改 schema.prisma
npx prisma migrate dev --name add_product_stock

git add .
git commit -m "feat(product): add stock field"
```

其他成员拉取代码后：

```bash
git pull
npx prisma migrate dev
```

---

# 12. 模块边界规则

每个人尽量只修改自己的业务模块。

例如：

```text
1号
auth/
users/
common/

2号
products/
categories/

3号
cart/
orders/
dealers/
```

如果 Order 需要 Product：

不要复制商品查询逻辑。

应该通过：

```ts
ProductsService.findById(productId)
```

调用商品模块能力。

原则：

> **通过 Service / Module 依赖，不跨模块复制业务逻辑。**

---

# 13. Git 协作规范

推荐：

```text
main
└── develop
    ├── feature/auth
    ├── feature/product
    ├── feature/order
    ├── feature/dealer
    └── feature/admin
```

规则：

1. 禁止直接向 `main` 开发
2. 功能完成后提交 PR
3. 至少 1 人 Review 后合入 `develop`
4. `develop` 始终保持可启动
5. 每天至少同步一次 `develop`

Commit 示例：

```text
feat(auth): implement jwt login
feat(product): add product CRUD
fix(dealer): prevent normal users reading dealer price
refactor(common): unify api response
```

---

# 14. 1号成员具体开发顺序

## Day 1：基础工程

完成：

- NestJS 初始化
- PostgreSQL Docker
- Prisma
- `/api/health`
- Swagger
- `.env.example`
- README 启动说明

验收：

```text
NestJS 能运行
PostgreSQL 能连接
Prisma 能 Migration
Swagger 能打开
```

---

## Day 2：User + Auth

完成：

- User Model
- Register
- Login
- bcrypt
- JWT
- `/auth/me`

验收：

```text
注册
↓
登录
↓
获得 token
↓
GET /auth/me
```

---

## Day 3：Role 权限

完成：

- JwtAuthGuard
- RolesGuard
- Roles decorator
- ADMIN / DEALER / USER 测试账号

验收：

```text
USER → admin API = 403
ADMIN → admin API = 200
DEALER → dealer API = 200
```

---

## Day 4：团队交付

完成：

- Swagger 接口说明
- API Response 规范
- Migration 规范
- Git 规范
- Seed Data
- README

合并：

```text
feature/auth
↓
develop
```

到这里，其他 5 人应该可以基于该版本并行开发。

---

# 15. 后续1号成员主要工作

完成基础后端后，不再继续抢其他成员业务。

主要负责：

- Review 2号 Product 代码
- Review 3号 Order / Dealer 代码
- 检查 Prisma Migration
- 解决模块依赖
- 处理权限问题
- 统一 API 风格
- 前后端联调
- Docker
- 部署
- Bug 修复

---

# 16. 第一阶段 Done Definition

只有满足以下条件，才能认为基础框架完成：

- [ ] `docker compose up` 可启动 PostgreSQL
- [ ] Backend 可启动
- [ ] Prisma migration 正常
- [ ] `/api/health` 正常
- [ ] Swagger 正常
- [ ] 用户可注册
- [ ] 用户可登录
- [ ] JWT 正常
- [ ] `/auth/me` 正常
- [ ] USER / DEALER / ADMIN 可区分
- [ ] ADMIN 接口有权限保护
- [ ] DEALER 接口有权限保护
- [ ] `.env.example` 完整
- [ ] README 包含启动方式
- [ ] 其他成员拉代码即可开始开发

---

# 17. Codex 当前执行目标

请优先完成 **后端基础架构**，不要实现 Product、Order、Dealer 的完整业务。

Codex 当前任务：

```text
Phase 1
├── Initialize NestJS project
├── Configure PostgreSQL + Prisma
├── Add Docker Compose
├── Implement User model
├── Implement register/login
├── Implement JWT authentication
├── Implement USER/DEALER/ADMIN roles
├── Implement JwtAuthGuard
├── Implement RolesGuard
├── Add Swagger
├── Add health endpoint
├── Add global validation/error handling
├── Add seed users
├── Add README
└── Ensure project can be extended by other developers
```

重点要求：

1. 模块化设计
2. 不提前实现其他成员业务
3. 保持代码清晰、可扩展
4. 所有数据库修改必须通过 Prisma Migration
5. Swagger 能直接查看接口
6. 项目启动方式简单明确
7. `develop` 分支始终保持可运行

---

# 18. 给 Codex 的一句话任务

> 为 WEMOVE SPORTS 课程版玩具销售网站搭建一个可供多人并行开发的 NestJS + PostgreSQL + Prisma 后端基础框架，实现 User、JWT Authentication、USER/DEALER/ADMIN 权限、Swagger、Docker、Migration、统一 API/异常处理和完整 README；暂时不要实现 Product、Cart、Order、Dealer 等具体业务，只为后续模块提供稳定、模块化、可扩展的基础设施。
