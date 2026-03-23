using Microsoft.EntityFrameworkCore;
using StockFlow_Warehouse.Model;
using StockFlow_Warehouse.Repositories;

namespace TestWarehouse;

public class WarehouseRepositoryTests
{
    private AppDbContext _db = null!;
    private WarehouseRepository _repo = null!;

    [SetUp]
    public void Setup()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _repo = new WarehouseRepository(_db);
    }

    [TearDown]
    public void TearDown() => _db.Dispose();

    // GetAll

    [Test]
    public async Task GetAll_EmptyDatabase_ReturnsEmptyList()
    {
        var result = await _repo.GetAll();
        Assert.That(result, Is.Empty);
    }

    [Test]
    public async Task GetAll_WithWarehouses_ReturnsAll()
    {
        _db.Recipients.AddRange(
            new Recipient { Name = "Warehouse A", Address = "Address A", Type = RecipientType.Warehouse },
            new Recipient { Name = "Warehouse B", Address = "Address B", Type = RecipientType.Warehouse }
        );
        await _db.SaveChangesAsync();

        var result = await _repo.GetAll();

        Assert.That(result, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task GetAll_IncludesProducts()
    {
        var product = new Product { Name = "Beans" };
        _db.Recipients.Add(new Recipient
        {
            Name = "Warehouse A",
            Address = "Address A",
            Type = RecipientType.Warehouse,
            Inventory = [new InventoryItem { Product = product, Quantity = 5 }]
        });
        await _db.SaveChangesAsync();

        var result = await _repo.GetAll();

        Assert.That(result[0].Inventory, Has.Count.EqualTo(1));
        Assert.That(result[0].Inventory[0].Quantity, Is.EqualTo(5));
    }

    // GetById

    [Test]
    public async Task GetById_ExistingId_ReturnsWarehouse()
    {
        var warehouse = new Recipient { Name = "Warehouse A", Address = "Address A", Type = RecipientType.Warehouse };
        _db.Recipients.Add(warehouse);
        await _db.SaveChangesAsync();

        var result = await _repo.GetById(warehouse.Id);

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Name, Is.EqualTo("Warehouse A"));
    }

    [Test]
    public async Task GetById_NonExistentId_ReturnsNull()
    {
        var result = await _repo.GetById(Guid.NewGuid());
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task GetById_IncludesProducts()
    {
        var product = new Product { Name = "Cola" };
        var warehouse = new Recipient
        {
            Name = "Warehouse A",
            Address = "Address A",
            Type = RecipientType.Warehouse,
            Inventory = [new InventoryItem { Product = product, Quantity = 3 }]
        };
        _db.Recipients.Add(warehouse);
        await _db.SaveChangesAsync();

        var result = await _repo.GetById(warehouse.Id);

        Assert.That(result!.Inventory, Has.Count.EqualTo(1));
        Assert.That(result.Inventory[0].Quantity, Is.EqualTo(3));
    }

    // Create

    [Test]
    public async Task Create_AddsWarehouseToDatabase()
    {
        var warehouse = new Recipient { Name = "Warehouse A", Address = "Address A", Type = RecipientType.Warehouse };

        await _repo.Create(warehouse);

        Assert.That(await _db.Recipients.CountAsync(), Is.EqualTo(1));
    }

    [Test]
    public async Task Create_WarehouseIsRetrievableAfterCreation()
    {
        var warehouse = new Recipient { Name = "Warehouse A", Address = "Address A", Type = RecipientType.Warehouse };

        await _repo.Create(warehouse);

        var stored = await _db.Recipients.FindAsync(warehouse.Id);
        Assert.That(stored, Is.Not.Null);
        Assert.That(stored!.Name, Is.EqualTo("Warehouse A"));
    }

    // Delete

    [Test]
    public async Task Delete_ExistingWarehouse_RemovesItFromDatabase()
    {
        var warehouse = new Recipient { Name = "Warehouse A", Address = "Address A", Type = RecipientType.Warehouse };
        _db.Recipients.Add(warehouse);
        await _db.SaveChangesAsync();

        await _repo.Delete(warehouse.Id);

        Assert.That(await _db.Recipients.CountAsync(), Is.EqualTo(0));
    }

    [Test]
    public async Task Delete_NonExistentId_DoesNotThrow()
    {
        Assert.DoesNotThrowAsync(() => _repo.Delete(Guid.NewGuid()));
    }

    [Test]
    public async Task Delete_OnlyDeletesTargetWarehouse()
    {
        var target = new Recipient { Name = "Warehouse A", Address = "Address A", Type = RecipientType.Warehouse };
        var other = new Recipient { Name = "Warehouse B", Address = "Address B", Type = RecipientType.Warehouse };
        _db.Recipients.AddRange(target, other);
        await _db.SaveChangesAsync();

        await _repo.Delete(target.Id);

        Assert.That(await _db.Recipients.CountAsync(), Is.EqualTo(1));
        Assert.That(await _db.Recipients.FindAsync(other.Id), Is.Not.Null);
    }

    // Update

    [Test]
    public async Task Update_ChangesWarehouseName()
    {
        var warehouse = new Recipient { Name = "Old Name", Address = "Address A", Type = RecipientType.Warehouse };
        _db.Recipients.Add(warehouse);
        await _db.SaveChangesAsync();

        warehouse.Name = "New Name";
        await _repo.Update(warehouse);

        var updated = await _db.Recipients.FindAsync(warehouse.Id);
        Assert.That(updated!.Name, Is.EqualTo("New Name"));
    }

    [Test]
    public async Task Update_ChangesWarehouseAddress()
    {
        var warehouse = new Recipient { Name = "Warehouse A", Address = "Old Address", Type = RecipientType.Warehouse };
        _db.Recipients.Add(warehouse);
        await _db.SaveChangesAsync();

        warehouse.Address = "New Address";
        await _repo.Update(warehouse);

        var updated = await _db.Recipients.FindAsync(warehouse.Id);
        Assert.That(updated!.Address, Is.EqualTo("New Address"));
    }

    [Test]
    public async Task Update_NonExistentWarehouse_DoesNotThrow()
    {
        var ghost = new Recipient { Name = "Ghost", Address = "Nowhere", Type = RecipientType.Warehouse };
        Assert.DoesNotThrowAsync(() => _repo.Update(ghost));
    }

    [Test]
    public async Task Update_DoesNotAffectOtherWarehouses()
    {
        var target = new Recipient { Name = "Target", Address = "Address A", Type = RecipientType.Warehouse };
        var other = new Recipient { Name = "Other", Address = "Address B", Type = RecipientType.Warehouse };
        _db.Recipients.AddRange(target, other);
        await _db.SaveChangesAsync();

        target.Name = "Updated Target";
        await _repo.Update(target);

        var unchanged = await _db.Recipients.FindAsync(other.Id);
        Assert.That(unchanged!.Name, Is.EqualTo("Other"));
    }
}