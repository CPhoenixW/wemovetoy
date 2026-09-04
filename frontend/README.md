# Frontend 骨架

本目录预留给成员 4 创建 Next.js + TypeScript 应用。建议采用 App Router，并在实际初始化后将页面放入 `src/app/`、可复用组件放入 `src/components/`、API 客户端放入 `src/lib/api/`。

前端只通过 `NEXT_PUBLIC_API_BASE_URL` 调用后端 `/api/v1`，不得读取数据库或保存 JWT 签名密钥。首批页面应为产品列表、产品详情、登录、账号入口和角色化导航。
