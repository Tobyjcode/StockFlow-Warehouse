namespace StockFlow_Warehouse.Repositories;

using StockFlow_Warehouse.Model;

public interface ISupplierRepository
{
    Task<List<Recipient>> GetAll();
    Task<Recipient> GetById(Guid id);
    Task Create(Recipient supplier);
    Task Delete(Guid id);
    Task Update(Recipient supplier);

}