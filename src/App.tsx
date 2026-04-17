/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Plus, Trash2, Shirt, User, Hash, CheckCircle2, 
  LogIn, LogOut, Loader2, AlertCircle 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, 
  FirestoreError, getDocFromServer
} from 'firebase/firestore';
import { 
  auth, db 
} from './firebase';
import { Order, ShirtSize } from './types';

const SHIRT_SIZES: ShirtSize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "문제가 발생했습니다. 다시 시도해주세요.";
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed.error && parsed.error.includes("permissions")) {
          displayMessage = "권한이 없습니다. 관리자에게 문의하세요.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">오류 발생</h1>
            <p className="text-gray-600 mb-6">{displayMessage}</p>
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

  // Form State
  const [studentName, setStudentName] = useState('');
  const [shirtSize, setShirtSize] = useState<ShirtSize | ''>('');
  const [nickname, setNickname] = useState('');

  // 1. Validate Connection & Load Data (onSnapshot)
  useEffect(() => {
    // Test connection first
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Firebase connection check failed. Check configuration.");
        }
      }
    }
    testConnection();

    const path = 'orders';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Order[];
      setOrders(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !shirtSize || !nickname) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    if (nickname.length > 8) {
      alert('이니셜/별명/이름은 최대 8글자까지 입력 가능합니다.');
      return;
    }

    const path = 'orders';
    const newOrder = {
      studentName,
      shirtSize,
      nickname,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, path), newOrder);
      
      // Reset form
      setStudentName('');
      setShirtSize('');
      setNickname('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteOrder = async (id: string) => {
    if (confirm('이 주문을 삭제하시겠습니까? (관리자 전용 기능)')) {
      const path = `orders/${id}`;
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
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

  // Loading initial state (placeholder for connection test or just delay if needed)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Small delay to ensure DB triggers if any
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-[#1e293b] text-white py-16 px-4 relative overflow-hidden">
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
                <div className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-100 shadow-sm">
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
                    <Hash className="w-4 h-4 text-blue-500" /> 이니셜/별명/이름(한글 1~8글자, 영문 가능) <span className="text-blue-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
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

      <footer className="py-16 text-center text-slate-400 text-xs font-semibold uppercase tracking-widest">
        <p>© {new Date().getFullYear()} 석천중학교 반티 주문 시스템</p>
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
