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

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ManagerOrAdmin", policy =>
        policy.RequireRole("Manager", "Admin"));
});
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

app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Keep local data between restarts.
    // If a full reset is needed, delete the DB manually.
    await context.Database.MigrateAsync();
    await context.SeedDataAsync();
    await AppDbContext.SeedRolesAsync(scope.ServiceProvider);
    await AppDbContext.SeedDemoUsersAsync(scope.ServiceProvider);
}

var productApi = app.MapGroup("/api/products");
productApi.MapGet("/",
        async Task<Results<Ok<List<Product>>, BadRequest<string>>>
    (string? search, string? category, string? stockStatus, decimal? minPrice, decimal? maxPrice, string? sort, string? dir, AppDbContext db) =>
        {
            if (minPrice is < 0 || maxPrice is < 0)
            {
                return TypedResults.BadRequest("minPrice and maxPrice must be 0 or greater.");
            }

            if (minPrice.HasValue && maxPrice.HasValue && minPrice > maxPrice)
            {
                return TypedResults.BadRequest("minPrice cannot be greater than maxPrice.");
            }

            var sortBy = (sort ?? "name").Trim().ToLowerInvariant();
            var direction = (dir ?? "asc").Trim().ToLowerInvariant();
            var status = (stockStatus ?? "all").Trim().ToLowerInvariant();

            if (sortBy is not ("name" or "price"))
            {
                return TypedResults.BadRequest("sort must be 'name' or 'price'.");
            }

            if (direction is not ("asc" or "desc"))
            {
                return TypedResults.BadRequest("dir must be 'asc' or 'desc'.");
            }

            if (status is not ("all" or "in-stock" or "low-stock" or "out-of-stock"))
            {
                return TypedResults.BadRequest("stockStatus must be 'all', 'in-stock', 'low-stock', or 'out-of-stock'.");
            }

            var query = db.Products
                .Include(p => p.Categories)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(p => p.Name.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                var categoryTerm = category.Trim();
                query = query.Where(p => p.Categories.Any(c => c.Name.Contains(categoryTerm)));
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => p.Price >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice.Value);
            }

            query = status switch
            {
                "in-stock" => query.Where(p =>
                    (db.InventoryItems
                        .Where(i => i.ProductId == p.Id)
                        .Sum(i => (int?)i.Quantity) ?? 0) > 0),
                "out-of-stock" => query.Where(p =>
                    (db.InventoryItems
                        .Where(i => i.ProductId == p.Id)
                        .Sum(i => (int?)i.Quantity) ?? 0) == 0),
                "low-stock" => query.Where(p =>
                    (db.InventoryItems
                        .Where(i => i.ProductId == p.Id)
                        .Sum(i => (int?)i.Quantity) ?? 0) > 0
                    &&
                    (db.InventoryItems
                        .Where(i => i.ProductId == p.Id)
                        .Sum(i => (int?)i.Quantity) ?? 0) < 10),
                _ => query
            };

            query = (sortBy, direction) switch
            {
                ("price", "desc") => query.OrderByDescending(p => p.Price),
                ("price", _) => query.OrderBy(p => p.Price),
                ("name", "desc") => query.OrderByDescending(p => p.Name),
                _ => query.OrderBy(p => p.Name)
            };

            return TypedResults.Ok(await query.ToListAsync());
        })
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
    .RequireAuthorization("ManagerOrAdmin")
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
    .RequireAuthorization("ManagerOrAdmin")
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
    .RequireAuthorization("ManagerOrAdmin")
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

