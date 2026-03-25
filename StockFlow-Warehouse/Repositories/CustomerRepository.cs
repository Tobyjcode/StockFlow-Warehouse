namespace StockFlow_Warehouse.Repositories;

using Microsoft.EntityFrameworkCore;
using StockFlow_Warehouse.Model;

public class CustomerRepository : ICustomerRepository
{
    private readonly AppDbContext _db;

    public CustomerRepository(AppDbContext db)
    {
        _db = db;
    }

    private IQueryable<Recipient> WithIncludes() =>
        _db.Recipients
            .Where(r => r.Type == RecipientType.Customer)
            .Include(c => c.Inventory)
                .ThenInclude(pa => pa.Product)
                    .ThenInclude(p => p.Categories);

    public Task<List<Recipient>> GetAll() =>
        WithIncludes().ToListAsync();

    public Task<Recipient?> GetById(Guid id) =>
        WithIncludes().FirstOrDefaultAsync(c => c.Id == id);

    public async Task Create(Recipient customer)
    {
        customer.Type = RecipientType.Customer;
        await _db.AddAsync(customer).AsTask();
        await _db.SaveChangesAsync();
    }

    public async Task Delete(Guid id)
    {
        var customer = await GetById(id);
        if (customer != null)
        {
            _db.Remove(customer);
            await _db.SaveChangesAsync();
        }
    }

    public async Task Update(Recipient customer)
    {
        Guid id = customer.Id;
        var dbCustomer = await GetById(id);
        if (dbCustomer != null)
        {
            customer.Type = RecipientType.Customer;
            _db.Entry(dbCustomer).CurrentValues.SetValues(customer);
            await _db.SaveChangesAsync();
        }
    }
}