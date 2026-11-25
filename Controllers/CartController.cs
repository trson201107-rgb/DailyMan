using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DailyMan.Controllers;

public class CartController : BaseController
{
    private readonly CartService _cart;
    public CartController(CartService cart) => _cart = cart;

    [Authorize]
    public async Task<IActionResult> Index() => View(await _cart.GetLinesAsync(User.UserId()));

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Add(int maSP, int maMau, int maSize, int soLuong = 1, bool muaNgay = false)
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            Loi("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
            return RedirectToAction("Login", "Account", new { returnUrl = Url.Action("Details", "Shop", new { id = maSP }) });
        }
        var loi = await _cart.AddAsync(User.UserId(), maSP, maMau, maSize, soLuong);
        if (loi != null) { Loi(loi); return RedirectToAction("Details", "Shop", new { id = maSP }); }
        ThongBao("Đã thêm vào giỏ hàng.");
        return muaNgay ? RedirectToAction(nameof(Index)) : RedirectToAction("Details", "Shop", new { id = maSP });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Update(int maBT, int soLuong)
    {
        var loi = await _cart.UpdateAsync(User.UserId(), maBT, soLuong);
        if (loi != null) Loi(loi);
        return RedirectToAction(nameof(Index));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Remove(int maBT)
    {
        await _cart.RemoveAsync(User.UserId(), maBT);
        return RedirectToAction(nameof(Index));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AcceptPrices()
    {
        await _cart.AcceptNewPricesAsync(User.UserId());
        ThongBao("Đã cập nhật theo giá mới.");
        return RedirectToAction(nameof(Index));
    }
}
