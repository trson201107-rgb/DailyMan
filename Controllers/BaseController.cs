using Microsoft.AspNetCore.Mvc;

namespace DailyMan.Controllers;

/// <summary>Lớp cha: thêm hàm hiện thông báo (flash message) dùng chung cho mọi controller.</summary>
public abstract class BaseController : Controller
{
    protected void ThongBao(string msg) => TempData["flash_ok"] = msg;
    protected void Loi(string msg) => TempData["flash_err"] = msg;
}
