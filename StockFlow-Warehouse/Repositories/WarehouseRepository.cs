namespace StockFlow_Warehouse.Repositories;

using Microsoft.EntityFrameworkCore;
using StockFlow_Warehouse.Repositories;
using StockFlow_Warehouse.Model;

public class WarehouseRepository(AppDbContext db) : IWarehouseRepository
{
    private IQueryable<Recipient> WithIncludes() =>
        db.Recipients
            .Where(r => r.Type == RecipientType.Warehouse)
            .Include(w => w.Inventory)
                .ThenInclude(pa => pa.Product)
                    .ThenInclude(p => p.Categories);

    public Task<List<Recipient>> GetAll() =>
        WithIncludes().ToListAsync();

    public Task<Recipient?> GetById(Guid id) =>
        WithIncludes().FirstOrDefaultAsync(a
            => a.Id == id);

    public async Task Create(Recipient warehouse)
    {
        await db.AddAsync(warehouse).AsTask();
        await db.SaveChangesAsync();
    }

    public async Task Delete(Guid id)
    {
        var product = await GetById(id);
        if (product != null)
        {
            db.Remove(product);
            await db.SaveChangesAsync();
        }
    }

    public async Task Update(Recipient warehouse)
    {
        Guid id = warehouse.Id;
        var dbProduct = await GetById(id);
        if (dbProduct != null)
        {
            db.Entry(dbProduct).CurrentValues.SetValues(warehouse);
            await db.SaveChangesAsync();
        }
    }
}