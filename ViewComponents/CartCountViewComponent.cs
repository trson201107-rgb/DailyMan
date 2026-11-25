using DailyMan.Helpers;
using DailyMan.Services;
using Microsoft.AspNetCore.Mvc;

namespace DailyMan.ViewComponents;

/// <summary>Số sản phẩm trong giỏ hàng hiển thị trên thanh menu.</summary>
public class CartCountViewComponent : ViewComponent
{
    private readonly CartService _cart;
    public CartCountViewComponent(CartService cart) => _cart = cart;

    public async Task<IViewComponentResult> InvokeAsync()
    {
        var n = UserClaimsPrincipal.Identity?.IsAuthenticated == true ? await _cart.CountAsync(UserClaimsPrincipal.UserId()) : 0;
        return View(n);
    }
}
