import { useEffect, useState } from 'react'
import { getJson } from '../api'

type Product = {
  id?: string
  name?: string
}

type InventoryItem = {
  id?: string
  quantity: number
  product?: Product
}

type Warehouse = {
  id?: string
  name?: string
  address?: string
  inventory: InventoryItem[]
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'low-stock'>('name')

  async function loadWarehouses() {
    try {
      const data = await getJson<Warehouse[]>('/api/warehouses')
      setWarehouses(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWarehouses()
  }, [])

  if (loading) return <p>Loading warehouse status...</p>

  const term = search.trim().toLowerCase()
  const filteredWarehouses = warehouses
    .map(warehouse => {
      const filteredInventory = warehouse.inventory.filter(item => {
        const productName = item.product?.name?.toLowerCase() ?? ''
        const nameMatch = !term || productName.includes(term)
        const lowMatch = !lowStockOnly || item.quantity < 10
        return nameMatch && lowMatch
      })

      const warehouseMatch =
        !term ||
        (warehouse.name?.toLowerCase().includes(term) ?? false) ||
        (warehouse.address?.toLowerCase().includes(term) ?? false)

      return {
        ...warehouse,
        inventory: warehouseMatch ? warehouse.inventory : filteredInventory,
        lowStockCount: warehouse.inventory.filter(item => item.quantity < 10).length,
      }
    })
    .filter(warehouse => warehouse.inventory.length > 0)
    .sort((a, b) => {
      if (sortBy === 'low-stock') {
        return b.lowStockCount - a.lowStockCount
      }

      const nameA = (a.name ?? '').toLowerCase()
      const nameB = (b.name ?? '').toLowerCase()
      return nameA.localeCompare(nameB)
    })

  return (
    <section className="warehouses-page">
      <h2>Warehouse Status</h2>

      {error ? <p className="error">Could not load warehouses: {error}</p> : null}

      <div className="warehouse-filters">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product, warehouse or address"
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'name' | 'low-stock')}>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="low-stock">Sort: Most low stock first</option>
        </select>
        <label className="warehouse-checkbox">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={e => setLowStockOnly(e.target.checked)}
          />
          Low stock only (&lt; 10)
        </label>
      </div>

      {filteredWarehouses.length === 0 ? (
        <p>No warehouses found.</p>
      ) : (
        <div className="warehouse-grid">
          {filteredWarehouses.map((warehouse, i) => (
            <article key={warehouse.id ?? i} className="warehouse-card">
              <h3>{warehouse.name ?? 'Unnamed warehouse'}</h3>
              <p className="warehouse-address">{warehouse.address ?? 'No address'}</p>

              {warehouse.inventory.length === 0 ? (
                <p>No inventory items.</p>
              ) : (
                <ul className="inventory-list">
                  {warehouse.inventory.map((item, j) => {
                    const lowStock = item.quantity < 10
                    return (
                      <li key={item.id ?? j} className="inventory-item">
                        <span>{item.product?.name ?? 'Unknown product'}</span>
                        <span className={lowStock ? 'stock-pill low' : 'stock-pill'}>
                          {item.quantity}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      <p>
        <button type="button" onClick={() => void loadWarehouses()}>
          Refresh
        </button>
      </p>
    </section>
  )
}
