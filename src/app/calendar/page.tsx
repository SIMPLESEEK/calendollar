'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Calendar from '../components/Calendar';
import Link from 'next/link';

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-2 md:py-3">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap md:pl-2">
            牛马的自我鞭策
          </h1>
          <div className="flex items-center space-x-2 md:space-x-4">
            {session?.user?.name && (
              <span className="text-gray-700 text-sm md:text-base hidden md:inline">
                欢迎，{session.user.name}
              </span>
            )}
            <Link
              href="/statistics"
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-white bg-gray-500 hover:bg-gray-600"
            >
              统计
            </Link>
            <Link
              href="/api/auth/signout"
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent text-xs md:text-sm font-medium rounded-md text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              退出
            </Link>
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 md:pl-2">
        {session?.user?.id && <Calendar userId={session.user.id} />}
      </div>
    </main>
  );
} 