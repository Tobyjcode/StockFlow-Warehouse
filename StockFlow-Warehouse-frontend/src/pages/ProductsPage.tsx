import { useEffect, useState } from 'react'
import { deleteJson, getJson, postJson, putJson } from '../api'

type Product = {
  id?: string
  name: string
  price: number
  barcode?: string
  description?: string
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('0')
  const [editBarcode, setEditBarcode] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stockStatus, setStockStatus] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<'name' | 'price'>('name')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')

  function isAuthError(err: unknown) {
    return err instanceof Error && (err.message.startsWith('Unauthorized') || err.message.startsWith('Forbidden'))
  }

  function buildProductsUrl() {
    const params = new URLSearchParams()

    if (search.trim()) params.set('search', search.trim())
    if (category.trim()) params.set('category', category.trim())
    params.set('stockStatus', stockStatus)
    if (minPrice.trim()) params.set('minPrice', minPrice.trim())
    if (maxPrice.trim()) params.set('maxPrice', maxPrice.trim())
    params.set('sort', sort)
    params.set('dir', dir)

    const query = params.toString()
    return query ? `/api/products?${query}` : '/api/products'
  }

  async function loadProducts() {
    try {
      const data = await getJson<Product[]>(buildProductsUrl())
      setItems(data)
      setError(null)
      setAuthRequired(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuthRequired(isAuthError(err))
    }
  }

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        const data = await getJson<Product[]>(buildProductsUrl())
        if (mounted) setItems(data)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        name,
        price: Number(price),
        barcode,
        description,
      }

      const created = await postJson<Product>('/api/products', payload)
      setItems(prev => [created, ...prev])
      setName('')
      setPrice('0')
      setBarcode('')
      setDescription('')
      setAuthRequired(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuthRequired(isAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApplyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await loadProducts()
  }

  async function handleResetFilters() {
    setSearch('')
    setCategory('')
    setStockStatus('all')
    setMinPrice('')
    setMaxPrice('')
    setSort('name')
    setDir('asc')

    try {
      const data = await getJson<Product[]>('/api/products?sort=name&dir=asc')
      setItems(data)
      setError(null)
      setAuthRequired(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuthRequired(isAuthError(err))
    }
  }

  async function handleDelete(productId?: string) {
    if (!productId) return

    try {
      await deleteJson(`/api/products/${productId}`)
      setItems(prev => prev.filter(p => p.id !== productId))
      setAuthRequired(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuthRequired(isAuthError(err))
    }
  }

  function startEdit(product: Product) {
    if (!product.id) return

    setEditingId(product.id)
    setEditName(product.name)
    setEditPrice(String(product.price))
    setEditBarcode(product.barcode ?? '')
    setEditDescription(product.description ?? '')
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditPrice('0')
    setEditBarcode('')
    setEditDescription('')
  }

  async function saveEdit(productId: string) {
    setSavingEdit(true)
    setError(null)

    try {
      const updated = await putJson<Product>(`/api/products/${productId}`, {
        name: editName,
        price: Number(editPrice),
        barcode: editBarcode,
        description: editDescription,
      })

      setItems(prev => prev.map(p => (p.id === productId ? updated : p)))
      cancelEdit()
      setAuthRequired(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuthRequired(isAuthError(err))
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading)
    return <p style={{ textAlign: 'center', paddingTop: '40px' }}>Loading products...</p>

  return (
    <section className="products-page" style={{ display: 'grid', gap: '12px' }}>
      <h2>Products</h2>

      {error ? (
        <p style={{ color: '#dc2626', fontSize: '14px' }}>Could not complete request: {error}</p>
      ) : null}
      {authRequired ? (
        <p style={{ color: '#ea580c', fontSize: '14px' }}>
          Please log in on the Auth page to create, edit, or delete products.
        </p>
      ) : null}

      <form className="product-filters" onSubmit={handleApplyFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name"
          style={{ flex: '1', minWidth: '150px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Filter by category"
          style={{ flex: '1', minWidth: '150px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
        <select
          value={stockStatus}
          onChange={e => setStockStatus(e.target.value as 'all' | 'in-stock' | 'low-stock' | 'out-of-stock')}
          style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          <option value="all">Stock: All</option>
          <option value="in-stock">In stock</option>
          <option value="low-stock">Low stock</option>
          <option value="out-of-stock">Out of stock</option>
        </select>
        <input
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          placeholder="Min"
          type="number"
          min="0"
          step="0.01"
          style={{ flex: '0.5', minWidth: '80px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
        <input
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          placeholder="Max"
          type="number"
          min="0"
          step="0.01"
          style={{ flex: '0.5', minWidth: '80px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        />
        <select value={sort} onChange={e => setSort(e.target.value as 'name' | 'price')} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
        </select>
        <select value={dir} onChange={e => setDir(e.target.value as 'asc' | 'desc')} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
        <button type="submit" style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          Apply
        </button>
        <button type="button" onClick={() => void handleResetFilters()} style={{ padding: '8px 12px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Reset
        </button>
      </form>

      {items.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', paddingTop: '24px' }}>No products found.</p>
      ) : (
        <div className="list-detail-layout">
          <div className="list-panel">
            <div className="list-panel-header">Products ({items.length})</div>
            <ul className="list-panel-items">
              {items.map(p => (
                <li
                  key={p.id}
                  className={`list-item ${editingId === p.id ? 'active' : ''}`}
                  onClick={() => {
                    if (editingId === p.id) {
                      cancelEdit()
                    } else {
                      startEdit(p)
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="list-item-name">{p.name || 'Unnamed'}</div>
                    <div className="list-item-meta">${p.price.toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-panel">
            {editingId ? (
              <>
                <div className="detail-panel-header">
                  <h3>Edit Product</h3>
                </div>
                <form onSubmit={e => { e.preventDefault(); const product = items.find(p => p.id === editingId); if (product?.id) void saveEdit(product.id); }} style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Name *</label>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Product name"
                      required
                      maxLength={100}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Price *</label>
                    <input
                      value={editPrice}
                      onChange={e => setEditPrice(e.target.value)}
                      placeholder="Price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Barcode</label>
                    <input
                      value={editBarcode}
                      onChange={e => setEditBarcode(e.target.value)}
                      placeholder="Barcode (optional)"
                      maxLength={14}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Description</label>
                    <input
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      maxLength={1200}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div className="detail-actions" style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', marginTop: '12px' }}>
                    <button type="submit" disabled={savingEdit} style={{ flex: 1, padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      style={{ flex: 1, padding: '8px 12px', background: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (editingId && confirm('Are you sure?')) void handleDelete(editingId); }}
                      disabled={savingEdit}
                      style={{ flex: 1, padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <form onSubmit={handleCreate} style={{ display: 'grid', gap: '12px' }}>
                <div className="detail-panel-header">
                  <h3>Add Product</h3>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Name *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Product name"
                    required
                    maxLength={100}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Price *</label>
                  <input
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Barcode</label>
                  <input
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="Barcode (optional)"
                    maxLength={14}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: '#4b5563', fontSize: '13px' }}>Description</label>
                  <input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    maxLength={1200}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                  />
                </div>
                <button type="submit" disabled={submitting} style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                  {submitting ? 'Adding...' : 'Add Product'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}