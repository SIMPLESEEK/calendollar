'use client';

import { useMemo } from 'react';
import { format, getMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarState } from '@/types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface YearViewProps {
  year: number;
  events: CalendarState['events'];
  onSelectMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
}

export default function YearView({ year, events, onSelectMonth, onChangeYear }: YearViewProps) {
  
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  }, [year]);

  // 简单检查月份是否有事件
  const monthHasEvents = (monthDate: Date): boolean => {
    const month = getMonth(monthDate);
    return Object.keys(events).some(dateStr => {
      const eventDate = new Date(dateStr);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
  };

  return (
    <div className="bg-amber-50 rounded-lg shadow-md border border-amber-200 p-3 sm:p-4">
      <div className="flex items-center justify-center mb-4 relative">
         <button 
           onClick={() => onChangeYear(year - 1)}
           className="absolute left-0 p-1.5 sm:p-2 rounded-full text-amber-700 hover:bg-amber-100"
         >
           <ChevronLeftIcon className="h-5 w-5" />
         </button>
         <h2 className="text-center text-lg sm:text-xl font-semibold text-amber-900">{year}年</h2>
         <button 
           onClick={() => onChangeYear(year + 1)}
           className="absolute right-0 p-1.5 sm:p-2 rounded-full text-amber-700 hover:bg-amber-100"
          >
           <ChevronRightIcon className="h-5 w-5" />
         </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {months.map((monthDate, index) => (
          <div 
            key={index}
            onClick={() => onSelectMonth(index)}
            className={`p-3 sm:p-4 rounded-md cursor-pointer text-center border border-amber-100 hover:bg-amber-100 hover:shadow ${
              monthHasEvents(monthDate) ? 'bg-white' : 'bg-amber-50/70'
            }`}
          >
            <span className="font-medium text-sm sm:text-base text-amber-800">
              {format(monthDate, 'MMMM', { locale: zhCN })}
            </span>
            {monthHasEvents(monthDate) && (
               <div className="mt-1 h-1 w-1 bg-blue-500 rounded-full mx-auto"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 