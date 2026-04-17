/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Plus, Trash2, Shirt, User, Hash, CheckCircle2, 
  Loader2, AlertCircle, Settings, X, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, ShirtSize } from './types';

const SHIRT_SIZES: ShirtSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">오류 발생</h1>
            <p className="text-gray-600 mb-6 font-medium">문제가 발생했습니다. 다시 시도해주세요.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App Component ---

function BantiApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [password, setPassword] = useState('');

  // Form State
  const [studentName, setStudentName] = useState('');
  const [shirtSize, setShirtSize] = useState<ShirtSize | ''>('');
  const [nickname, setNickname] = useState('');

  // Load Data
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Refresh every 30 seconds for non-realtime cumulative board feel
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !shirtSize || !nickname) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    // Count Hangul characters
    const hangulCount = (nickname.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g) || []).length;
    if (hangulCount > 8) {
      alert('한글은 최대 8글자까지 입력 가능합니다.');
      return;
    }

    const newOrder = {
      studentName,
      shirtSize,
      nickname
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });

      if (res.ok) {
        // Reset form
        setStudentName('');
        setShirtSize('');
        setNickname('');
        fetchOrders(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const deleteOrder = async (id: string) => {
    if (!isAdmin) {
      alert('관리자 권한이 필요합니다.');
      return;
    }

    if (confirm('이 주문을 삭제하시겠습니까?')) {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          fetchOrders();
        }
      } catch (error) {
        console.error('Failed to delete order:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1379') {
      setIsAdmin(true);
      setIsLoginModalOpen(false);
      setPassword('');
      alert('관리자로 로그인되었습니다.');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    alert('로그아웃되었습니다.');
  };

  const exportToExcel = () => {
    if (orders.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const data = orders.map((o, index) => ({
      '번호': orders.length - index,
      '이름': o.studentName,
      '상의 사이즈': o.shirtSize,
      '이니셜/별명': o.nickname,
      '주문 일시': new Date(o.createdAt).toLocaleString('ko-KR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '반티주문목록');
    
    XLSX.writeFile(workbook, `반티_주문_목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-[#1e293b] text-white py-16 px-4 relative overflow-hidden">
        {/* Admin Gear Icon */}
        <div className="absolute top-6 right-6 z-30">
          {!isAdmin ? (
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm group"
            >
              <Settings className="w-6 h-6 text-white/50 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
            </button>
          ) : (
            <button 
              onClick={handleAdminLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-bold text-sm transition-colors border border-red-500/30 backdrop-blur-sm"
            >
              <Lock className="w-4 h-4" />
              관리자 모드 종료
            </button>
          )}
        </div>

        <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm"
          >
            <Shirt className="w-8 h-8 text-blue-400" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-center"
          >
            석천중 <span className="text-blue-400">1학년 1반</span> 반티 주문
          </motion.h1>
          <motion.a 
            href="https://bant-nara.com/amall/?mode=detailview&numid=962"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            className="text-blue-300 hover:text-blue-200 font-semibold text-lg underline underline-offset-4 transition-colors"
          >
            농구나시 레드 with 시카고 23 인쇄
          </motion.a>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -mr-48 -mb-48" />
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 md:p-12 mb-16 border border-slate-100 -mt-12 relative z-20"
        >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-blue-600 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-800">주문 정보 입력</h2>
                </div>
                <div className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-100 shadow-sm transition-all duration-300">
                  <CheckCircle2 className="w-4 h-4" />
                  등번호는 우리반 번호로 추가합니다.
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" /> 이름 <span className="text-blue-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-blue-500" /> 상의 사이즈 <span className="text-blue-500 font-bold">*</span>
                    </label>
                    <select
                      required
                      value={shirtSize}
                      onChange={(e) => setShirtSize(e.target.value as ShirtSize)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none font-bold"
                    >
                      <option value="">선택하세요</option>
                      {SHIRT_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[15px] font-bold text-slate-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" /> 이니셜/별명/이름(한글 8자 이내, 영문 가능) <span className="text-blue-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="예: HGD 또는 길동이"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold placeholder:text-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                >
                  <Plus className="w-6 h-6" />
                  주문 등록 완료
                </button>
              </form>
            </motion.div>

            {/* List Section */}
            <div className="space-y-10">
              <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">주문 현황</h2>
                  <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-sm font-bold border border-slate-200">
                    {orders.length}명
                  </span>
                </div>
                <button
                  onClick={exportToExcel}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-[0.98] text-sm"
                >
                  <Download className="w-4 h-4" />
                  엑셀로 저장
                </button>
              </div>

              {loading ? (
                <div className="py-24 flex justify-center">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                    {orders.length === 0 ? (
                      <motion.div className="col-span-full py-24 text-center text-slate-400 font-medium bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                        현재 등록된 주문 내역이 하나도 없어요.
                      </motion.div>
                    ) : (
                      orders.map((order) => (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-white rounded-[2rem] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-100 relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                        >
                          {isAdmin && (
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}

                          <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-2xl shadow-inner border border-blue-100">
                              {order.studentName[0]}
                            </div>
                            <div>
                               <h3 className="text-xl font-bold text-slate-800 leading-none mb-2">{order.studentName}</h3>
                               <p className="text-xs font-medium text-slate-400">{new Date(order.createdAt).toLocaleDateString()} 등록</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                              <span className="text-sm font-medium text-slate-400">사이즈</span>
                              <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold tracking-wider">
                                {order.shirtSize}
                              </span>
                            </div>

                            <div className="pt-2">
                               <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                 <Hash className="w-3 h-3" /> 이니셜 / 별명
                               </div>
                               <p className="font-bold text-slate-600 text-lg bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100/50">
                                 {order.nickname}
                               </p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
      </main>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">관리자 인증</h3>
                <p className="text-slate-400 text-sm mt-2">비밀번호를 입력하여 접속하세요.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-6">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-center text-2xl tracking-[0.5em]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                >
                  로그인
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-16 text-center text-slate-400 text-xs font-semibold uppercase tracking-widest">
        <p>© {new Date().getFullYear()} 석천중학교 반티 주문 시스템 (서버형)</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BantiApp />
    </ErrorBoundary>
  );
}
