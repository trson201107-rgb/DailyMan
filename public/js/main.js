// [FRONTEND] Hành vi giao diện (không chứa nghiệp vụ — mọi kiểm tra thật nằm ở máy chủ)
document.addEventListener('DOMContentLoaded', function () {
  // Xác nhận trước khi thực hiện thao tác nguy hiểm: <form data-confirm="Bạn chắc chắn?">
  document.querySelectorAll('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) { if (!confirm(f.dataset.confirm)) e.preventDefault(); });
  });
  // Tự gửi form khi đổi select: <select data-autosubmit>
  document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () { el.form.submit(); });
  });
  // Chống bấm đúp nút gửi form
  document.querySelectorAll('form[data-once]').forEach(function (f) {
    f.addEventListener('submit', function () { f.querySelectorAll('button[type=submit]').forEach(function (b) { setTimeout(function () { b.disabled = true; }, 0); }); });
  });
  // Nút tăng / giảm số lượng
  document.querySelectorAll('.qty').forEach(function (q) {
    var input = q.querySelector('input'); var max = parseInt(input.max || '999', 10);
    q.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = parseInt(input.value || '1', 10) + parseInt(b.dataset.d, 10);
        input.value = Math.min(max, Math.max(1, v));
        if (q.dataset.submit) input.form.submit();
      });
    });
  });
  // Trang chi tiết: size nào hết hàng với màu đang chọn thì vô hiệu hóa
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
  }
  // Form sản phẩm: thêm dòng biến thể
  var add = document.getElementById('add-variant-row');
  if (add) {
    add.addEventListener('click', function () {
      var tb = document.getElementById('variant-rows'); var idx = tb.querySelectorAll('tr').length;
      var tr = tb.querySelector('tr').cloneNode(true);
      tr.querySelectorAll('select,input').forEach(function (el) {
        el.name = el.name.replace(/\[\d+\]/, '[' + idx + ']'); if (el.tagName === 'INPUT') el.value = el.name.indexOf('[ton]') > -1 ? '0' : ''; else el.selectedIndex = 0;
      });
      tb.appendChild(tr);
    });
  }
});

// ===== SPRINT 3 =====
document.addEventListener('DOMContentLoaded', function () {
  // Nút Hiện / Ẩn mật khẩu: <input type="password" data-toggle-pw>
  document.querySelectorAll('input[data-toggle-pw]').forEach(function (inp) {
    var wrap = document.createElement('div'); wrap.className = 'pw';
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Hiện'; b.setAttribute('aria-label', 'Hiện hoặc ẩn mật khẩu');
    b.addEventListener('click', function () { var show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.textContent = show ? 'Ẩn' : 'Hiện'; });
    wrap.appendChild(b);
  });
  // Thư viện ảnh: bấm ảnh nhỏ để đổi ảnh lớn, bấm ảnh lớn để phóng to
  var gal = document.getElementById('gallery');
  if (gal) {
    var big = gal.querySelector('.big img'); var lb = document.getElementById('lightbox');
    gal.querySelectorAll('.thumbs button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        gal.querySelectorAll('.thumbs button').forEach(function (x) { x.classList.remove('on'); }); btn.classList.add('on');
        if (big) big.src = btn.dataset.src;
      });
    });
    if (lb) {
      gal.querySelector('.big').addEventListener('click', function () { var i = lb.querySelector('img'); i.src = big ? big.src : ''; lb.classList.add('open'); });
      lb.addEventListener('click', function () { lb.classList.remove('open'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('open'); });
    }
  }
  // Chọn tất cả: <input type="checkbox" data-selall="tên-nhóm"> điều khiển các ô <input data-sel="tên-nhóm">
  document.querySelectorAll('input[data-selall]').forEach(function (all) {
    all.addEventListener('change', function () {
      var boxes = document.querySelectorAll('input[data-sel="' + all.dataset.selall + '"]');
      boxes.forEach(function (c) { c.checked = all.checked; });
      if (all.dataset.submit) all.form.submit();
    });
  });
  // Ô tích trong giỏ hàng: đổi lựa chọn thì gửi form để tính lại tổng tiền
  document.querySelectorAll('input[data-autosubmit-check]').forEach(function (c) { c.addEventListener('change', function () { c.form.submit(); }); });
  // Thanh công cụ hàng loạt: bấm nút trạng thái đích thì gắn giá trị vào form
  document.querySelectorAll('button[data-bulk-den]').forEach(function (b) {
    b.addEventListener('click', function () { document.getElementById('bulk-den').value = b.dataset.bulkDen; });
  });
  // Thẻ địa chỉ ở trang thanh toán: ẩn / hiện form địa chỉ mới
  var newBox = document.getElementById('addr-new');
  if (newBox) {
    var upd = function () { var r = document.querySelector('input[name=maDC]:checked'); newBox.style.display = (!r || r.value === 'moi') ? 'block' : 'none';
      document.querySelectorAll('.addr').forEach(function (c) { var i = c.querySelector('input[name=maDC]'); c.classList.toggle('sel', !!(i && i.checked)); });
      newBox.querySelectorAll('input[data-req]').forEach(function (i) { i.required = (!r || r.value === 'moi'); }); };
    document.querySelectorAll('input[name=maDC]').forEach(function (r) { r.addEventListener('change', upd); }); upd();
  }
  // Admin trên điện thoại: nút Menu mở danh sách chức năng
  var menuBtn = document.getElementById('menu-toggle');
  if (menuBtn) menuBtn.addEventListener('click', function () { document.body.classList.toggle('menu-open'); menuBtn.classList.toggle('on'); });
});
