# WEMOVE 前端

这是可运行的 Next.js App Router + TypeScript 前端基础工程，默认运行在 `http://localhost:3001`，通过 `NEXT_PUBLIC_API_BASE_URL` 调用 Nest API。

## 启动

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

已提供：公共布局、产品路由、登录页、类型化 API Client 和 API 响应类型。登录页可以调用当前后端 `POST /api/v1/auth/login`；令牌仅以开发骨架形式保存在 `sessionStorage`，生产版需在认证方案评审后改为 HttpOnly Cookie 或受控会话方案。

成员 4 负责公开官网和用户中心，成员 5 负责经销商中心、Admin 前端和共享设计系统。详细职责见 [团队职责与协作流程](../docs/团队职责与协作流程.md)。
