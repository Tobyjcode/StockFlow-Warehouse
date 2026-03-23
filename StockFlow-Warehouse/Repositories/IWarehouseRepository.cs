namespace StockFlow_Warehouse.Repositories;

using StockFlow_Warehouse.Model;

public interface IWarehouseRepository
{
    Task<List<Recipient>> GetAll();
    Task<Recipient> GetById(Guid id);
    Task Create(Recipient warehouse);
    Task Delete(Guid id);
    Task Update(Recipient warehouse);

}