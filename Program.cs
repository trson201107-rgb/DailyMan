using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

Console.OutputEncoding = System.Text.Encoding.UTF8;   // để console hiện tiếng Việt có dấu
var builder = WebApplication.CreateBuilder(args);

// ===== Đăng ký dịch vụ (Dependency Injection) =====
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("DailyMan")));

// Đăng nhập bằng Cookie + phân quyền theo vai trò (Authentication / Authorization)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.LoginPath = "/Account/Login";
        o.AccessDeniedPath = "/Account/AccessDenied";
        o.ExpireTimeSpan = TimeSpan.FromDays(7);
        o.SlidingExpiration = true;
        // Mỗi request kiểm tra tài khoản còn "Hoạt động" không => khóa tài khoản có hiệu lực ngay
        o.Events.OnValidatePrincipal = async ctx =>
        {
            var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var id = ctx.Principal!.UserId();
            var ok = await db.TaiKhoans.AnyAsync(t => t.MaTK == id && t.TrangThai == Const.TK_HOAT_DONG);
            if (!ok) { ctx.RejectPrincipal(); await ctx.HttpContext.SignOutAsync(); }
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<ConfigService>();
builder.Services.AddScoped<TierService>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<VoucherService>();
builder.Services.AddScoped<CheckoutService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<StatsService>();

var app = builder.Build();

// ===== Tạo CSDL + dữ liệu mẫu ở lần chạy đầu tiên =====
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Thử lại vài lần: khi chạy bằng Docker, SQL Server cần ~20 giây để khởi động xong
    for (int lan = 1; ; lan++)
    {
        try
        {
            db.Database.EnsureCreated();
            DbSeeder.Seed(db);
            break;
        }
        catch (Exception ex) when (lan < 20)
        {
            Console.WriteLine($"Chưa tạo được CSDL (lần {lan}/20), thử lại sau 3 giây... {ex.GetType().Name}: {ex.Message.Split('\n')[0]}");
            Thread.Sleep(3000);
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("LỖI KHI TẠO CSDL / DỮ LIỆU MẪU. Nếu là lỗi kết nối thì kiểm tra chuỗi 'DailyMan' trong appsettings.json.");
            Console.WriteLine(ex.Message);
            Console.ResetColor();
            throw;
        }
    }
}

if (!app.Environment.IsDevelopment())
    app.UseExceptionHandler("/Home/Error");
app.UseStatusCodePagesWithReExecute("/Home/Error", "?code={0}");

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(name: "areas", pattern: "{area:exists}/{controller=Dashboard}/{action=Index}/{id?}");
app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
