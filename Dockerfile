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
ENTRYPOINT ["dotnet", "DailyMan.Web.dll"]
