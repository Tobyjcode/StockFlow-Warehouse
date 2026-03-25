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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function loadWarehouses() {
    try {
      const data = await getJson<Warehouse[]>('/api/warehouses')
      setWarehouses(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id ?? null)
      }
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

  if (loading)
    return <p style={{ textAlign: 'center', paddingTop: '40px' }}>Loading warehouse status...</p>

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

  const selected = filteredWarehouses.find(w => w.id === selectedId)

  return (
    <section className="warehouses-page">
      <h2>Warehouse Status</h2>

      {error ? <p style={{ color: '#dc2626', fontSize: '14px' }}>Could not load warehouses: {error}</p> : null}

      <div className="warehouse-filters">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product, warehouse or address"
          style={{ flex: '1 1 auto', minWidth: '200px' }}
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
        <p style={{ textAlign: 'center', color: '#6b7280', paddingTop: '24px' }}>
          No warehouses found.
        </p>
      ) : (
        <div className="list-detail-layout">
          <div className="list-panel">
            <div className="list-panel-header">Warehouses ({filteredWarehouses.length})</div>
            <ul className="list-panel-items">
              {filteredWarehouses.map(warehouse => (
                <li
                  key={warehouse.id}
                  className={`list-item ${selectedId === warehouse.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(warehouse.id ?? null)}
                >
                  <div>
                    <div className="list-item-name">{warehouse.name ?? 'Unnamed'}</div>
                    <div className="list-item-meta">
                      {warehouse.inventory.length} items
                      {warehouse.lowStockCount > 0 ? ` • ${warehouse.lowStockCount} low stock` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-panel">
            {selected ? (
              <>
                <div className="detail-panel-header">
                  <h3>{selected.name ?? 'Unnamed warehouse'}</h3>
                  <div className="detail-panel-meta">{selected.address ?? 'No address'}</div>
                </div>
                <div className="detail-content">
                  {selected.inventory.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>No inventory items.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {selected.inventory.map((item, j) => {
                        const lowStock = item.quantity < 10
                        return (
                          <div
                            key={item.id ?? j}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: '#f9fafb',
                              borderRadius: '8px',
                              borderLeft: `3px solid ${lowStock ? '#fbbf24' : '#34d399'}`,
                            }}
                          >
                            <span style={{ fontWeight: 500, color: '#1f2937' }}>
                              {item.product?.name ?? 'Unknown product'}
                            </span>
                            <span
                              style={{
                                background: lowStock ? '#fef08a' : '#dcfce7',
                                color: lowStock ? '#854d0e' : '#166534',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontWeight: 500,
                                fontSize: '12px',
                              }}
                            >
                              {item.quantity}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-detail">Select a warehouse to view inventory</div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
