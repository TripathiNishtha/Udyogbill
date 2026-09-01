FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish $(find . -name "*.csproj" | grep -i "api" | head -n 1) -c Release -o /app/publish || dotnet publish $(find . -name "*.csproj" | head -n 1) -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "UdyogBill.Api.dll"]
