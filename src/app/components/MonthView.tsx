'use client';

import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarState, CityRecord } from '@/types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// 简单的城市缩写函数 (取前两个字符大写)
// TODO: 处理单字城市和潜在冲突 (例如 广州 vs 赣州)
function getCityAbbreviation(city: string): string {
  if (!city) return '';
  // 简单的英文/数字处理 + 中文处理
  const enMatch = city.match(/[a-zA-Z]+/g);
  if (enMatch && enMatch.length > 0) {
      // 如果有英文，取前两个英文字母大写
      return city.substring(0, 2).toUpperCase();
  } else if (city.length <= 2) {
      // 中文或其他，如果长度小于等于2，直接返回
      return city;
  } else {
      // 否则取前两个字符
      return city.substring(0, 2);
  }
  // 更完善的方案可能需要 Pinyin 库
}

interface MonthViewProps {
  year: number;
  month: number;
  events: CalendarState['events'];
  onDayClick: (date: Date) => void;
  onChangeMonth: (year: number, month: number) => void;
  getCityColor: (city: string) => string;
}

export default function MonthView({ 
  year, 
  month, 
  events, 
  onDayClick,
  onChangeMonth,
  getCityColor
}: MonthViewProps) {
  const currentDate = useMemo(() => new Date(year, month), [year, month]);
  
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  const startDay = getDay(startOfMonth(currentDate));

  const getCityRecordsForDay = (date: Date): CityRecord[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events[dateStr]?.cityRecords || [];
  };

  const prevMonth = () => {
    const prevDate = subMonths(currentDate, 1);
    onChangeMonth(prevDate.getFullYear(), prevDate.getMonth());
  };

  const nextMonth = () => {
    const nextDate = addMonths(currentDate, 1);
    onChangeMonth(nextDate.getFullYear(), nextDate.getMonth());
  };
  
  return (
    <div className="bg-amber-50 rounded-lg shadow-md border border-amber-200">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-amber-200">
        <button 
          onClick={prevMonth}
          className="p-1.5 sm:p-2 rounded-full text-amber-700 hover:bg-amber-100"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-amber-900">
          {format(currentDate, 'yyyy年 MMMM', { locale: zhCN })}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-1.5 sm:p-2 rounded-full text-amber-700 hover:bg-amber-100"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-7">
        {/* 星期头 - 英文缩写 */}
        {['Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.'].map((day) => (
          <div key={day} className="py-3 text-center font-semibold text-amber-800 text-xs border-b border-r border-amber-200 last:border-r-0">
            {day}
          </div>
        ))}
        
        {/* 月历前空白 */}
        {Array.from({ length: (startDay === 0 ? 6 : startDay - 1) }, (value_not_used, index) => (
          <div key={`empty-${index}`} className="border-r border-b border-amber-200 h-20 sm:h-28 lg:h-24" />
        ))}
        
        {/* 日历天 */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const cityRecords = getCityRecordsForDay(day);
          
          return (
            <div 
              key={dateStr}
              onClick={() => onDayClick(day)}
              className={`relative p-1.5 border-r border-b border-amber-200 h-20 sm:h-28 lg:h-24 cursor-pointer hover:bg-amber-100 overflow-hidden ${
                !isSameMonth(day, currentDate) ? 'bg-amber-50/50 text-amber-500' : 'text-amber-900'
              } ${
                isToday(day) ? 'ring-2 ring-blue-500 ring-inset' : ''
              }`}
            >
              {/* 左上角日期 */}
              <div className={`text-xs sm:text-sm font-semibold mb-1 ${isToday(day) ? 'text-blue-600' : ''}`}>
                {format(day, 'd')}
              </div>

              {/* 城市色块区域 (使用缩写) */}
              {isSameMonth(day, currentDate) && cityRecords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {cityRecords.map((record) => (
                    <span 
                      key={record.id}
                      title={record.city} 
                      className={`px-1.5 py-0.5 rounded text-[0.6rem] sm:text-xs lg:px-2 lg:py-1 lg:text-sm text-white font-medium shadow-sm ${getCityColor(record.city)}`}
                    >
                      {getCityAbbreviation(record.city)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {/* 补齐最后一行空白 */}
        {Array.from({ length: (7 - (days.length + (startDay === 0 ? 6 : startDay - 1)) % 7) % 7 }, (value_not_used, index) => (
          <div key={`empty-end-${index}`} className="border-r border-b border-amber-200 h-20 sm:h-28 lg:h-24 last:border-r-0" />
        ))}
      </div>
    </div>
  );
} 