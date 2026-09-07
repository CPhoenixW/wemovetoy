import assert from "node:assert/strict";
import test from "node:test";

const apiBase = (
  process.env.E2E_BASE_URL ?? "http://localhost:3100/api/v1"
).replace(/\/$/, "");
const origin = new URL(apiBase).origin;
const password = "ChangeMe123!";
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
const applicantEmail = `member6-${runId}@example.test`;

async function request(path, options = {}) {
  const headers = { Accept: "application/json", ...options.headers };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, json, text };
}

function expectApiResponse(result, status, success) {
  assert.equal(result.status, status, result.text);
  assert.equal(result.json?.success, success, result.text);
  assert.equal(typeof result.json?.request_id, "string", result.text);
  assert.ok(result.json.request_id.length > 0, result.text);
}

function expectMoney(actual, expected, message) {
  assert.equal(typeof actual, "number", message);
  assert.equal(
    Math.round((actual + Number.EPSILON) * 100),
    Math.round((expected + Number.EPSILON) * 100),
    message,
  );
}

async function login(email) {
  const result = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  expectApiResponse(result, 201, true);
  assert.equal(result.json.data.user.email, email);
  assert.equal(typeof result.json.data.accessToken, "string");
  return result.json.data.accessToken;
}

test("WEMOVE cross-module API smoke", async (t) => {
  let product;
  let userToken;
  let outsiderToken;
  let adminToken;
  let dealerToken;
  let variantSku;

  await t.test(
    "health, Swagger and public product APIs are reachable",
    async () => {
      const health = await request("/health");
      expectApiResponse(health, 200, true);
      assert.equal(health.json.data.status, "ok");

      const docs = await fetch(`${origin}/api/docs`);
      assert.equal(docs.status, 200);

      const products = await request("/products");
      expectApiResponse(products, 200, true);
      assert.ok(Array.isArray(products.json.data.items));
      assert.ok(
        products.json.data.items.length >= 1,
        "seed should provide at least one product",
      );
      product = products.json.data.items[0];
      assert.deepEqual(Object.keys(product).sort(), [
        "ageMax",
        "ageMin",
        "category",
        "createdAt",
        "features",
        "id",
        "name",
        "playEnvironment",
        "price",
        "shortDescription",
        "slug",
        "specifications",
      ]);

      const statusQuery = await request("/products?status=DRAFT");
      expectApiResponse(statusQuery, 400, false);

      const detail = await request(
        `/products/${encodeURIComponent(product.slug)}`,
      );
      expectApiResponse(detail, 200, true);
      assert.equal(detail.json.data.slug, product.slug);
      assert.ok(Array.isArray(detail.json.data.variants));
      assert.ok(detail.json.data.variants.length >= 1);

      const variant = detail.json.data.variants[0];
      variantSku = variant.sku;
      assert.deepEqual(Object.keys(variant).sort(), [
        "id",
        "isPurchasable",
        "name",
        "options",
        "price",
        "sku",
      ]);
      assert.equal(typeof variant.price, "number");
      assert.equal(typeof variant.isPurchasable, "boolean");
    },
  );

  await t.test("registration, login and current-user flow works", async () => {
    const registered = await request("/auth/register", {
      method: "POST",
      body: { email: applicantEmail, password, name: "Member 6 E2E" },
    });
    expectApiResponse(registered, 201, true);
    assert.equal(registered.json.data.email, applicantEmail);
    assert.equal(registered.json.data.role, "USER");
    assert.equal(registered.json.data.passwordHash, undefined);

    userToken = await login(applicantEmail);
    const me = await request("/auth/me", { token: userToken });
    expectApiResponse(me, 200, true);
    assert.equal(me.json.data.email, applicantEmail);
    assert.equal(me.json.data.role, "USER");
  });

  await t.test(
    "authentication and role boundaries return 401/403",
    async () => {
      const anonymousCart = await request("/cart");
      expectApiResponse(anonymousCart, 401, false);

      const userAdmin = await request("/admin/ping", { token: userToken });
      expectApiResponse(userAdmin, 403, false);

      const userDealer = await request("/dealer/ping", { token: userToken });
      expectApiResponse(userDealer, 403, false);

      adminToken = await login("admin@wemove.local");
      const adminPing = await request("/admin/ping", { token: adminToken });
      expectApiResponse(adminPing, 200, true);

      dealerToken = await login("dealer@wemove.local");
      const dealerPing = await request("/dealer/ping", { token: dealerToken });
      expectApiResponse(dealerPing, 200, true);

      const adminProductWithUser = await request(
        `/admin/products/${product.id}`,
        {
          token: userToken,
        },
      );
      expectApiResponse(adminProductWithUser, 403, false);
    },
  );

  await t.test(
    "authenticated SKU and Dealer product APIs enforce their contracts",
    async () => {
      const anonymousVariant = await request(
        `/variants/${encodeURIComponent(variantSku)}`,
      );
      expectApiResponse(anonymousVariant, 401, false);

      const userVariant = await request(
        `/variants/${encodeURIComponent(variantSku)}`,
        { token: userToken },
      );
      expectApiResponse(userVariant, 200, true);
      assert.deepEqual(Object.keys(userVariant.json.data).sort(), [
        "id",
        "isPurchasable",
        "name",
        "options",
        "productId",
        "productName",
        "sku",
        "unitPrice",
      ]);

      const adminVariant = await request(
        `/variants/${encodeURIComponent(variantSku)}`,
        { token: adminToken },
      );
      expectApiResponse(adminVariant, 200, true);
      assert.equal(
        adminVariant.json.data.unitPrice,
        userVariant.json.data.unitPrice,
      );
      assert.equal(adminVariant.json.data.availableStock, undefined);

      const dealerVariant = await request(
        `/variants/${encodeURIComponent(variantSku)}`,
        { token: dealerToken },
      );
      expectApiResponse(dealerVariant, 200, true);
      assert.equal(typeof dealerVariant.json.data.availableStock, "number");
      assert.ok(
        dealerVariant.json.data.unitPrice < userVariant.json.data.unitPrice,
        "seed Dealer price should be lower than retail price",
      );
      for (const field of ["dealerPrice", "stock", "reserved", "status"]) {
        assert.equal(
          dealerVariant.json.data[field],
          undefined,
          `Dealer SKU leaked ${field}`,
        );
      }

      const batch = await request("/variants/batch", {
        method: "POST",
        token: userToken,
        body: { skus: [variantSku] },
      });
      expectApiResponse(batch, 200, true);
      assert.equal(batch.json.data.items.length, 1);
      assert.equal(batch.json.data.items[0].availableStock, undefined);

      const missingSku = `e2e-missing-${runId}`;
      const incompleteBatch = await request("/variants/batch", {
        method: "POST",
        token: userToken,
        body: { skus: [variantSku, missingSku] },
      });
      expectApiResponse(incompleteBatch, 404, false);

      const stockProbe = await request("/variants/check-stock", {
        method: "POST",
        token: userToken,
        body: { sku: variantSku, quantity: 1 },
      });
      expectApiResponse(stockProbe, 404, false);

      const draftSlug = `e2e-draft-${runId}`;
      const draftProduct = await request("/admin/products", {
        method: "POST",
        token: adminToken,
        body: {
          name: "E2E Draft Product",
          slug: draftSlug,
          shortDescription: "Must not be public",
          description: "This draft is created only to verify public filtering.",
          price: 19.99,
        },
      });
      expectApiResponse(draftProduct, 201, true);

      const publicDraft = await request(
        `/products/${encodeURIComponent(draftSlug)}`,
      );
      expectApiResponse(publicDraft, 404, false);

      const anonymousDealerCatalog = await request("/dealer/products");
      expectApiResponse(anonymousDealerCatalog, 401, false);

      const userDealerCatalog = await request("/dealer/products", {
        token: userToken,
      });
      expectApiResponse(userDealerCatalog, 403, false);

      const dealerCatalog = await request("/dealer/products", {
        token: dealerToken,
      });
      expectApiResponse(dealerCatalog, 200, true);
      const dealerProduct = dealerCatalog.json.data.items[0];
      assert.deepEqual(Object.keys(dealerProduct).sort(), [
        "ageMax",
        "ageMin",
        "category",
        "dealerPrice",
        "id",
        "name",
        "playEnvironment",
        "retailPrice",
        "shortDescription",
        "slug",
        "variants",
      ]);
      assert.ok(dealerProduct.variants.length >= 1);
      assert.deepEqual(Object.keys(dealerProduct.variants[0]).sort(), [
        "availableStock",
        "id",
        "isPurchasable",
        "name",
        "sku",
        "unitPrice",
      ]);

      const inactiveSku = `e2e-inactive-${runId}`;
      const inactiveVariant = await request("/variants/admin", {
        method: "POST",
        token: adminToken,
        body: {
          productId: product.id,
          sku: inactiveSku,
          name: "E2E Inactive Variant",
          price: 9.99,
          stock: 5,
          status: "INACTIVE",
        },
      });
      expectApiResponse(inactiveVariant, 201, true);

      const unavailableVariant = await request(
        `/variants/${encodeURIComponent(inactiveSku)}`,
        { token: userToken },
      );
      expectApiResponse(unavailableVariant, 400, false);
    },
  );

  await t.test(
    "real SKU checkout revalidates stock and preserves order snapshots",
    async () => {
      const checkoutSku = `e2e-checkout-${runId}`;
      const initialVariantName = "E2E Checkout Variant";
      const initialPrice = 12.34;
      const checkoutPrice = 13.25;
      const checkoutQuantity = 4;

      const createdVariant = await request("/variants/admin", {
        method: "POST",
        token: adminToken,
        body: {
          productId: product.id,
          sku: checkoutSku,
          name: initialVariantName,
          options: { purpose: "checkout-e2e" },
          price: initialPrice,
          dealerPrice: 9.87,
          stock: 5,
          status: "ACTIVE",
        },
      });
      expectApiResponse(createdVariant, 201, true);
      const variantId = createdVariant.json.data.id;
      assert.equal(typeof variantId, "number");

      const missingVariant = await request("/cart/items", {
        method: "POST",
        token: userToken,
        body: { variantId: 2_147_483_000, quantity: 1 },
      });
      expectApiResponse(missingVariant, 404, false);

      const initialStockFailure = await request("/cart/items", {
        method: "POST",
        token: userToken,
        body: { variantId, quantity: 6 },
      });
      expectApiResponse(initialStockFailure, 400, false);

      const firstAdd = await request("/cart/items", {
        method: "POST",
        token: userToken,
        body: { variantId, quantity: 2 },
      });
      expectApiResponse(firstAdd, 201, true);
      assert.equal(firstAdd.json.data.variantId, variantId);
      assert.equal(firstAdd.json.data.sku, checkoutSku);
      assert.equal(firstAdd.json.data.productName, product.name);
      assert.equal(firstAdd.json.data.variantName, initialVariantName);
      assert.equal(firstAdd.json.data.quantity, 2);
      expectMoney(firstAdd.json.data.unitPrice, initialPrice, "retail price");
      expectMoney(firstAdd.json.data.subtotal, 24.68, "first subtotal");

      const accumulatedAdd = await request("/cart/items", {
        method: "POST",
        token: userToken,
        body: { variantId, quantity: 1 },
      });
      expectApiResponse(accumulatedAdd, 201, true);
      assert.equal(accumulatedAdd.json.data.id, firstAdd.json.data.id);
      assert.equal(accumulatedAdd.json.data.quantity, 3);
      expectMoney(
        accumulatedAdd.json.data.subtotal,
        37.02,
        "accumulated subtotal",
      );

      const updatedItem = await request(
        `/cart/items/${firstAdd.json.data.id}`,
        {
          method: "PATCH",
          token: userToken,
          body: { quantity: checkoutQuantity },
        },
      );
      expectApiResponse(updatedItem, 200, true);
      assert.equal(updatedItem.json.data.quantity, checkoutQuantity);
      expectMoney(updatedItem.json.data.subtotal, 49.36, "updated subtotal");

      const updateBeyondStock = await request(
        `/cart/items/${firstAdd.json.data.id}`,
        {
          method: "PATCH",
          token: userToken,
          body: { quantity: 6 },
        },
      );
      expectApiResponse(updateBeyondStock, 400, false);

      const populatedCart = await request("/cart", { token: userToken });
      expectApiResponse(populatedCart, 200, true);
      assert.equal(populatedCart.json.data.items.length, 1);
      assert.equal(populatedCart.json.data.itemCount, checkoutQuantity);
      assert.equal(populatedCart.json.data.items[0].quantity, checkoutQuantity);
      expectMoney(populatedCart.json.data.totalAmount, 49.36, "cart total");

      const lowerStock = await request(`/variants/admin/${variantId}`, {
        method: "PATCH",
        token: adminToken,
        body: { stock: 3 },
      });
      expectApiResponse(lowerStock, 200, true);

      const checkoutWithStaleStock = await request("/orders", {
        method: "POST",
        token: userToken,
        body: { shippingName: "Stock Recheck Must Fail" },
      });
      expectApiResponse(checkoutWithStaleStock, 400, false);

      const retainedCart = await request("/cart", { token: userToken });
      expectApiResponse(retainedCart, 200, true);
      assert.equal(retainedCart.json.data.items[0].quantity, checkoutQuantity);

      const snapshotVariantName = "E2E Variant At Checkout";
      const restoreStockAndChangePrice = await request(
        `/variants/admin/${variantId}`,
        {
          method: "PATCH",
          token: adminToken,
          body: {
            name: snapshotVariantName,
            price: checkoutPrice,
            stock: 5,
          },
        },
      );
      expectApiResponse(restoreStockAndChangePrice, 200, true);

      const order = await request("/orders", {
        method: "POST",
        token: userToken,
        body: {
          shippingName: "Member 6 E2E",
          shippingPhone: "13000000000",
          shippingAddress: "Independent test database only",
          remark: "checkout snapshot verification",
        },
      });
      expectApiResponse(order, 201, true);
      assert.equal(typeof order.json.data.id, "number");
      assert.match(order.json.data.orderNumber, /^WM\d{18}$/);
      assert.equal(order.json.data.status, "PENDING");
      assert.equal(order.json.data.shippingName, "Member 6 E2E");
      expectMoney(order.json.data.totalAmount, 53, "order total");
      assert.equal(order.json.data.items.length, 1);

      const orderItem = order.json.data.items[0];
      assert.equal(orderItem.variantId, variantId);
      assert.equal(orderItem.sku, checkoutSku);
      assert.equal(orderItem.productName, product.name);
      assert.equal(orderItem.variantName, snapshotVariantName);
      assert.equal(orderItem.quantity, checkoutQuantity);
      expectMoney(orderItem.unitPrice, checkoutPrice, "order unit price");
      expectMoney(orderItem.subtotal, 53, "order item subtotal");

      const emptyAfterCheckout = await request("/cart", { token: userToken });
      expectApiResponse(emptyAfterCheckout, 200, true);
      assert.deepEqual(emptyAfterCheckout.json.data.items, []);
      assert.equal(emptyAfterCheckout.json.data.itemCount, 0);
      expectMoney(
        emptyAfterCheckout.json.data.totalAmount,
        0,
        "cleared cart total",
      );

      const myOrders = await request("/orders?page=1&pageSize=100", {
        token: userToken,
      });
      expectApiResponse(myOrders, 200, true);
      assert.ok(
        myOrders.json.data.items.some((item) => item.id === order.json.data.id),
      );

      const orderOutsiderEmail = `order-outsider-${runId}@example.test`;
      const registeredOutsider = await request("/auth/register", {
        method: "POST",
        body: {
          email: orderOutsiderEmail,
          password,
          name: "Order E2E Outsider",
        },
      });
      expectApiResponse(registeredOutsider, 201, true);
      const orderOutsiderToken = await login(orderOutsiderEmail);

      const outsiderRead = await request(`/orders/${order.json.data.id}`, {
        token: orderOutsiderToken,
      });
      expectApiResponse(outsiderRead, 403, false);

      const outsiderCancel = await request(
        `/orders/${order.json.data.id}/cancel`,
        { method: "PATCH", token: orderOutsiderToken },
      );
      expectApiResponse(outsiderCancel, 403, false);

      const anonymousAdminOrders = await request("/admin/orders");
      expectApiResponse(anonymousAdminOrders, 401, false);

      const userAdminOrders = await request("/admin/orders", {
        token: userToken,
      });
      expectApiResponse(userAdminOrders, 403, false);

      const adminOrders = await request(
        `/admin/orders?search=${encodeURIComponent(order.json.data.orderNumber)}`,
        { token: adminToken },
      );
      expectApiResponse(adminOrders, 200, true);
      assert.equal(adminOrders.json.data.items.length, 1);
      assert.equal(adminOrders.json.data.items[0].id, order.json.data.id);
      assert.equal(adminOrders.json.data.items[0].itemCount, 1);
      assert.equal(
        adminOrders.json.data.items[0].customer.email,
        applicantEmail,
      );
      assert.equal(
        adminOrders.json.data.items[0].customer.passwordHash,
        undefined,
      );

      const adminOrderDetail = await request(
        `/admin/orders/${order.json.data.id}`,
        { token: adminToken },
      );
      expectApiResponse(adminOrderDetail, 200, true);
      assert.equal(adminOrderDetail.json.data.customer.email, applicantEmail);
      assert.equal(adminOrderDetail.json.data.customer.passwordHash, undefined);

      const mutateCatalogAfterCheckout = await request(
        `/variants/admin/${variantId}`,
        {
          method: "PATCH",
          token: adminToken,
          body: { name: "E2E Variant Changed Later", price: 99.99 },
        },
      );
      expectApiResponse(mutateCatalogAfterCheckout, 200, true);

      const persistedOrder = await request(`/orders/${order.json.data.id}`, {
        token: userToken,
      });
      expectApiResponse(persistedOrder, 200, true);
      assert.equal(
        persistedOrder.json.data.items[0].variantName,
        snapshotVariantName,
      );
      expectMoney(
        persistedOrder.json.data.items[0].unitPrice,
        checkoutPrice,
        "immutable order price snapshot",
      );
      expectMoney(
        persistedOrder.json.data.totalAmount,
        53,
        "immutable order total",
      );

      const invalidInitialTransition = await request(
        `/admin/orders/${order.json.data.id}/status`,
        {
          method: "PATCH",
          token: adminToken,
          body: { status: "COMPLETED" },
        },
      );
      expectApiResponse(invalidInitialTransition, 400, false);

      const paidOrder = await request(
        `/admin/orders/${order.json.data.id}/status`,
        {
          method: "PATCH",
          token: adminToken,
          body: { status: "PAID" },
        },
      );
      expectApiResponse(paidOrder, 200, true);
      assert.equal(paidOrder.json.data.status, "PAID");

      const invalidPaidTransition = await request(
        `/admin/orders/${order.json.data.id}/status`,
        {
          method: "PATCH",
          token: adminToken,
          body: { status: "COMPLETED" },
        },
      );
      expectApiResponse(invalidPaidTransition, 400, false);
    },
  );

  await t.test(
    "empty cart is readable and cannot create an order",
    async () => {
      const cart = await request("/cart", { token: userToken });
      expectApiResponse(cart, 200, true);
      assert.deepEqual(cart.json.data.items, []);

      const order = await request("/orders", {
        method: "POST",
        token: userToken,
        body: { shippingName: "Member 6 E2E" },
      });
      expectApiResponse(order, 400, false);
    },
  );

  await t.test(
    "dealer approval updates role and enforces company isolation",
    async () => {
      const outsiderEmail = `outsider-${runId}@example.test`;
      const outsider = await request("/auth/register", {
        method: "POST",
        body: { email: outsiderEmail, password, name: "E2E Outsider" },
      });
      expectApiResponse(outsider, 201, true);
      outsiderToken = await login(outsiderEmail);

      const application = await request("/dealers/applications", {
        method: "POST",
        token: userToken,
        body: {
          companyName: `Member 6 E2E Company ${runId}`,
          contactName: "Member 6",
          contactPhone: "13000000000",
          address: "E2E only",
        },
      });
      expectApiResponse(application, 201, true);
      assert.equal(application.json.data.status, "PENDING");
      const applicationId = application.json.data.id;

      const outsiderRead = await request(
        `/dealers/applications/${applicationId}`,
        {
          token: outsiderToken,
        },
      );
      expectApiResponse(outsiderRead, 403, false);

      const approved = await request(
        `/dealers/admin/applications/${applicationId}/approve`,
        {
          method: "PATCH",
          token: adminToken,
          body: { reviewNote: "Automated E2E approval" },
        },
      );
      expectApiResponse(approved, 200, true);
      assert.equal(approved.json.data.status, "APPROVED");
      assert.equal(typeof approved.json.data.companyId, "number");

      const refreshedDealerToken = await login(applicantEmail);
      const promotedPing = await request("/dealer/ping", {
        token: refreshedDealerToken,
      });
      expectApiResponse(promotedPing, 200, true);

      const companyId = approved.json.data.companyId;
      const ownCompany = await request(`/dealers/companies/${companyId}`, {
        token: refreshedDealerToken,
      });
      expectApiResponse(ownCompany, 200, true);

      const outsiderCompany = await request(`/dealers/companies/${companyId}`, {
        token: outsiderToken,
      });
      expectApiResponse(outsiderCompany, 403, false);
    },
  );
});
