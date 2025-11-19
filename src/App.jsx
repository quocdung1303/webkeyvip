import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const packages = [
  { id: 'test', name: 'TEST (3 giờ)', price: 2000, hours: 3 },
  { id: '1day', name: '1 Ngày', price: 20000, hours: 24 },
  { id: '7day', name: '7 Ngày', price: 100000, hours: 168 },
  { id: '30day', name: '30 Ngày', price: 350000, hours: 720 }
];

function App() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [key, setKey] = useState(null);

  // Check payment status every 2 seconds
  useEffect(() => {
    if (order && paymentStatus === 'pending') {
      const interval = setInterval(async () => {
        try {
          const response = await axios.post(`${API_URL}/check-status`, {
            orderId: order.id
          });

          if (response.data.status === 'paid') {
            setPaymentStatus('paid');
            setKey(response.data.key);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [order, paymentStatus]);

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
  };

  const handleCreateOrder = async () => {
    if (!selectedPackage) return;

    try {
      const response = await axios.post(`${API_URL}/orders`, {
        packageId: selectedPackage.id,
        amount: selectedPackage.price
      });

      setOrder(response.data.order);
      setPaymentStatus('pending');
    } catch (error) {
      alert('Lỗi tạo đơn hàng: ' + error.message);
    }
  };

  const handleBackToHome = () => {
    setOrder(null);
    setSelectedPackage(null);
    setPaymentStatus('pending');
    setKey(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔑 ARES TOOL VIP</h1>
          <p className="text-purple-100">Mua key VIP tự động - Nhận ngay sau khi thanh toán</p>
        </div>

        {/* Home - Package Selection */}
        {!order && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Chọn gói VIP</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-6 rounded-xl cursor-pointer transition-all ${
                      selectedPackage?.id === pkg.id
                        ? 'bg-white text-purple-600 shadow-xl scale-105'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                    <p className="text-2xl font-bold">{pkg.price.toLocaleString('vi-VN')}đ</p>
                    <p className="text-sm opacity-80 mt-2">Thời hạn: {pkg.hours} giờ</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={!selectedPackage}
                className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedPackage ? `Mua gói ${selectedPackage.name}` : 'Chọn gói để tiếp tục'}
              </button>
            </div>
          </div>
        )}

        {/* Checkout Page */}
        {order && paymentStatus === 'pending' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Thanh toán đơn hàng</h2>
              
              <div className="bg-white rounded-xl p-6 mb-6">
                <div className="text-center mb-4">
                  <p className="text-gray-600 mb-2">Mã đơn hàng</p>
                  <p className="text-2xl font-bold text-purple-600">DH{order.id}</p>
                </div>

                <img
                  src={order.qrUrl}
                  alt="QR Payment"
                  className="mx-auto mb-4 rounded-lg shadow-lg"
                />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngân hàng:</span>
                    <span className="font-semibold">VietinBank</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tài khoản:</span>
                    <span className="font-semibold">102881164268</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-semibold text-purple-600">{order.amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nội dung:</span>
                    <span className="font-semibold">ARESTOOL DH{order.id}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-400/20 border border-yellow-400 rounded-xl p-4 text-white">
                <p className="text-center">⏳ Đang chờ thanh toán...</p>
                <p className="text-center text-sm mt-2">Key sẽ tự động hiện sau khi chuyển khoản thành công</p>
              </div>

              <button
                onClick={handleBackToHome}
                className="w-full mt-4 bg-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/30 transition-all"
              >
                ← Quay lại
              </button>
            </div>
          </div>
        )}

        {/* Success Page */}
        {paymentStatus === 'paid' && key && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-3xl font-bold text-white mb-2">Thanh toán thành công!</h2>
                <p className="text-purple-100">Key VIP của bạn đã được tạo</p>
              </div>

              <div className="bg-white rounded-xl p-6 mb-6">
                <p className="text-gray-600 text-center mb-2">Key VIP của bạn</p>
                <div className="bg-purple-100 p-4 rounded-lg">
                  <p className="text-3xl font-mono font-bold text-purple-600 text-center tracking-wider">
                    {key}
                  </p>
                </div>
                <p className="text-sm text-gray-500 text-center mt-4">
                  💾 Vui lòng lưu key này lại. Sử dụng key để kích hoạt Ares Tool.
                </p>
              </div>

              <button
                onClick={handleBackToHome}
                className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl hover:bg-purple-50 transition-all"
              >
                Mua thêm gói khác
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="text-center text-white/60 py-4">
        <p>© 2025 Ares Tool VIP - Hệ thống bán key tự động</p>
      </div>
    </div>
  );
}

export default App;
