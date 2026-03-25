import { useEffect, useState } from 'react'
import { getJson, postJson, putJson, deleteJson } from '../api'

type Warehouse = {
  id: string
  name: string
  inventory: InventoryItem[]
}

type Recipient = {
  id: string
  name: string
}

type InventoryItem = {
  productId: string
  product: Product
  quantity: number
}

type Product = {
  id: string
  name: string
  price: number
}

type Order = {
  id: string
  type: string
  state: string
  from?: Warehouse
  to?: Recipient
  lineItems: OrderLine[]
  totalPrice: number
  trackingNumber: string
}

type OrderLine = {
  id: string
  productId: string
  product: Product
  amount: number
  unitPrice: number
  totalPrice: number
}

type LineItemInput = {
  productId: string
  amount: number
}

const TRANSACTION_TYPES = ['sale', 'purchase', 'return', 'move'] as const
const TRANSACTION_STATES = ['reserved', 'intransit', 'delivered', 'cancelled', 'returned'] as const

type TransactionType = typeof TRANSACTION_TYPES[number]
type TransactionState = typeof TRANSACTION_STATES[number]

const STATE_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  reserved: ['intransit', 'cancelled'],
  intransit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  returned: [],
}

function normalizeState(state: string): TransactionState | null {
  const value = state.toLowerCase().replace(/[\s_-]/g, '')
  if (value === 'reserved') return 'reserved'
  if (value === 'intransit') return 'intransit'
  if (value === 'delivered') return 'delivered'
  if (value === 'cancelled') return 'cancelled'
  if (value === 'returned') return 'returned'
  return null
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [stateFilter, setStateFilter] = useState<'all' | TransactionState>('all')

  const [transactionType, setTransactionType] = useState<TransactionType>('sale')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { productId: '', amount: 1 },
  ])

  const [stateUpdateId, setStateUpdateId] = useState<string | null>(null)
  const [newState, setNewState] = useState<TransactionState>('intransit')
  const [updatingState, setUpdatingState] = useState(false)

  function isAuthError(err: unknown) {
    return err instanceof Error && (err.message.startsWith('Unauthorized') || err.message.startsWith('Forbidden'))
  }

  function buildOrdersUrl() {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (stateFilter !== 'all') params.set('state', stateFilter)

    return `/api/transactions/orders?${params.toString()}`
  }

  async function loadOrders() {
    try {
      setOrdersLoading(true)
      const ordersData = await getJson<Order[]>(buildOrdersUrl())
      setOrders(ordersData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [ordersData, warehousesData] = await Promise.all([
          getJson<Order[]>(buildOrdersUrl()),
          getJson<Warehouse[]>('/api/warehouses'),
        ])
        setOrders(ordersData)
        setWarehouses(warehousesData)

        const allRecipients: Set<Recipient> = new Set()
        warehousesData.forEach(w => {
          allRecipients.add({ id: w.id, name: w.name })
        })
        setRecipients(Array.from(allRecipients))

        if (warehousesData.length > 0) {
          setSelectedWarehouse(warehousesData[0].id)
        }
        if (allRecipients.size > 0) {
          setSelectedRecipient(Array.from(allRecipients)[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleLineItemChange(
    index: number,
    field: 'productId' | 'amount',
    value: string,
  ) {
    const updated = [...lineItems]
    if (field === 'productId') {
      updated[index].productId = value
    } else {
      updated[index].amount = Math.max(1, parseInt(value) || 1)
    }
    setLineItems(updated)
  }

  function addLineItem() {
    setLineItems([...lineItems, { productId: '', amount: 1 }])
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  async function handleCreateOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!selectedWarehouse || !selectedRecipient) {
        throw new Error('Warehouse and recipient are required.')
      }

      const validLines = lineItems.filter(li => li.productId && li.amount > 0)
      if (validLines.length === 0) {
        throw new Error('At least one line item with a product is required.')
      }

      const payload = {
        type: transactionType,
        fromWarehouseId: selectedWarehouse,
        toRecipientId: selectedRecipient,
        lineItems: validLines,
        trackingNumber: trackingNumber || null,
      }

      await postJson<Order>('/api/transactions/orders', payload)
      await loadOrders()
      setLineItems([{ productId: '', amount: 1 }])
      setTrackingNumber('')
      setAuthRequired(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setAuthRequired(isAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateState(orderId: string, newTransactionState: TransactionState) {
    setUpdatingState(true)
    setError(null)

    try {
      await putJson(`/api/transactions/orders/${orderId}`, {
        state: newTransactionState,
      })
      await loadOrders()
      setStateUpdateId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUpdatingState(false)
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      await deleteJson(`/api/transactions/orders/${orderId}`)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleResetOrderFilters() {
    setTypeFilter('all')
    setStateFilter('all')

    try {
      setOrdersLoading(true)
      const data = await getJson<Order[]>('/api/transactions/orders')
      setOrders(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setOrdersLoading(false)
    }
  }

  if (loading) return <p>Loading orders and warehouses...</p>

  const selectedWarehouseData = warehouses.find(w => w.id === selectedWarehouse)
  const availableProducts = selectedWarehouseData?.inventory ?? []

  return (
    <section className="orders-page">
      <h2>Transactions</h2>

      {error ? <p className="error">{error}</p> : null}
      {authRequired ? <p className="error">Please log in on the Auth page before creating transactions.</p> : null}

      <form className="order-form" onSubmit={handleCreateOrder}>
        <h3>Create Transaction</h3>

        <div className="form-group">
          <label htmlFor="transactionType">Transaction Type</label>
          <select
            id="transactionType"
            value={transactionType}
            onChange={e => setTransactionType(e.target.value as TransactionType)}
          >
            {TRANSACTION_TYPES.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="warehouse">From Warehouse</label>
          <select
            id="warehouse"
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            required
          >
            <option value="">Select warehouse</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="recipient">To Recipient</label>
          <select
            id="recipient"
            value={selectedRecipient}
            onChange={e => setSelectedRecipient(e.target.value)}
            required
          >
            <option value="">Select recipient</option>
            {recipients.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tracking">Tracking Number (optional)</label>
          <input
            id="tracking"
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            placeholder="e.g., TRACK-123"
            maxLength={50}
          />
        </div>

        <fieldset className="line-items">
          <legend>Products</legend>
          {lineItems.map((line, i) => (
            <div key={i} className="line-item">
              <select
                value={line.productId}
                onChange={e => handleLineItemChange(i, 'productId', e.target.value)}
                required
              >
                <option value="">Select product</option>
                {availableProducts.map(item => (
                  <option key={item.productId} value={item.productId}>
                    {item.product.name} (available: {item.quantity})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={line.amount}
                onChange={e => handleLineItemChange(i, 'amount', e.target.value)}
                placeholder="Amount"
                required
              />

              {lineItems.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLineItem(i)}
                  className="btn-remove"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}

          <button type="button" onClick={addLineItem} className="btn-add-line">
            + Add Product
          </button>
        </fieldset>

        <button type="submit" disabled={submitting} className="btn-submit">
          {submitting ? 'Creating...' : 'Create Transaction'}
        </button>
      </form>

      <h3>Transactions</h3>
      <form
        className="order-filters"
        onSubmit={e => {
          e.preventDefault()
          void loadOrders()
        }}
      >
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as 'all' | TransactionType)}
        >
          <option value="all">Type: All</option>
          {TRANSACTION_TYPES.map(type => (
            <option key={type} value={type}>
              Type: {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value as 'all' | TransactionState)}
        >
          <option value="all">State: All</option>
          {TRANSACTION_STATES.map(state => (
            <option key={state} value={state}>
              State: {state.charAt(0).toUpperCase() + state.slice(1)}
            </option>
          ))}
        </select>
        <button type="submit" disabled={ordersLoading}>
          {ordersLoading ? 'Loading...' : 'Apply'}
        </button>
        <button type="button" onClick={() => void handleResetOrderFilters()} disabled={ordersLoading}>
          Reset
        </button>
      </form>

      {orders.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <ul className="order-list">
          {orders.map(order => {
            const normalizedState = normalizeState(order.state)
            const availableTransitions = normalizedState ? STATE_TRANSITIONS[normalizedState] : []

            return (
              <li key={order.id} className="order-item">
                <div className="order-header">
                  <div>
                    <strong>Transaction {order.id.slice(0, 8)}</strong>
                    <span className="order-type">{order.type}</span>
                  </div>
                  <span className="order-state">{order.state}</span>
                </div>
                <div className="order-details">
                  <p>
                    {order.from?.name} → {order.to?.name}
                  </p>
                  <p className="order-items">
                    {order.lineItems.length} item(s) • ${order.totalPrice.toFixed(2)}
                  </p>
                  {order.trackingNumber ? (
                    <p className="tracking">Tracking: {order.trackingNumber}</p>
                  ) : null}
                </div>
                <div className="order-actions">
                  {stateUpdateId === order.id ? (
                    <div className="state-update-form">
                      <select
                        value={newState}
                        onChange={e => setNewState(e.target.value as TransactionState)}
                      >
                        {availableTransitions.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleUpdateState(order.id, newState)}
                        disabled={updatingState}
                        className="btn-update"
                      >
                        {updatingState ? 'Updating...' : 'Update'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStateUpdateId(null)}
                        className="btn-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : availableTransitions.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (availableTransitions.length > 0) {
                          setStateUpdateId(order.id)
                          setNewState(availableTransitions[0])
                        }
                      }}
                      className="btn-state"
                    >
                      Update State
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDeleteOrder(order.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
