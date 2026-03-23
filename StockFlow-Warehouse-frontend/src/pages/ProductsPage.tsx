import { useEffect, useState } from 'react'
import { getJson } from '../api'

type Product = {
  id?: string
  name?: string
  price?: number
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <p>Loading products...</p>
  if (error) return <p>Could not load products: {error}</p>

  return (
    <section>
      <h2>Products</h2>
      {items.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul>
          {items.map((p, i) => (
            <li key={p.id ?? i}>
              {p.name ?? 'Unnamed product'}
              {typeof p.price === 'number' ? ` - ${p.price}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}