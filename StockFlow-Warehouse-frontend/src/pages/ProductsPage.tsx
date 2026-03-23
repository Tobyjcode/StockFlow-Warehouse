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
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')

  async function loadProducts() {
    try {
      const data = await getJson<Product[]>('/api/products')
      setItems(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        const data = await getJson<Product[]>('/api/products')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(productId?: string) {
    if (!productId) return

    try {
      await deleteJson(`/api/products/${productId}`)
      setItems(prev => prev.filter(p => p.id !== productId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (loading) return <p>Loading products...</p>

  return (
    <section className="products-page">
      <h2>Products</h2>

      {error ? <p>Could not complete request: {error}</p> : null}

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