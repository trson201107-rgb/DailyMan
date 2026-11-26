# Chạy web trong container Linux – không bị Windows (Smart App Control) chặn
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY DailyMan.Web.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
# Render đặt biến PORT (mặc định 10000); chạy local/Docker compose thì dùng 8080
ENV TZ=Asia/Ho_Chi_Minh
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet DailyMan.Web.dll"]
