// Hành vi giao diện (không chứa nghiệp vụ — mọi kiểm tra thật nằm ở máy chủ C#)
document.addEventListener('DOMContentLoaded', function () {
  // Xác nhận trước thao tác nguy hiểm: <form data-confirm="Bạn chắc chắn?">
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) { if (!confirm(f.dataset.confirm)) e.preventDefault(); });
  });
  // Tự gửi form khi đổi select: <select data-autosubmit>
  document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () { el.form.submit(); });
  });
  // Chống bấm đúp nút gửi form
  document.querySelectorAll('form[data-once]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      var sub = e.submitter;
      setTimeout(function () { f.querySelectorAll('button[type=submit]').forEach(function (b) { b.disabled = true; }); }, 0);
      // nút đã bị vô hiệu hóa sẽ không gửi name/value, nên thêm lại bằng input ẩn
      if (sub && sub.name) { var h = document.createElement('input'); h.type = 'hidden'; h.name = sub.name; h.value = sub.value; f.appendChild(h); }
    });
  });
  // Nút tăng / giảm số lượng
  document.querySelectorAll('.qty').forEach(function (q) {
    var input = q.querySelector('input'); var max = parseInt(input.max || '999', 10);
    q.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = parseInt(input.value || '1', 10) + parseInt(b.dataset.d, 10);
        input.value = Math.min(max, Math.max(1, v));
      });
    });
  });
  // Trang chi tiết sản phẩm: size nào hết hàng với màu đang chọn thì vô hiệu hóa
  var vj = document.getElementById('variants-json');
  if (vj) {
    var vs = JSON.parse(vj.textContent); var form = document.getElementById('add-form');
    var refresh = function () {
      var mau = (form.querySelector('input[name=maMau]:checked') || {}).value;
      var info = document.getElementById('stock-info'); var qty = form.querySelector('input[name=soLuong]');
      form.querySelectorAll('input[name=maSize]').forEach(function (r) {
        var v = vs.find(function (x) { return String(x.mau) === mau && String(x.size) === r.value; });
        r.disabled = mau ? !(v && v.ton > 0) : false;
        if (r.disabled && r.checked) r.checked = false;
      });
      var size = (form.querySelector('input[name=maSize]:checked') || {}).value;
      var cur = vs.find(function (x) { return String(x.mau) === mau && String(x.size) === size; });
      if (cur) { info.textContent = 'Còn ' + cur.ton + ' sản phẩm'; qty.max = cur.ton; if (+qty.value > cur.ton) qty.value = cur.ton; }
      else info.textContent = 'Chọn đủ màu và size để xem tồn kho';
    };
    form.addEventListener('change', refresh); refresh();
    // Chọn màu => đổi ảnh lớn sang ảnh của màu đó (nếu có)
    form.querySelectorAll('input[name=maMau]').forEach(function (r) {
      r.addEventListener('change', function () {
        var bigEl = document.getElementById('big-img');
        if (r.dataset.img && bigEl) bigEl.innerHTML = '<img class="thumb-img" src="' + r.dataset.img + '" alt="">';
      });
    });
  }
  // Thư viện ảnh: bấm ảnh nhỏ để đổi ảnh lớn
  var big = document.getElementById('big-img');
  document.querySelectorAll('.thumbs button').forEach(function (b) {
    b.addEventListener('click', function () {
      big.innerHTML = '<img class="thumb-img" src="' + b.dataset.src + '" alt="">';
      document.querySelectorAll('.thumbs button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
    });
  });
  // Hiện / ẩn mật khẩu
  document.querySelectorAll('[data-toggle-pw]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.parentElement.querySelector('input'); var show = i.type === 'password';
      i.type = show ? 'text' : 'password'; b.textContent = show ? 'Ẩn' : 'Hiện';
    });
  });
  // Giỏ hàng: chọn tất cả + cập nhật tạm tính theo dòng đã chọn
  var all = document.getElementById('sel-all');
  if (all) {
    var sels = document.querySelectorAll('.sel');
    var totalEl = document.getElementById('sel-total');
    var money = function (n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'; };
    var calc = function () {
      var t = 0;
      sels.forEach(function (c) { if (c.checked) { var tr = c.closest('tr'); t += parseInt(tr.dataset.total || '0', 10); } });
      if (totalEl) totalEl.textContent = money(t);
    };
    document.querySelectorAll('.sel').forEach(function (c) {
      var tr = c.closest('tr'); var cells = tr.querySelectorAll('td'); var txt = cells[cells.length - 2].innerText.replace(/[^\d]/g, '');
      tr.dataset.total = txt || '0';
    });
    all.addEventListener('change', function () { sels.forEach(function (c) { if (!c.disabled) c.checked = all.checked; }); calc(); });
    sels.forEach(function (c) { c.addEventListener('change', calc); });
    calc();
  }
  // Thanh toán: bấm thẻ mã giảm giá để điền vào ô nhập mã
  document.querySelectorAll('.vcard[data-code]').forEach(function (c) {
    c.addEventListener('click', function () {
      var input = document.querySelector('input[name=code]'); if (input) input.value = c.dataset.code;
      document.querySelectorAll('.vcard').forEach(function (x) { x.classList.remove('pick'); }); c.classList.add('pick');
    });
  });
  // Thanh toán: tô viền địa chỉ đang chọn
  document.querySelectorAll('.addr input[type=radio]').forEach(function (r) {
    r.addEventListener('change', function () {
      document.querySelectorAll('.addr').forEach(function (a) { a.classList.remove('sel'); });
      r.closest('.addr').classList.add('sel');
    });
  });
});
