'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios'; // Import AxiosError

// TODO: Import charting library later

// --- City Color Logic (Copied/Adapted from Calendar.tsx) ---
const cityColorPalette: string[] = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
];
// --- End City Color Logic ---

// 更新统计数据的接口
interface StatisticsData {
  cityDurations: { [city: string]: number };
  keywordCounts?: { [keyword: string]: number }; // 更改为 keywordCounts (可选)
}

export default function StatisticsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [keywords, setKeywords] = useState(''); // 新增 state 存储关键词
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- getCityColor Functionality ---
  const [cityColorMap, setCityColorMap] = useState<Map<string, string>>(new Map());
  // We need a way to track the color index persistently across renders if needed,
  // but for assigning colors *during* a fetch, it's better inside the fetch function.

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const getCityColorClass = useCallback((city: string): string => {
      if (cityColorMap.has(city)) {
          return cityColorMap.get(city) || '';
      }
      // Assigning color should ideally happen when data is processed,
      // not during render. This function only retrieves.
      // The logic to *assign* the color will be moved into handleFetchStats.
      // If a city somehow misses assignment, return a default.
      return 'bg-gray-400'; // Default/fallback color
  }, [cityColorMap]);
  // --- End getCityColor Functionality ---

  const handleFetchStats = async () => {
    if (!startDate || !endDate) {
      setError('请选择起始和截止日期。');
      return;
    }
    setLoading(true);
    setError(null);
    setStatsData(null);
    
    // Reset color map and index *inside* the fetch function
    let localNextColorIndex = 0;
    const newCityColorMap = new Map<string, string>();
    const assignColor = (city: string): string => {
        if (newCityColorMap.has(city)) {
            return newCityColorMap.get(city)!;
        }
        const color = cityColorPalette[localNextColorIndex % cityColorPalette.length];
        newCityColorMap.set(city, color);
        localNextColorIndex++;
        return color;
    };

    try {
      // 准备 API 参数
      const params: { startDate: string; endDate: string; keywords?: string } = {
        startDate: startDate,
        endDate: endDate,
      };
      if (keywords.trim()) {
        params.keywords = keywords.trim();
      }

      const response = await axios.get<StatisticsData>(`/api/statistics`, { params });
      const fetchedData = response.data;
      
      // Process fetched data to assign colors *before* setting state
      if (fetchedData && fetchedData.cityDurations) {
          Object.keys(fetchedData.cityDurations).forEach(city => {
              assignColor(city); // Assign color to each city found in the data
          });
      }
      
      setCityColorMap(newCityColorMap); // Update the state with the new map
      setStatsData(fetchedData); // Set the fetched data
      
    } catch (err: unknown) { // Use unknown for better type safety
      console.error('Error fetching statistics:', err);
      let message = '获取统计数据失败，请稍后重试。';
      if (axios.isAxiosError(err)) {
           // Access err.response.data safely
           message = err.response?.data?.error || err.message || message;
      } else if (err instanceof Error) {
           message = err.message; // Standard error message
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">统计数据</h1>
        <Link href="/calendar"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
        >
            返回日历
        </Link>
      </header>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">选择统计周期与关键词</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-600 mb-1">起始日期:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border-gray-300 rounded shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-600 mb-1">截止日期:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-gray-300 rounded shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-600 mb-1">活动关键词 (可选, 逗号分隔):</label>
            <input
              type="text"
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例如: 工作,学习"
              className="w-full border-gray-300 rounded shadow-sm p-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button
            onClick={handleFetchStats}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 bg-amber-500 text-white rounded shadow hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {loading ? '正在统计...' : '生成统计'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">错误: {error}</p>}
      </div>

      {loading && (
         <div className="text-center p-10">正在加载统计数据...</div>
      )}

      {statsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 城市时长统计 - 使用颜色条显示 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">城市停留天数</h3>
            {statsData.cityDurations && Object.keys(statsData.cityDurations).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(statsData.cityDurations)
                  // Optional: Sort by count descending
                  .sort(([, countA], [, countB]) => countB - countA)
                  .map(([city, count]) => {
                    const bgColorClass = getCityColorClass(city);
                    // Define bar width based on count, e.g., 15px per day
                    const barWidth = count * 15; // Adjust multiplier as needed
                    return (
                      <div key={city} className="flex items-center space-x-2 text-sm">
                         {/* Bar */}
                         <div
                           className={`h-4 rounded ${bgColorClass}`} // Use dynamic background class
                           style={{ width: `${barWidth}px`, minWidth: '2px' }} // Set width dynamically, ensure min width
                           title={`${city}: ${count} 天`} // Tooltip for accessibility
                         ></div>
                         {/* Label */}
                         <span className="text-gray-800 capitalize font-medium">
                           {city}
                         </span>
                         <span className="text-gray-600">({count} 天)</span>
                      </div>
                    );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">此期间无城市记录。</p>
            )}
          </div>

          {/* 活动关键词统计 - 保持列表显示 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-lg font-semibold mb-4 text-gray-700">活动关键词统计</h3>
             {statsData.keywordCounts && Object.keys(statsData.keywordCounts).length > 0 ? (
               <ul className="space-y-1 list-disc list-inside text-sm text-gray-800">
                 {Object.entries(statsData.keywordCounts).map(([keyword, count]) => (
                   <li key={keyword}>
                     <span className="font-medium">{keyword}</span>: {count} 次
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-gray-500 text-sm">{keywords.trim() ? '未找到包含所选关键词的活动。' : '请输入关键词以进行统计。'}</p>
             )}
          </div>
        </div>
      )}
    </div>
  );
} 