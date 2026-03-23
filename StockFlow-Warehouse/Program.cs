using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using StockFlow_Warehouse.Model;
using StockFlow_Warehouse.Repositories;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// TODO: fetch username/password or token from environment variables instead of storing them in plaintext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("SQLite")));

builder.Services.AddAuthorization();
builder.Services.AddAuthentication();
builder.Services.AddIdentityApiEndpoints<IdentityUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<IProductRepository, ProductRepository>();

var app = builder.Build();

app.MapIdentityApi<IdentityUser>();

if (app.Environment.IsDevelopment())
{
    Console.WriteLine("Running in development mode");
    app.MapOpenApi();
    app.MapScalarApiReference();
}

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (app.Environment.IsDevelopment())
        await context.Database.EnsureDeletedAsync();
    await context.Database.MigrateAsync();
    await context.SeedDataAsync();
    await AppDbContext.SeedRolesAsync(scope.ServiceProvider);
}

var productApi = app.MapGroup("/api/products");
productApi.MapGet("/", async (IProductRepository repo) =>
        await repo.GetAll())
    .WithName("GetProducts");


productApi.MapGet("/{id}",
        async Task<Results<Ok<Product>, NotFound>> (string id, IProductRepository repo) =>
        {
            if (!Guid.TryParse(id, out var guid))
            {
                return TypedResults.NotFound();
            }

            return await repo.GetById(guid) is { } product
            ? TypedResults.Ok(product)
            : TypedResults.NotFound();
        })
    .WithName("GetProductById");

productApi.MapPost("/",
        async Task<Results<Created<Product>, ValidationProblem>>
        (CreateProductRequest request, IProductRepository repo, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["name"] = ["Name is required."]
                });
            }

            if (request.Price < 0)
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["price"] = ["Price must be 0 or greater."]
                });
            }

            if (await db.Products.AnyAsync(p => p.Name == request.Name.Trim()))
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["name"] = ["A product with this name already exists."]
                });
            }

            var product = new Product
            {
                Name = request.Name.Trim(),
                Price = request.Price,
                Barcode = request.Barcode?.Trim() ?? string.Empty,
                Description = request.Description?.Trim() ?? string.Empty,
            };

            await repo.Create(product);

            return TypedResults.Created($"/api/products/{product.Id}", product);
        })
    .WithName("CreateProduct");

productApi.MapPut("/{id}",
        async Task<Results<Ok<Product>, NotFound, ValidationProblem>>
        (string id, UpdateProductRequest request, IProductRepository repo, AppDbContext db) =>
        {
            if (!Guid.TryParse(id, out var guid))
            {
                return TypedResults.NotFound();
            }

            var existing = await repo.GetById(guid);
            if (existing is null)
            {
                return TypedResults.NotFound();
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["name"] = ["Name is required."]
                });
            }

            if (request.Price < 0)
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["price"] = ["Price must be 0 or greater."]
                });
            }

            if (await db.Products.AnyAsync(p => p.Id != guid && p.Name == request.Name.Trim()))
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["name"] = ["A product with this name already exists."]
                });
            }

            existing.Name = request.Name.Trim();
            existing.Price = request.Price;
            existing.Barcode = request.Barcode?.Trim() ?? string.Empty;
            existing.Description = request.Description?.Trim() ?? string.Empty;

            await repo.Update(existing);
            return TypedResults.Ok(existing);
        })
    .WithName("UpdateProduct");

productApi.MapDelete("/{id}",
        async Task<Results<NoContent, NotFound>> (string id, IProductRepository repo) =>
        {
            if (!Guid.TryParse(id, out var guid))
            {
                return TypedResults.NotFound();
            }

            if (await repo.GetById(guid) is null)
            {
                return TypedResults.NotFound();
            }

            await repo.Delete(guid);
            return TypedResults.NoContent();
        })
    .WithName("DeleteProduct");

var warehousesApi = app.MapGroup("/api/warehouses");
warehousesApi.MapGet("/", async (AppDbContext db) =>
        await db.Recipients
            .Where(r => r.Type == RecipientType.Warehouse)
            .Include(w => w.Inventory)
            .ThenInclude(i => i.Product)
            .ThenInclude(p => p.Categories)
            .ToListAsync())
    .WithName("GetWarehouses");

warehousesApi.MapGet("/{id}", async Task<Results<Ok<Recipient>, NotFound>> (string id, AppDbContext db) =>
        await db.Recipients
            .Where(r => r.Type == RecipientType.Warehouse)
            .FirstOrDefaultAsync(a
            => a.Id.ToString() == id) is { } warehouse
            ? TypedResults.Ok(warehouse)
            : TypedResults.NotFound())
    .WithName("GetWarehouseById");

var transactionsApi = app.MapGroup("/api/transactions");
transactionsApi.MapGet("/", async Task<Results<Ok<List<Transaction>>, UnauthorizedHttpResult>> (AppDbContext db) =>
        await db.Transactions
            .Include(t => t.LineItems)
            .ThenInclude(l => l.Product)
            .ToListAsync() is { } transactions 
            ? TypedResults.Ok(transactions) : TypedResults.Unauthorized())
    .RequireAuthorization()
    .WithName("GetTransactions");

transactionsApi.MapGet("/orders", async (AppDbContext db) =>
        await db.Transactions
            .Where(t => t.Type == TransactionType.Sale || t.Type == TransactionType.Return)
            .Include(t => t.LineItems)
            .ThenInclude(l => l.Product)
            .ToListAsync())
    .WithName("GetOrders");

transactionsApi.MapDelete("/{id}", async Task<Results<Ok, NotFound>> (string id, AppDbContext db) =>
    await db.Transactions
        .Where(t => t.Id.ToString() == id)
        .FirstOrDefaultAsync()
        is not null ? TypedResults.Ok() : TypedResults.NotFound())
    .RequireAuthorization()
    .WithName("DeleteTransaction");

app.Run();

[JsonSerializable(typeof(Product))]
[JsonSerializable(typeof(Category))]
[JsonSerializable(typeof(Recipient))]
[JsonSerializable(typeof(Transaction))]
[JsonSerializable(typeof(InventoryItem))]
[JsonSerializable(typeof(TransactionLine))]
[JsonSerializable(typeof(CreateProductRequest))]
[JsonSerializable(typeof(UpdateProductRequest))]
internal partial class AppJsonSerializerContext : JsonSerializerContext
{
}

internal sealed record CreateProductRequest(
    string Name,
    decimal Price,
    string? Barcode,
    string? Description);

internal sealed record UpdateProductRequest(
    string Name,
    decimal Price,
    string? Barcode,
    string? Description);