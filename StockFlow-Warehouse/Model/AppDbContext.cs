using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace StockFlow_Warehouse.Model;

// TODO: Use compiled model so we can enable AOT and Trimming on publish
public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<IdentityUser, IdentityRole, string>(options)
{
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Recipient> Recipients { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<InventoryItem> InventoryItems { get; set; }
    public DbSet<TransactionLine> TransactionLines { get; set; }

    public static async Task SeedRolesAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        string[] roleNames = ["ReadOnly", "Employee", "Manager", "Admin"];

        foreach (var roleName in roleNames)
        {
            var roleExist = await roleManager.RoleExistsAsync(roleName);
            if (!roleExist)
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<Transaction>()
            .HasOne(t => t.From)
            .WithMany()
            .HasForeignKey(t => t.FromId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Transaction>()
            .HasOne(t => t.To)
            .WithMany()
            .HasForeignKey(t => t.ToId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Transaction>()
            .HasMany(t => t.LineItems)
            .WithOne(li => li.Transaction)
            .HasForeignKey(li => li.TransactionId);

        builder.Entity<TransactionLine>()
            .HasOne(t => t.Product)
            .WithMany()
            .HasForeignKey(t => t.ProductId);

        builder.Entity<Product>()
            .HasMany(p => p.Categories)
            .WithMany(c => c.Products);

        builder.Entity<Recipient>()
            .HasMany(w => w.Inventory)
            .WithOne(w => w.Warehouse)
            .HasForeignKey(i => i.WarehouseId);

        builder.Entity<InventoryItem>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId);
        
        base.OnModelCreating(builder);
    }

    public async Task SeedDataAsync()
    {
        await Database.EnsureCreatedAsync();
        if (Products.Any() || Categories.Any() || Recipients.Any() || Transactions.Any())
        {
            return;
        }

        var categories = new List<Category>
        {
            new() { Name = "Foodstuffs" }
        };

        var products = new List<Product>
        {
            new()
            {
                Name = "Baked Beans",
                Categories = categories,
                Price = 3.50m
            },
            new()
            {
                Name = "Choccy Cola",
                Categories = categories,
                Price = 8.50m
            }
        };

        var warehouses = new List<Recipient>
        {
            new()
            {
                Name = "Warehouse A",
                Address = "Kannikegade 18.1, DK-8200 Aarhus C",
                Type = RecipientType.Warehouse,
                PhoneNumber = "004512345678",
            },
            new()
            {
                Name = "Warehouse B",
                Address = "Silkeborgvej 1, DK-8600 Silkeborg",
                Type = RecipientType.Warehouse,
                Email = "emil@heilbo.dev",
            }
        };

        warehouses.ForEach(warehouse =>
            warehouse.Inventory = products
                .Select(product => new InventoryItem(warehouse, product, 100)).ToList());

        await Categories.AddRangeAsync(categories);
        await Products.AddRangeAsync(products);
        await Recipients.AddRangeAsync(warehouses);

        var testTransaction = new Transaction
        {
            Type = TransactionType.Sale,
            From = warehouses[0],
            To = warehouses[1]
        };

        testTransaction.LineItems =
        [
            new TransactionLine(products[0], testTransaction, 1),
            new TransactionLine(products[1], testTransaction, 1)
        ];

        await Transactions.AddAsync(testTransaction);

        await SaveChangesAsync();
    }
}