/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Plus, Trash2, Shirt, User, Hash, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, ShirtSize, PantSize } from './types';

const SHIRT_SIZES: ShirtSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const PANT_SIZES: PantSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [studentName, setStudentName] = useState('');
  const [shirtSize, setShirtSize] = useState<ShirtSize | ''>('');
  const [hasPants, setHasPants] = useState(false);
  const [pantsSize, setPantsSize] = useState<PantSize | ''>('');
  const [nickname, setNickname] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('banti_orders');
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load orders', e);
      }
    }
  }, []);

  // Save to localStorage whenever orders change
  useEffect(() => {
    localStorage.setItem('banti_orders', JSON.stringify(orders));
  }, [orders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !shirtSize || !nickname) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    const newOrder: Order = {
      id: crypto.randomUUID(),
      studentName,
      shirtSize,
      hasPants,
      pantsSize: hasPants ? (pantsSize || 'None') : 'None',
      nickname,
      createdAt: new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setOrders([newOrder, ...orders]);
    
    // Reset form
    setStudentName('');
    setShirtSize('');
    setHasPants(false);
    setPantsSize('');
    setNickname('');
  };

  const deleteOrder = (id: string) => {
    if (confirm('이 주문을 삭제하시겠습니까?')) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const exportToExcel = () => {
    if (orders.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const data = orders.map((o, index) => ({
      'No.': orders.length - index,
      '이름': o.studentName,
      '상의 사이즈': o.shirtSize,
      '하의 맞춤 여부': o.hasPants ? 'O' : 'X',
      '하의 사이즈': o.hasPants ? o.pantsSize : '-',
      '이니셜/별명': o.nickname,
      '주문 일시': o.createdAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '반티주문목록');
    
    // Column width adjustment
    const wscols = [
      { wch: 5 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 25 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `반티_주문_목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans">
      {/* Header */}
      <header className="bg-[#2d3748] text-white py-12 px-4 text-center shadow-lg">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-2 tracking-tight"
        >
          석천중 1학년 1반 반티 주문
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.2 }}
          className="text-gray-300 font-medium"
        >
          아래 정보를 입력해주세요
        </motion.p>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-8 pb-20">
        {/* Form Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-10 border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">주문 정보 입력</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              {/* Shirt Size Select */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  상의 사이즈 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    required
                    value={shirtSize}
                    onChange={(e) => setShirtSize(e.target.value as ShirtSize)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none"
                  >
                    <option value="">선택해주세요</option>
                    {SHIRT_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pants Toggle */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-600">하의 맞춤 여부</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHasPants(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    hasPants 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  맞춤 O
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasPants(false);
                    setPantsSize('');
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    !hasPants 
                    ? 'bg-[#1e293b] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  맞춤 X
                </button>
              </div>
            </div>

            {/* Pants Size (Conditional) */}
            <AnimatePresence>
              {hasPants && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-sm font-semibold text-gray-600">하의 사이즈</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PANT_SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setPantsSize(size)}
                        className={`py-2 text-sm font-bold rounded-lg border transition-all ${
                          pantsSize === size
                          ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nickname Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                이나셜 또는 별명(이름 가능) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: HGD 또는 길동이"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                등록하기
              </button>
            </div>
          </form>
        </motion.div>

        {/* List Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-end mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">주문 목록</h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                {orders.length}명
              </span>
            </div>
            <button
              onClick={exportToExcel}
              className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 text-sm"
            >
              <Download className="w-4 h-4" />
              엑셀 내보내기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {orders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center text-gray-400 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200"
                >
                  <p>등록된 주문이 없습니다.</p>
                </motion.div>
              ) : (
                orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100 relative group"
                  >
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-blue-600">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{order.studentName}</h3>
                        <p className="text-xs text-gray-400">{order.createdAt}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold">
                        <span>상의</span>
                        <span className="bg-blue-600 text-white px-1.5 rounded uppercase">{order.shirtSize}</span>
                      </div>
                      {order.hasPants && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold">
                          <span>하의</span>
                          <span className="bg-indigo-600 text-white px-1.5 rounded uppercase">{order.pantsSize}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">이니셜/별명</p>
                      <p className="font-semibold text-gray-700 truncate">{order.nickname}</p>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <CheckCircle2 className="w-4 h-4 text-green-500 opacity-20" />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="py-10 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} 우리반 반티 주문관리 시스템</p>
      </footer>
    </div>
  );
}
