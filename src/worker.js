function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers
    }
  });
}

function errorResponse(message, status = 400) {
  return json({ error: message }, { status });
}

function generateTripCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeTripName(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 120) : null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function findTripByCode(env, code) {
  return env.DB
    .prepare("SELECT id, code, name, created_at, updated_at FROM trips WHERE code = ?")
    .bind(code)
    .first();
}

async function listBillsForTrip(env, tripId) {
  const result = await env.DB
    .prepare(
      `SELECT
        id,
        bill_name,
        payer,
        original_charged_twd,
        charged_twd_with_fee,
        subtotal_cad,
        total_tax_cad,
        total_cad,
        exchange_rate,
        people_json,
        settlements_json,
        created_at
      FROM bills
      WHERE trip_id = ?
      ORDER BY created_at DESC, id DESC`
    )
    .bind(tripId)
    .all();

  return (result.results || []).map((row) => ({
    id: row.id,
    billName: row.bill_name,
    payer: row.payer,
    originalChargedTwd: row.original_charged_twd,
    chargedTwdWithFee: row.charged_twd_with_fee,
    subtotalCad: row.subtotal_cad,
    totalTaxCad: row.total_tax_cad,
    totalCad: row.total_cad,
    exchangeRate: row.exchange_rate,
    people: JSON.parse(row.people_json),
    settlements: JSON.parse(row.settlements_json),
    createdAt: row.created_at
  }));
}

function validateBillPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "缺少帳單資料。";
  }

  if (typeof payload.billName !== "string" || !payload.billName.trim()) {
    return "帳單名稱不能是空的。";
  }

  if (typeof payload.payer !== "string" || !payload.payer.trim()) {
    return "付款人不能是空的。";
  }

  const numberFields = [
    "originalChargedTwd",
    "chargedTwdWithFee",
    "subtotalCad",
    "totalTaxCad",
    "totalCad",
    "exchangeRate"
  ];

  for (const field of numberFields) {
    if (typeof payload[field] !== "number" || !Number.isFinite(payload[field])) {
      return `欄位 ${field} 格式不正確。`;
    }
  }

  if (!Array.isArray(payload.people) || !Array.isArray(payload.settlements)) {
    return "people 或 settlements 格式不正確。";
  }

  return null;
}

async function handleCreateTrip(request, env) {
  const payload = await readJson(request);
  const tripName = normalizeTripName(payload?.name) || "未命名旅程";
  const now = new Date().toISOString();

  let code = "";
  for (let attempts = 0; attempts < 5; attempts += 1) {
    code = generateTripCode();
    try {
      await env.DB
        .prepare("INSERT INTO trips (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .bind(code, tripName, now, now)
        .run();
      return json({
        trip: {
          code,
          name: tripName,
          createdAt: now,
          updatedAt: now,
          bills: []
        }
      }, { status: 201 });
    } catch (error) {
      if (!String(error).includes("UNIQUE")) {
        throw error;
      }
    }
  }

  return errorResponse("建立旅程失敗，請再試一次。", 500);
}

async function handleGetTrip(env, code) {
  const trip = await findTripByCode(env, code);
  if (!trip) {
    return errorResponse("找不到這個旅程代碼。", 404);
  }

  const bills = await listBillsForTrip(env, trip.id);
  return json({
    trip: {
      code: trip.code,
      name: trip.name,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at,
      bills
    }
  });
}

async function handleCreateBill(request, env, code) {
  const trip = await findTripByCode(env, code);
  if (!trip) {
    return errorResponse("找不到這個旅程代碼。", 404);
  }

  const payload = await readJson(request);
  const validationError = validateBillPayload(payload);
  if (validationError) {
    return errorResponse(validationError, 400);
  }

  const createdAt = new Date().toISOString();

  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO bills (
          trip_id,
          bill_name,
          payer,
          original_charged_twd,
          charged_twd_with_fee,
          subtotal_cad,
          total_tax_cad,
          total_cad,
          exchange_rate,
          people_json,
          settlements_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        trip.id,
        payload.billName.trim().slice(0, 120),
        payload.payer.trim(),
        payload.originalChargedTwd,
        payload.chargedTwdWithFee,
        payload.subtotalCad,
        payload.totalTaxCad,
        payload.totalCad,
        payload.exchangeRate,
        JSON.stringify(payload.people),
        JSON.stringify(payload.settlements),
        createdAt
      ),
    env.DB
      .prepare("UPDATE trips SET updated_at = ? WHERE id = ?")
      .bind(createdAt, trip.id)
  ]);

  return json({ ok: true }, { status: 201 });
}

async function handleDeleteBill(env, code, billId) {
  const trip = await findTripByCode(env, code);
  if (!trip) {
    return errorResponse("找不到這個旅程代碼。", 404);
  }

  const result = await env.DB
    .prepare("DELETE FROM bills WHERE id = ? AND trip_id = ?")
    .bind(Number(billId), trip.id)
    .run();

  if (!result.success || result.meta.changes === 0) {
    return errorResponse("找不到這筆帳單。", 404);
  }

  await env.DB
    .prepare("UPDATE trips SET updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), trip.id)
    .run();

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/api/trips" && request.method === "POST") {
      try {
        return await handleCreateTrip(request, env);
      } catch (error) {
        return errorResponse(`建立旅程失敗：${error}`, 500);
      }
    }

    const tripMatch = pathname.match(/^\/api\/trips\/([A-Z0-9]+)$/);
    if (tripMatch && request.method === "GET") {
      try {
        return await handleGetTrip(env, tripMatch[1]);
      } catch (error) {
        return errorResponse(`讀取旅程失敗：${error}`, 500);
      }
    }

    const createBillMatch = pathname.match(/^\/api\/trips\/([A-Z0-9]+)\/bills$/);
    if (createBillMatch && request.method === "POST") {
      try {
        return await handleCreateBill(request, env, createBillMatch[1]);
      } catch (error) {
        return errorResponse(`儲存帳單失敗：${error}`, 500);
      }
    }

    const deleteBillMatch = pathname.match(/^\/api\/trips\/([A-Z0-9]+)\/bills\/(\d+)$/);
    if (deleteBillMatch && request.method === "DELETE") {
      try {
        return await handleDeleteBill(env, deleteBillMatch[1], deleteBillMatch[2]);
      } catch (error) {
        return errorResponse(`刪除帳單失敗：${error}`, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
