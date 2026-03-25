namespace StockFlow_Warehouse.Repositories;

using Microsoft.EntityFrameworkCore;
using StockFlow_Warehouse.Model;

public class TransactionRepository : ITransactionRepository
{
    private readonly AppDbContext _db;

    public TransactionRepository(AppDbContext db)
    {
        _db = db;
    }

    private IQueryable<Transaction> WithIncludes() =>
        _db.Transactions
            .Include(t => t.From)
            .Include(t => t.To)
            .Include(t => t.LineItems)
                .ThenInclude(li => li.Product)
                    .ThenInclude(p => p.Categories);

    public Task<List<Transaction>> GetAll() =>
        WithIncludes().ToListAsync();

    public Task<Transaction?> GetById(Guid id) =>
        WithIncludes().FirstOrDefaultAsync(t => t.Id == id);

    public Task<List<Transaction>> GetAllOfType(TransactionType type) =>
        WithIncludes().Where(t => t.Type == type).ToListAsync();

    public async Task Create(Transaction transaction)
    {
        await _db.AddAsync(transaction).AsTask();
        await _db.SaveChangesAsync();
    }

    public async Task Delete(Guid id)
    {
        var transaction = await GetById(id);
        if (transaction != null)
        {
            _db.Remove(transaction);
            await _db.SaveChangesAsync();
        }
    }

    public async Task Update(Transaction transaction)
    {
        Guid id = transaction.Id;
        var dbTransaction = await GetById(id);
        if (dbTransaction != null)
        {
            _db.Entry(dbTransaction).CurrentValues.SetValues(transaction);
            await _db.SaveChangesAsync();
        }
    }
}
