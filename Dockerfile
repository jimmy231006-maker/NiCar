FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY NiCar.csproj .
RUN dotnet restore NiCar.csproj
COPY . .
RUN dotnet publish NiCar.csproj -c Release --no-restore -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
USER app
EXPOSE 10000
CMD ["sh", "-c", "exec dotnet NiCar.dll --urls http://0.0.0.0:${PORT:-10000}"]
