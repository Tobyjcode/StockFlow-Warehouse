import { Link, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'
import AuthPage from './pages/AuthPage'
import WarehousesPage from './pages/WarehousesPage'

function App() {
  const navLinks = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/warehouses', label: 'Warehouses', icon: '🏢' },
    { to: '/products', label: 'Products', icon: '📦' },
    { to: '/orders', label: 'Orders', icon: '📋' },
    { to: '/auth', label: 'Auth', icon: '🔐' },
  ]

  return (
    <div className="container">
      <header className="topbar">
        <Link to="/" className="topbar-logo">
          <span style={{ fontSize: '24px', marginRight: '8px' }}>📦</span>
          <h1>StockFlow Warehouse</h1>
        </Link>
        <nav className="topbar-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className="nav-link">
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
