-- 历史订单 reserved 基线对账
-- 背景:本次改动前,PENDING 订单创建时不会执行 reserved += quantity。直接合入新规则后,
-- 对历史 PENDING 订单做取消/支付会执行 reserved -= quantity,导致 reserved 变负,
-- 进而 (stock - reserved) 被错误放大,出现"虚拟可用库存"。
--
-- 预留模式下 reserved 的不变量:
--   reserved == SUM(quantity) over all PENDING orders' OrderItems
-- (PAID 订单在 PENDING→PAID 时已把 reserved 减掉并扣 stock;CANCELLED 订单的预留已释放。)
--
-- 本迁移按上述不变量重算每个 variant 的 reserved,使其与当前 PENDING 订单实际占用一致。
-- 幂等:可重复执行,结果只取决于当前 PENDING 订单。
UPDATE "variants" v
SET "reserved" = COALESCE((
  SELECT SUM(oi."quantity")::int
  FROM "OrderItem" oi
  JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."status" = 'PENDING'
    AND oi."variantId" = v."id"
), 0)
WHERE v."reserved" <> COALESCE((
  SELECT SUM(oi."quantity")::int
  FROM "OrderItem" oi
  JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."status" = 'PENDING'
    AND oi."variantId" = v."id"
), 0);
