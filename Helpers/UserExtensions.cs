using System.Security.Claims;
using DailyMan.Models;

namespace DailyMan.Helpers;

public static class UserExtensions
{
    public static int UserId(this ClaimsPrincipal u) => int.TryParse(u.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    public static string UserName(this ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.Name) ?? "";
    public static string Role(this ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.Role) ?? "";
    public static bool IsAdmin(this ClaimsPrincipal u) => u.IsInRole(Const.ROLE_ADMIN);
    public static bool IsStaffOrAdmin(this ClaimsPrincipal u) => u.IsInRole(Const.ROLE_ADMIN) || u.IsInRole(Const.ROLE_STAFF);
}
