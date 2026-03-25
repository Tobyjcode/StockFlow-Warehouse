# StockFlow Warehouse - Technical Documentation

## Overview

StockFlow Warehouse is a full-stack inventory management system designed for e-commerce businesses. It provides REST APIs for inventory management and a responsive web interface for warehouse operators.

**Tech Stack:**
- **Backend:** ASP.NET Core 10 (.NET SDK 10+), Entity Framework Core
- **Frontend:** React 19, TypeScript, Vite
- **Database:** SQLite (dev) / SQL Server (production)
- **Authentication:** ASP.NET Identity with JWT Bearer tokens
- **API:** RESTful with OpenAPI integration

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Web Browser)                     │
│                  React + TypeScript + Vite                      │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐    │
│  │ Auth Page    │ │Products Page │ │ Transactions Page   │    │
│  └──────────────┘ └──────────────┘ └─────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           API Client (api.ts)                          │   │
│  │  - getJson, postJson, putJson, deleteJson             │   │
│  │  - Bearer token authentication                        │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTP/JSON ↑
┌─────────────────────────────────────────────────────────────────┐
│                    ASP.NET Core Backend                         │
│            (StockFlow-Warehouse.sln)                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │            Minimal API Endpoints (Program.cs)        │      │
│  │  - /api/products/* (CRUD + filtering/sorting)        │      │
│  │  - /api/warehouses/* (read-only)                     │      │
│  │  - /api/transactions/orders/* (CRUD + state mgmt)    │      │
│  │  - /auth/* (register, login, logout)                 │      │
│  └──────────────────────────────────────────────────────┘      │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Repository Layer (Repositories/*.cs)         │      │
│  │  - ProductRepository    → Product CRUD              │      │
│  │  - WarehouseRepository  → Warehouse (read)          │      │
│  │  - TransactionRepository → Transaction state mgmt   │      │
│  │  - SupplierRepository   → Supplier CRUD             │      │
│  │  - CustomerRepository   → Customer CRUD             │      │
│  └──────────────────────────────────────────────────────┘      │
│                            ↓                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │    Entity Framework Core / DbContext (Model/)        │      │
│  │         Data Access & ORM Layer                      │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                            ↓                                   
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite / SQL Server                          │
│                      (Database)                                 │
│  - Products, Categories, Transactions                          │
│  - Recipients (Warehouse/Supplier/Customer)                    │
│  - InventoryItems, TransactionLines                            │
│  - AspNetUsers, AspNetRoles (Identity)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema & Entity-Relationship Diagram

### Core Entities

```
┌──────────────────┐         ┌──────────────────┐
│    Product       │◄────────┤    Category      │
├──────────────────┤  M:M    └──────────────────┘
│ - Id (PK)        │
│ - Name           │
│ - Price          │
│ - Barcode (14)   │
│ - Description    │
└──────────────────┘
       ▲
       │ 1:M
       │
┌──────────────────────────────────────────┐
│        TransactionLine                   │
├──────────────────────────────────────────┤
│ - Id (PK)                                │
│ - ProductId (FK → Product)               │
│ - TransactionId (FK → Transaction)       │
│ - Amount                                 │
│ - UnitPrice (snapshot)                   │
└──────────────────────────────────────────┘
       ▲
       │ 1:M
       │
┌──────────────────────────────────────────┐
│       Transaction                        │
├──────────────────────────────────────────┤
│ - Id (PK)                                │
│ - Type (Sale/Purchase/Return/Move)       │
│ - State (Reserved/InTransit/...)        │
│ - FromId (FK → Recipient: Warehouse)     │
│ - ToId (FK → Recipient: destination)     │
│ - TrackingNumber                         │
│ - LineItems (1:M)                        │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│       Recipient                          │
├──────────────────────────────────────────┤
│ - Id (PK)                                │
│ - Name                                   │
│ - Type (Warehouse/Supplier/Customer)     │
│ - Address, Phone, Email                  │
│ - Inventory (1:M → InventoryItem)        │
└──────────────────────────────────────────┘
       ▲
       │ 1:M
       │
┌──────────────────────────────────────────┐
│      InventoryItem                       │
├──────────────────────────────────────────┤
│ - Id (PK)                                │
│ - RecipientId (FK → Recipient)           │
│ - ProductId (FK → Product)               │
│ - Quantity                               │
└──────────────────────────────────────────┘
```

---

## API Endpoints Reference

### Authentication (`/auth`)

```
POST   /auth/register          → Register new user
POST   /auth/login             → Login (returns JWT token)
POST   /auth/logout            → Logout
```

**Authentication:** Bearer token in `Authorization` header
```
Authorization: Bearer <token>
```

### Products (`/api/products`)

```
GET    /api/products            → List products (with filters & sorting)
  Query params:
    - searchTerm (string)       → Search by name
    - category (string)         → Filter by category
    - stockStatus (string)      → 'all', 'in-stock', 'low-stock', 'out-of-stock'
    - minPrice, maxPrice        → Price range filter
    - sortBy (string)           → 'name', 'price'
    - sortOrder (string)        → 'asc', 'desc'

GET    /api/products/{id}       → Get product details
POST   /api/products            → Create product (ManagerOrAdmin)
PUT    /api/products/{id}       → Update product (ManagerOrAdmin)
DELETE /api/products/{id}       → Delete product (ManagerOrAdmin)
```

**Response Example (GET /api/products):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Baked Beans",
    "price": 3.50,
    "barcode": "12345678901234",
    "description": "Tasty beans",
    "categories": [{ "id": "...", "name": "Foodstuffs" }]
  }
]
```

### Warehouses (`/api/warehouses`)

```
GET    /api/warehouses            → List warehouses with inventory
GET    /api/warehouses/{id}       → Get warehouse details with inventory
POST   /api/warehouses            → Create warehouse (ManagerOrAdmin)
PUT    /api/warehouses/{id}       → Update warehouse (ManagerOrAdmin)
DELETE /api/warehouses/{id}       → Delete warehouse (ManagerOrAdmin)
```

### Transactions (`/api/transactions/orders`)

```
GET    /api/transactions/orders   → List transactions (with filters)
  Query params:
    - type (string)              → 'sale', 'purchase', 'return', 'move'
    - state (string)             → 'reserved', 'intransit', 'delivered', etc.

GET    /api/transactions/orders/{id}     → Get transaction details
POST   /api/transactions/orders          → Create transaction (ManagerOrAdmin)
PUT    /api/transactions/orders/{id}     → Update transaction state (ManagerOrAdmin)
DELETE /api/transactions/orders/{id}     → Delete transaction (ManagerOrAdmin)
```

**Response Example (POST /api/transactions/orders):**
```json
{
  "type": "sale",
  "fromWarehouseId": "550e8400-...",
  "toRecipientId": "660e8400-...",
  "lineItems": [
    { "productId": "770e8400-...", "amount": 5 }
  ],
  "trackingNumber": "TRACK-001"
}
```

---

## Authorization & Role-Based Access Control

### Role Hierarchy
- **Admin** — Full system access
- **Manager** — Can create/update/delete products, transactions
- **Employee** — Read-only access
- **ReadOnly** — Limited read access

### Protected Operations
```csharp
// Only Manager or Admin can modify products
app.MapPost("/api/products", (Product product) => {...})
   .RequireAuthorization("ManagerOrAdmin")
   .WithName("CreateProduct");
```

**Demo Users (pre-seeded):**
- `admin@stockflow.local` / `Admin123!` (Admin)
- `manager@stockflow.local` / `Manager123!` (Manager)
- `employee@stockflow.local` / `Employee123!` (Employee)

---

## Design Patterns Used

### 1. **Repository Pattern**
Abstracts data access logic; allows swapping database implementations.

```csharp
public interface IProductRepository {
    Task<List<Product>> GetAll();
    Task<Product?> GetById(Guid id);
    Task Create(Product product);
    Task Update(Product product);
    Task Delete(Guid id);
}
```

### 2. **Dependency Injection**
ASP.NET Core's built-in DI container manages repository lifecycle.

```csharp
// Program.cs
builder.Services.AddScoped<IProductRepository, ProductRepository>();
```

### 3. **Entity Framework Core with Lazy Loading**
ORM for database access with `Include()` for eager loading related data.

```csharp
private IQueryable<Product> WithIncludes() =>
    _db.Products.Include(p => p.Categories);
```

### 4. **Data Snapshot Pattern**
Transaction lines store `UnitPrice` snapshot to prevent price changes affecting history.

```csharp
public class TransactionLine {
    public decimal UnitPrice { get; set; } // Snapshot of product price
}
```

### 5. **State Machine Pattern**
Transaction states follow defined transitions (Reserved → InTransit → Delivered).

```csharp
public enum TransactionState {
    Reserved,   // Initial state
    InTransit,  // After shipment
    Delivered,  // Final state
    Cancelled,  // Cancelled
    Returned    // Returned
}
```

### 6. **API Response Standardization**
Consistent HTTP status codes and error responses.

- `200 OK` — Success with data
- `201 Created` — Resource created
- `204 No Content` — Success without data
- `400 Bad Request` — Validation failure
- `401 Unauthorized` — Authentication required
- `403 Forbidden` — Authorization failure
- `404 Not Found` — Resource not found
- `500 Internal Server Error` — Server error

---

## Frontend Architecture

### Component Structure

```
App.tsx
├── AuthPage.tsx (Authentication)
│   ├── Login form
│   └── Register form
├── HomePage.tsx (Navigation hub)
└── ProductsPage.tsx (Product Management)
    ├── Product list with filtering
    ├── Search, category filter, price range
    ├── Sorting controls
    └── CRUD forms
└── WarehousesPage.tsx (Inventory View)
    ├── Warehouse cards
    ├── Inventory display
    └── Search/filter controls
└── OrdersPage.tsx (Transaction Management)
    ├── Transaction form (all types)
    ├── Type selector (Sale/Return/Move/Purchase)
    ├── State transition UI
    └── Transaction list with actions
```

### State Management
- **Local component state** via `useState`
- **Async data fetching** via `useEffect` with `getJson()`
- **Auth token storage** in localStorage

### API Client Pattern

```typescript
export async function getJson<T>(url: string): Promise<T> {
    // Automatically adds Bearer token to Authorization header
    // Handles 401/403 errors
    // Validates JSON response
}
```

---

## Installation & Setup

### Prerequisites
- .NET SDK 10.0+
- Node.js 20.0+
- npm 10.0+

### Backend Setup

```bash
# Navigate to backend directory
cd StockFlow-Warehouse

# Install dependencies (if needed)
dotnet restore

# Apply database migrations
dotnet ef database update

# Run the backend
dotnet run
# Backend runs on http://localhost:5212
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd StockFlow-Warehouse-frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Frontend runs on http://localhost:5173
```

### Database

**Development:** SQLite (auto-created)
```
Location: ./StockFlow-Warehouse/stockflow.db
```

**Production:** SQL Server
```csharp
// Update Program.cs connection string
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer("Server=...;Database=...;"));
```

---

## Running Tests

### Unit Tests

```bash
# Navigate to test project
cd TestWarehouse

# Run all tests
dotnet test

# Run specific test class
dotnet test --filter "ClassName=ProductRepositoryTests"

# Run with verbose output
dotnet test --verbosity detailed
```

---

## Performance Considerations

### Query Optimization
- **Eager loading** with `Include()` prevents N+1 queries
- **Filtering in database** reduces data transfer
- **Pagination** for large datasets (can be added)

### Caching (Future Enhancement)
- Product catalog (low-update frequency)
- Warehouse inventory (via SignalR for real-time updates)

### Database Indexing
- Product.Name indexed for search performance
- Transaction.Type, Transaction.State indexed for filtering

---

## Security Features

### Authentication & Authorization
✓ ASP.NET Identity with password hashing
✓ JWT Bearer token authentication
✓ Role-based access control (4 roles)
✓ Policy-based authorization

### Data Validation
✓ Product name uniqueness check
✓ Price ≥ 0 validation
✓ Stock quantity validation
✓ Transaction state validation

### Error Handling
✓ Graceful error responses (no stack traces exposed)
✓ Validation error details returned to client
✓ 401/403 distinguished from other errors

---

## Deployment Checklist

- [ ] Configure production database connection string
- [ ] Enable HTTPS (ASP.NET Core default)
- [ ] Set strong JWT secret key
- [ ] Disable swagger/debug endpoints in production
- [ ] Configure CORS for frontend domain
- [ ] Enable database backups
- [ ] Set up error logging (Serilog recommended)
- [ ] Configure rate limiting if needed
- [ ] Update API key management for external integrations

---

## Future Enhancements

1. **Real-time Updates** — SignalR for live inventory sync
2. **Pagination** — Handle large product/transaction lists
3. **Advanced Reporting** — Sales analytics, inventory forecasting
4. **Mobile App** — React Native version
5. **Payment Integration** — Stripe/PayPal for online sales
6. **Barcode Scanning** — Inventory receiving automation
7. **Multi-tenant Support** — Multiple warehouse chains
8. **Audit Logging** — Track all inventory changes
9. **PDF Export** — Generate invoices/packing slips
10. **Notification System** — Low-stock alerts, order confirmations

---

## Troubleshooting

### Common Issues

**Issue:** Database migration fails
```bash
# Solution: Reset database
dotnet ef database drop
dotnet ef database update
```

**Issue:** CORS errors when frontend calls backend
```csharp
# Solution: Update Program.cs CORS configuration
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});
```

**Issue:** Authentication token expired
```
Frontend catches 401 error → Redirects to Auth page for re-login
```

---

## References

- [ASP.NET Core Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis)
- [Entity Framework Core](https://learn.microsoft.com/en-us/ef/core/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
