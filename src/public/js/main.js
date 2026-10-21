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
