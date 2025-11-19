import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Dashboard({ user, onLogout }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKeys()
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchKeys, 10000)
    return () => clearInterval(interval)
  }, [user.id])

  const fetchKeys = async () => {
    try {
      const response = await axios.get(`/api/keys/${user.id}`)
      setKeys(response.data.keys)
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Đã copy key!')
  }

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date()
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN')
  }

  const getTimeRemaining = (expiresAt) => {
    const now = new Date()
    const expire = new Date(expiresAt)
    const diff = expire - now

    if (diff <= 0) return 'Đã hết hạn'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `Còn ${days} ngày ${hours} giờ`
    return `Còn ${hours} giờ`
  }

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">📊 Dashboard</h1>
          <p className="text-white/80">Xin chào, {user.email}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="btn-primary">← Trang chủ</Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="btn-primary">Admin</Link>
          )}
          <button onClick={onLogout} className="text-white hover:underline">Đăng xuất</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">🔑 Key của bạn</h2>
            <button
              onClick={fetchKeys}
              className="text-purple-600 hover:underline flex items-center gap-2"
            >
              🔄 Làm mới
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😢</div>
              <p className="text-gray-600 text-lg mb-4">Bạn chưa có key nào!</p>
              <Link to="/" className="btn-primary inline-block">
                Mua key ngay →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((keyItem) => (
                <div
                  key={keyItem.id}
                  className={`border rounded-lg p-4 ${
                    isExpired(keyItem.expiresAt)
                      ? 'bg-gray-100 border-gray-300'
                      : 'bg-green-50 border-green-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{keyItem.packageName}</h3>
                      <p className="text-sm text-gray-600">
                        Mã đơn: {keyItem.orderId}
                      </p>
                    </div>
                    <div className="text-right">
                      {isExpired(keyItem.expiresAt) ? (
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                          ❌ Hết hạn
                        </span>
                      ) : (
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                          ✅ Còn hạn
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <code className="text-sm font-mono">{keyItem.key}</code>
                      <button
                        onClick={() => copyToClipboard(keyItem.key)}
                        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Ngày mua:</span>
                      <p className="font-semibold">{formatDate(keyItem.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Hết hạn:</span>
                      <p className="font-semibold">{formatDate(keyItem.expiresAt)}</p>
                    </div>
                  </div>

                  {!isExpired(keyItem.expiresAt) && (
                    <div className="mt-3 text-center">
                      <span className="text-green-600 font-bold">
                        ⏰ {getTimeRemaining(keyItem.expiresAt)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="card mt-6">
          <h3 className="text-xl font-bold mb-4">📖 Hướng dẫn sử dụng key</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Tải Ares Tool về máy</li>
            <li>Mở tool và tìm nút "Nhập Key"</li>
            <li>Copy key từ Dashboard và paste vào</li>
            <li>Nhấn "Kích hoạt" và tận hưởng!</li>
          </ol>
        </div>
      </main>
    </div>
  )
    }
