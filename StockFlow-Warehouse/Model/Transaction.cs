using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace StockFlow_Warehouse.Model;

public enum TransactionType
{
    Sale,
    Purchase,
    Return,
    Move
}

public enum TransactionState
{
    Reserved,
    InTransit,
    Delivered,
    Cancelled,
    Returned
}

public class TransactionLine
{
    public TransactionLine() { }

    public TransactionLine(Product product, Transaction transaction, int amount)
    {
        Product = product;
        ProductId = product.Id;
        Transaction = transaction;
        TransactionId = transaction.Id;
        Amount = amount;
        UnitPrice = product.Price;
    }

    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? TransactionId { get; set; }
    [JsonIgnore]
    public Transaction Transaction { get; set; } = null!;

    public int Amount { get; set; }
    // Snapshot price to avoid later price changes affecting existing transactions
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice => UnitPrice * Amount;
}
public class Transaction
{
    public Guid Id { get; set; }
    // Consider inferring Type from type of From & To fields
    public required TransactionType Type { get; set; }
    public TransactionState State { get; set; } = TransactionState.Reserved;
    public Guid? FromId { get; set; }
    public Recipient? From { get; set; }
    public Guid? ToId { get; set; }
    public Recipient? To { get; set; }
    public List<TransactionLine> LineItems { get; set; } = [];
    [MaxLength(50)]
    public string TrackingNumber { get; set; } = "";
    public decimal TotalPrice => LineItems.Sum(p => p.TotalPrice);
};