// Kết nối SQL Server (dùng chung cho mọi Model). Mọi câu lệnh đều dùng tham số => chống SQL Injection.
const sql = require('mssql');

// Named instance (vd: SQLEXPRESS05): đặt DB_INSTANCE=SQLEXPRESS05 (cần bật dịch vụ SQL Server Browser) và KHÔNG dùng DB_PORT.
// Cách ổn định hơn: đặt cổng tĩnh cho instance rồi dùng DB_PORT.
const instance = process.env.DB_INSTANCE;
const config = {
  server: process.env.DB_SERVER || 'localhost',
  ...(instance ? {} : { port: parseInt(process.env.DB_PORT || '1433', 10) }),
  database: process.env.DB_NAME || 'ThoiTrangNam',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    ...(instance ? { instanceName: instance } : {})
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

let poolPromise = null;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((e) => { poolPromise = null; throw e; });
  }
  return poolPromise;
}

function bind(request, params) {
  for (const [k, v] of Object.entries(params || {})) request.input(k, v === undefined ? null : v);
  return request;
}

/** Trả về toàn bộ result (recordset, rowsAffected...) */
async function run(text, params) {
  const pool = await getPool();
  return bind(pool.request(), params).query(text);
}
/** Trả về mảng dòng */
async function query(text, params) {
  const r = await run(text, params);
  return r.recordset || [];
}
/** Chạy nhiều lệnh trong MỘT giao dịch; lỗi => rollback toàn bộ */
async function transaction(work) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const ctx = {
    run: (text, params) => bind(new sql.Request(tx), params).query(text),
    query: async (text, params) => (await bind(new sql.Request(tx), params).query(text)).recordset || []
  };
  try {
    const out = await work(ctx);
    await tx.commit();
    return out;
  } catch (e) {
    try { await tx.rollback(); } catch (_) { /* bỏ qua */ }
    throw e;
  }
}

module.exports = { sql, run, query, transaction };
