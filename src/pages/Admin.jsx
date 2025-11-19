import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Admin({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [ordersRes, usersRes, keysRes] = await Promise.all([
        axios.get('/api/admin/orders'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/keys')
      ])

      setOrders(ordersRes.data.orders)
      setUsers(usersRes.data.users)
      setKeys(keysRes.data.keys)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN')
  }

  const getTotalRevenue = () => {
    return orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.amount, 0)
  }

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">✅ Hoàn thành</span>
    }
    return <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm">⏳ Chờ thanh toán</span>
  }

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">⚙️ Admin Dashboard</h1>
          <p className="text-white/80">Quản lý hệ thống</p>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="btn-primary">← Trang chủ</Link>
          <Link to="/dashboard" className="btn-primary">Dashboard</Link>
          <button onClick={onLogout} className="text-white hover:underline">Đăng xuất</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold gradient-text">
              {formatPrice(getTotalRevenue())}
            </div>
            <p className="text-gray-600">Tổng doanh thu</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-2xl font-bold gradient-text">{orders.length}</div>
            <p className="text-gray-600">Tổng đơn hàng</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold gradient-text">{users.length}</div>
            <p className="text-gray-600">Tổng người dùng</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">🔑</div>
            <div className="text-2xl font-bold gradient-text">{keys.length}</div>
            <p className="text-gray-600">Tổng key đã tạo</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="flex gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2 px-4 font-semibold ${
                activeTab === 'orders'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600'
              }`}
            >
              📦 Đơn hàng ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-2 px-4 font-semibold ${
                activeTab === 'users'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600'
              }`}
            >
              👥 Người dùng ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`pb-2 px-4 font-semibold ${
                activeTab === 'keys'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600'
              }`}
            >
              🔑 Key ({keys.length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Mã đơn</th>
                        <th className="px-4 py-2 text-left">User ID</th>
                        <th className="px-4 py-2 text-left">Gói</th>
                        <th className="px-4 py-2 text-left">Số tiền</th>
                        <th className="px-4 py-2 text-left">Trạng thái</th>
                        <th className="px-4 py-2 text-left">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{order.orderId}</td>
                          <td className="px-4 py-3">{order.userId}</td>
                          <td className="px-4 py-3">{order.packageId}</td>
                          <td className="px-4 py-3 font-bold">{formatPrice(order.amount)}</td>
                          <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Vai trò</th>
                        <th className="px-4 py-2 text-left">Ngày đăng ký</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{u.id}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            {u.role === 'admin' ? (
                              <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">👑 Admin</span>
                            ) : (
                              <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">👤 User</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Keys Tab */}
              {activeTab === 'keys' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Key</th>
                        <th className="px-4 py-2 text-left">User ID</th>
                        <th className="px-4 py-2 text-left">Gói</th>
                        <th className="px-4 py-2 text-left">Hết hạn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map(k => (
                        <tr key={k.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{k.id}</td>
                          <td className="px-4 py-3 font-mono text-sm">{k.key}</td>
                          <td className="px-4 py-3">{k.userId}</td>
                          <td className="px-4 py-3">{k.packageName}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(k.expiresAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
    }
