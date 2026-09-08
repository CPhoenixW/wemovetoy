# 商品展示图

把要展示的商品图片放进本目录（`frontend/public/pic`），浏览器通过 `/pic/<文件名>` 直接访问。

## 命名规则

图片文件名 = 商品 slug，扩展名支持 `.jpg` / `.jpeg` / `.png` / `.webp`。

例如商品 slug 为 `50-piece-std-set`，则文件命名为：

```
50-piece-std-set.jpg
```

slug 可以从商品详情页地址 `/products/<slug>` 看出来。

## 生效位置

- 商品列表 `/products`：每张卡片顶部显示商品图（封面裁切）。
- 商品详情 `/products/[slug]`：主区域顶部大图。

没有对应图片的商品会自动隐藏图片，页面与布局不受影响。
