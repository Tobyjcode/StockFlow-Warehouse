using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace StockFlow_Warehouse.Model;

public class Category
{
    public Guid Id { get; set; }
    [MaxLength(100)]
    public required string Name { get; set; }
    [JsonIgnore]
    public List<Product> Products { get; set; } = [];
}

public class Product
{
    public Guid Id { get; set; }
    [MaxLength(100)]
    public required string Name { get; set; }
    [Precision(10, 2)]
    public decimal Price { get; set; }
    [MaxLength(14), RegularExpression("^[0-9]{0,14}$")]
    public string Barcode { get; set; } = "";
    [MaxLength(1200)]
    public string Description { get; set; } = "";
    public List<Category> Categories { get; set; } = [];
}

public class InventoryItem
{
    public InventoryItem() { }

    public InventoryItem(Recipient warehouse, Product product, int quantity)
    {
        Warehouse = warehouse;
        WarehouseId = warehouse.Id;
        Product = product;
        ProductId = product.Id;
        Quantity = quantity;
    }

    public Guid Id { get; set; }
    public Guid? WarehouseId { get; set; }
    [JsonIgnore]
    public Recipient Warehouse { get; set; } = null!;
    public Guid? ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
}