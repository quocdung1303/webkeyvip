import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import QRCode from 'qrcode'

const PACKAGES = [
  { id: 'test', name: '3 Giờ', price: 2000, popular: false },  // ← GÓI TEST MỚI
  { id: '1day', name: '1 Ngày', price: 5000, popular: false },
  { id: '3days', name: '3 Ngày', price: 10000, popular: false },
  { id: '7days', name: '7 Ngày', price: 20000, popular: true },
  { id: '30days', name: '30 Ngày', price: 50000, popular: true },
  { id: '90days', name: '3 Tháng', price: 120000, popular: false },
  { id: '180days', name: '6 Tháng', price: 200000, popular: false },
  { id: '365days', name: '1 Năm', price: 350000, popular: false }
]

export default function Home({ user, onLogout }) {
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [orderInfo, setOrderInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleBuyNow = async (pkg) => {
    if (!user) {
      alert('Vui lòng đăng nhập để mua key!')
      return
    }

    setLoading(true)
    setSelectedPackage(pkg)

    try {
      const response = await axios.post('/api/orders/create', {
        userId: user.id,
        packageId: pkg.id
      })

      const { order } = response.data
      setOrderInfo(order)

      // Generate VietQR
      const vietqrUrl = `https://img.vietqr.io/image/vietinbank-${order.qrData.accountNo}-compact2.png?amount=${order.qrData.amount}&addInfo=${order.qrData.description}`
      setQrCodeUrl(vietqrUrl)

    } catch (error) {
      console.error('Error creating order:', error)
      alert('Có lỗi xảy ra, vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">⚡ ARES TOOL VIP</h1>
          <p className="text-white/80">Mua Key VIP - Tự Động Giao Hàng 24/7</p>
        </div>
        <div>
          {user ? (
            <div className="flex gap-3 items-center">
              <Link to="/dashboard" className="btn-primary">Dashboard</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn-primary">Admin</Link>
              )}
              <button onClick={onLogout} className="text-white hover:underline">Đăng xuất</button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Đăng nhập</Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {!orderInfo ? (
          <>
            {/* Hero */}
            <div className="card text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-4">
                🔥 BẢNG GIÁ KEY VIP - GIÁ HỌC SINH 🔥
              </h2>
              <p className="text-gray-600 text-lg">
                ⚡ Tự động giao key sau khi chuyển khoản ⚡
              </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {PACKAGES.map(pkg => (
                <div key={pkg.id} className={`price-card ${pkg.popular ? 'popular' : ''}`}>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                  <div className="text-3xl font-bold gradient-text mb-4">
                    {formatPrice(pkg.price)}
                  </div>
                  <button 
                    onClick={() => handleBuyNow(pkg)}
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Đang xử lý...' : 'Mua ngay'}
                  </button>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="card mt-8">
              <h3 className="text-2xl font-bold text-center mb-6">✨ Tính Năng VIP ✨</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🚀</div>
                  <h4 className="font-bold text-lg mb-2">Tốc Độ Cao</h4>
                  <p className="text-gray-600">Tăng tốc game, giảm lag hiệu quả</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">⚡</div>
                  <h4 className="font-bold text-lg mb-2">Tự Động 24/7</h4>
                  <p className="text-gray-600">Nhận key ngay sau khi chuyển khoản</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <h4 className="font-bold text-lg mb-2">Bảo Mật</h4>
                  <p className="text-gray-600">An toàn, không virus, không quảng cáo</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* QR Payment */
          <div className="card max-w-2xl mx-auto">
            <button 
              onClick={() => { setOrderInfo(null); setQrCodeUrl(''); }}
              className="text-blue-600 mb-4 hover:underline"
            >
              ← Quay lại
            </button>
            
            <h2 className="text-2xl font-bold text-center mb-6">
              💳 Quét mã QR để thanh toán
            </h2>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="font-bold text-yellow-800">⚠️ LƯU Ý QUAN TRỌNG:</p>
              <p className="text-yellow-700">Nội dung chuyển khoản PHẢI có: <span className="font-bold">{orderInfo.orderId}</span></p>
            </div>

            <div className="text-center mb-6">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto rounded-lg shadow-lg" />
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ngân hàng:</span>
                <span className="font-bold">VietinBank</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số tài khoản:</span>
                <span className="font-bold">{orderInfo.qrData.accountNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Chủ tài khoản:</span>
                <span className="font-bold">{orderInfo.qrData.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số tiền:</span>
                <span className="font-bold text-red-600">{formatPrice(orderInfo.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nội dung CK:</span>
                <span className="font-bold text-blue-600">{orderInfo.orderId}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-green-600 font-bold text-lg mb-2">
                ✅ Sau khi chuyển khoản, key sẽ tự động hiển thị trong Dashboard!
              </p>
              <Link to="/dashboard" className="btn-primary inline-block">
                Xem Dashboard →
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-12 text-center text-white/60">
        <p>© 2025 Ares Tool VIP - Hệ thống bán key tự động</p>
      </footer>
    </div>
  )
  }
