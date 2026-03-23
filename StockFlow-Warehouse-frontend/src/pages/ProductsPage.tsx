import { useEffect, useState } from 'react'
import { deleteJson, getJson, postJson } from '../api'

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

  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')

  const [search, setSearch] = useState('')
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

  if (loading) return <p>Loading products...</p>

  return (
    <section className="products-page">
      <h2>Products</h2>

      {error ? <p>Could not complete request: {error}</p> : null}
      {authRequired ? <p>Please log in on the Auth page to create, edit, or delete products.</p> : null}

      <form className="product-filters" onSubmit={handleApplyFilters}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name"
        />
        <input
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          placeholder="Min price"
          type="number"
          min="0"
          step="0.01"
        />
        <input
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          placeholder="Max price"
          type="number"
          min="0"
          step="0.01"
        />
        <select value={sort} onChange={e => setSort(e.target.value as 'name' | 'price')}>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
        </select>
        <select value={dir} onChange={e => setDir(e.target.value as 'asc' | 'desc')}>
          <option value="asc">Direction: Asc</option>
          <option value="desc">Direction: Desc</option>
        </select>
        <button type="submit">Apply</button>
        <button type="button" onClick={() => void handleResetFilters()}>
          Reset
        </button>
      </form>

      <form className="product-form" onSubmit={handleCreate}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          required
          maxLength={100}
        />
        <input
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="Price"
          type="number"
          min="0"
          step="0.01"
          required
        />
        <input
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          placeholder="Barcode (optional)"
          maxLength={14}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          maxLength={1200}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add product'}
        </button>
      </form>

      {items.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul className="product-list">
          {items.map((p, i) => (
            <li key={p.id ?? i} className="product-item">
              <div>
                <strong>{p.name || 'Unnamed product'}</strong>
                <div className="product-meta">
                  ${p.price.toFixed(2)}
                  {p.barcode ? ` • ${p.barcode}` : ''}
                  {p.description ? ` • ${p.description}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => handleDelete(p.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <p>
        <button type="button" onClick={() => void loadProducts()}>
          Refresh
        </button>
      </p>
    </section>
  )
}