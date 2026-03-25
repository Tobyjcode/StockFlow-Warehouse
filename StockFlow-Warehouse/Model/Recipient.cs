using System.ComponentModel.DataAnnotations;

namespace StockFlow_Warehouse.Model;

public enum RecipientType
{
    Warehouse,
    Supplier,
    Customer
}

public class Recipient
{
    public Guid Id { get; set; }
    [MaxLength(100)]
    public required string Name { get; set; } = "";
    [MaxLength(100)]
    public required string Address { get; set; } = "";
    [MaxLength(20), Phone]
    public string? PhoneNumber { get; set; }
    [MaxLength(50), EmailAddress]
    public string? Email { get; set; }
    public required RecipientType Type { get; set; }
    public List<InventoryItem> Inventory { get; set; } = [];
}
