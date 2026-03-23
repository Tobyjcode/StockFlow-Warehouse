namespace StockFlow_Warehouse.Repositories;

using StockFlow_Warehouse.Model;

public interface ICustomerRepository
{
    Task<List<Recipient>> GetAll();
    Task<Recipient> GetById(Guid id);
    Task Create(Recipient customer);
    Task Delete(Guid id);
    Task Update(Recipient customer);

}