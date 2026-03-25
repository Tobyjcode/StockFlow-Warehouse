namespace StockFlow_Warehouse.Repositories;

using Microsoft.EntityFrameworkCore;
using StockFlow_Warehouse.Model;

public class SupplierRepository : ISupplierRepository
{
    private readonly AppDbContext _db;

    public SupplierRepository(AppDbContext db)
    {
        _db = db;
    }

    private IQueryable<Recipient> WithIncludes() =>
        _db.Recipients
            .Where(r => r.Type == RecipientType.Supplier)
            .Include(s => s.Inventory)
                .ThenInclude(pa => pa.Product)
                    .ThenInclude(p => p.Categories);

    public Task<List<Recipient>> GetAll() =>
        WithIncludes().ToListAsync();

    public Task<Recipient?> GetById(Guid id) =>
        WithIncludes().FirstOrDefaultAsync(s => s.Id == id);

    public async Task Create(Recipient supplier)
    {
        supplier.Type = RecipientType.Supplier;
        await _db.AddAsync(supplier).AsTask();
        await _db.SaveChangesAsync();
    }

    public async Task Delete(Guid id)
    {
        var supplier = await GetById(id);
        if (supplier != null)
        {
            _db.Remove(supplier);
            await _db.SaveChangesAsync();
        }
    }

    public async Task Update(Recipient supplier)
    {
        Guid id = supplier.Id;
        var dbSupplier = await GetById(id);
        if (dbSupplier != null)
        {
            supplier.Type = RecipientType.Supplier;
            _db.Entry(dbSupplier).CurrentValues.SetValues(supplier);
            await _db.SaveChangesAsync();
        }
    }
}
