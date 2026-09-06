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

      const detail = await request(
        `/products/${encodeURIComponent(product.slug)}`,
      );
      expectApiResponse(detail, 200, true);
      assert.equal(detail.json.data.slug, product.slug);
      assert.ok(Array.isArray(detail.json.data.variants));
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

      const dealerToken = await login("dealer@wemove.local");
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
