# StockFlow Warehouse

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

StockFlow is a simple full-stack warehouse management system:

- ASP.NET Core Web API backend
- React + Vite frontend
- SQLite with Entity Framework Core

It supports product management, warehouse inventory viewing, order creation with stock reservation, and role-based authorization.

---

## 1) Requirements

- .NET SDK 10
- Node.js 20+
- npm 10+

---

## 2) Quick start

### Backend

From repo root:

1. `dotnet restore`
2. `dotnet run --project StockFlow-Warehouse/StockFlow-Warehouse.csproj`

Backend default URL: `http://localhost:5212`

### Frontend

In a second terminal:

1. `cd StockFlow-Warehouse-frontend`
2. `npm install`
3. `npm run dev`

Frontend default URL: `http://localhost:5173`

---

## 3) Authentication and demo users

Identity endpoints are enabled by backend startup (`/register`, `/login`, `/logout`).

Seeded demo users:

- Admin: `admin@stockflow.local` / `Admin123!`
- Manager: `manager@stockflow.local` / `Manager123!`
- Employee: `employee@stockflow.local` / `Employee123!`

Role policy used for write actions:

- `ManagerOrAdmin`

Meaning:

- Employee can read data
- Manager/Admin can create, update, delete protected resources

---

## 4) Main features

- Product CRUD (with validation)
- Product filtering/sorting by name and price range
- Warehouse status UI with inventory list and low-stock highlighting
- Orders page with line items and stock reservation
- Role-based authorization on write endpoints

---

## 5) API overview (selected)

### Products

- `GET /api/products`
- `GET /api/products/{id}`
- `POST /api/products` (Manager/Admin)
- `PUT /api/products/{id}` (Manager/Admin)
- `DELETE /api/products/{id}` (Manager/Admin)

### Warehouses

- `GET /api/warehouses`
- `GET /api/warehouses/{id}`

### Transactions / Orders

- `GET /api/transactions` (authenticated)
- `GET /api/transactions/orders`
- `POST /api/transactions/orders` (Manager/Admin)
- `DELETE /api/transactions/{id}` (Manager/Admin)

---

## 6) Architecture (high-level)

```mermaid
flowchart LR
		A[React Frontend] -->|HTTP JSON| B[ASP.NET Core Minimal API]
		B --> C[Repository Layer]
		C --> D[EF Core DbContext]
		D --> E[(SQLite)]
		B --> F[ASP.NET Identity + Roles]
```

---

## 7) Domain model (simplified)

```mermaid
classDiagram
		class Product {
			+Guid Id
			+string Name
			+decimal Price
			+string Barcode
			+string Description
		}

		class Category {
			+Guid Id
			+string Name
		}

		class Recipient {
			+Guid Id
			+string Name
			+string Address
			+RecipientType Type
		}

		class InventoryItem {
			+Guid Id
			+Guid WarehouseId
			+Guid ProductId
			+int Quantity
		}

		class Transaction {
			+Guid Id
			+TransactionType Type
			+TransactionState State
			+Guid FromId
			+Guid ToId
			+string TrackingNumber
		}

		class TransactionLine {
			+Guid Id
			+Guid ProductId
			+Guid TransactionId
			+int Amount
			+decimal UnitPrice
			+decimal TotalPrice
		}

		Product "*" -- "*" Category : many-to-many
		Recipient "1" -- "*" InventoryItem : has
		Product "1" -- "*" InventoryItem : stocked as
		Transaction "1" -- "*" TransactionLine : contains
		Product "1" -- "*" TransactionLine : referenced by
```

---

## 8) Design choices and patterns

- **Repository pattern** for product/warehouse data access
- **DTO/request records** for API input validation
- **Policy-based authorization** for role checks
- **Thin frontend API client** (`getJson`, `postJson`, `putJson`, `deleteJson`)

---

## 9) Testing

Test project: `TestWarehouse`

Run tests:

- `dotnet test`

Current tests focus mainly on repository behavior. Next recommended tests are API/authorization integration tests.

---

## 10) Known development note

In development, startup currently deletes and recreates DB (`EnsureDeletedAsync()`), so data resets on restart.