transactionsApi.MapGet("/orders",
        async Task<Results<Ok<List<Transaction>>, BadRequest<string>>>
        (string? type, string? state, AppDbContext db) =>
        {
            var typeFilter = (type ?? "all").Trim().ToLowerInvariant();
            var stateFilter = (state ?? "all").Trim().ToLowerInvariant();

            if (typeFilter is not ("all" or "sale" or "return"))
            {
                return TypedResults.BadRequest("type must be 'all', 'sale', or 'return'.");
            }

            var query = db.Transactions
                .Where(t => t.Type == TransactionType.Sale || t.Type == TransactionType.Return)
                .Include(t => t.From)
                .Include(t => t.To)
                .Include(t => t.LineItems)
                .ThenInclude(l => l.Product)
                .AsQueryable();

            query = typeFilter switch
            {
                "sale" => query.Where(t => t.Type == TransactionType.Sale),
                "return" => query.Where(t => t.Type == TransactionType.Return),
                _ => query,
            };

            if (stateFilter != "all")
            {
                if (!Enum.TryParse<TransactionState>(stateFilter, true, out var parsedState))
                {
                    return TypedResults.BadRequest("state must be 'all' or a valid transaction state.");
                }

                query = query.Where(t => t.State == parsedState);
            }

            return TypedResults.Ok(await query.ToListAsync());
        })
    .WithName("GetOrders");

transactionsApi.MapPost("/orders",
        async Task<Results<Created<Transaction>, ValidationProblem, NotFound>>
        (CreateOrderRequest request, AppDbContext db) =>
        {
            if (request.LineItems.Count == 0)
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["lineItems"] = ["At least one line item is required."]
                });
            }

            var fromWarehouse = await db.Recipients
                .Where(r => r.Type == RecipientType.Warehouse)
                .Include(r => r.Inventory)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(r => r.Id == request.FromWarehouseId);

            if (fromWarehouse is null)
            {
                return TypedResults.NotFound();
            }

            var toRecipient = await db.Recipients
                .FirstOrDefaultAsync(r => r.Id == request.ToRecipientId);

            if (toRecipient is null)
            {
                return TypedResults.NotFound();
            }

            var mergedLineItems = request.LineItems
                .GroupBy(li => li.ProductId)
                .Select(g => new OrderLineRequest(g.Key, g.Sum(li => li.Amount)))
                .ToList();

            if (mergedLineItems.Any(li => li.Amount <= 0))
            {
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["lineItems"] = ["Amount must be greater than 0 for all line items."]
                });
            }

            foreach (var line in mergedLineItems)
            {
                var stockItem = fromWarehouse.Inventory
                    .FirstOrDefault(i => i.ProductId == line.ProductId);

                if (stockItem is null)
                {
                    return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                    {
                        ["lineItems"] = [$"Product {line.ProductId} is not in warehouse inventory."]
                    });
                }

                if (stockItem.Quantity < line.Amount)
                {
                    return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                    {
                        ["lineItems"] =
                        [$"Not enough stock for product {line.ProductId}. Requested {line.Amount}, available {stockItem.Quantity}."]
                    });
                }
            }

            var transaction = new Transaction
            {
                Type = TransactionType.Sale,
                State = TransactionState.Reserved,
                From = fromWarehouse,
                To = toRecipient,
                TrackingNumber = request.TrackingNumber?.Trim() ?? string.Empty
            };

            foreach (var line in mergedLineItems)
            {
                var stockItem = fromWarehouse.Inventory
                    .First(i => i.ProductId == line.ProductId);

                stockItem.Quantity -= line.Amount;
                transaction.LineItems.Add(new TransactionLine(stockItem.Product, transaction, line.Amount));
            }

            await db.Transactions.AddAsync(transaction);
            await db.SaveChangesAsync();

            return TypedResults.Created($"/api/transactions/{transaction.Id}", transaction);
        })
    .RequireAuthorization("ManagerOrAdmin")
    .WithName("CreateOrder");

transactionsApi.MapDelete("/{id}", async Task<Results<Ok, NotFound>> (string id, AppDbContext db) =>
    await db.Transactions
        .Where(t => t.Id.ToString() == id)
        .FirstOrDefaultAsync()
        is not null ? TypedResults.Ok() : TypedResults.NotFound())
    .RequireAuthorization("ManagerOrAdmin")
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
[JsonSerializable(typeof(CreateOrderRequest))]
[JsonSerializable(typeof(OrderLineRequest))]
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

internal sealed record CreateOrderRequest(
    Guid FromWarehouseId,
    Guid ToRecipientId,
    List<OrderLineRequest> LineItems,
    string? TrackingNumber);

internal sealed record OrderLineRequest(
    Guid ProductId,
    int Amount);