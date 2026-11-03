// Ghi nhật ký thao tác quan trọng (đăng nhập, đổi trạng thái đơn, đổi giá, điều chỉnh tồn kho) ra console + file logs/app.log
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', 'logs');
let canFile = true;
try { fs.mkdirSync(dir, { recursive: true }); } catch (_) { canFile = false; }

function log(action, detail, who) {
  const line = `${new Date().toISOString()} | ${action} | user=${who || '-'} | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
  console.log(line);
  if (canFile) fs.appendFile(path.join(dir, 'app.log'), line + '\n', () => {});
}
module.exports = { log };
