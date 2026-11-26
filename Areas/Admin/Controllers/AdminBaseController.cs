using DailyMan.Controllers;
using DailyMan.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DailyMan.Areas.Admin.Controllers;

/// <summary>Mọi controller trong khu quản trị đều kế thừa lớp này: chỉ Admin và Staff được vào.</summary>
[Area("Admin")]
[Authorize(Roles = Const.ROLE_ADMIN + "," + Const.ROLE_STAFF)]
public abstract class AdminBaseController : BaseController
{
}
