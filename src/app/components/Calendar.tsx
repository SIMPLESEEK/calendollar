'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import YearView from './YearView';
import MonthView from './MonthView';
import WeekView from './WeekView';
import { CalendarState, CityRecord, Activity, DayData, Weather } from '@/types';
import axios from 'axios';

// 定义颜色列表 (移到这里或共享文件)
const cityColorPalette: string[] = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
];

interface CalendarProps {
  userId: string;
}

export default function Calendar({ userId }: CalendarProps) {
  const [calendarState, setCalendarState] = useState<CalendarState>({
    view: 'month',
    selectedDate: new Date(),
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(),
    events: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityColorMap, setCityColorMap] = useState<Map<string, string>>(new Map());

  // --- New useEffect to Populate City Color Map ---
  useEffect(() => {
    const allCities = new Set<string>();
    Object.values(calendarState.events).forEach(dayData => {
      dayData.cityRecords.forEach(record => {
        if (record.city) {
          allCities.add(record.city.trim());
        }
      });
    });

    setCityColorMap(prevMap => {
        const newMap = new Map(prevMap);
        let updated = false;
        let currentMapSize = newMap.size; // Start indexing based on existing map size

        allCities.forEach(city => {
            if (!newMap.has(city)) {
                const color = cityColorPalette[currentMapSize % cityColorPalette.length];
                newMap.set(city, color);
                currentMapSize++; // Increment index for the next new city
                updated = true;
            }
        });
        // Only update state if new cities were added to avoid infinite loops
        return updated ? newMap : prevMap;
    });

  }, [calendarState.events]); // Re-run when events data changes
  // --- End New useEffect ---

  // --- Modified getCityColor --- 
  const getCityColor = useCallback((city: string): string => {
    if (!city) return 'bg-gray-400'; // Default color for empty city name
    const normalizedCity = city.trim(); 
    // Only read from the map, return default if not found (should be populated by useEffect)
    return cityColorMap.get(normalizedCity) || 'bg-gray-400'; 
  }, [cityColorMap]); // Dependency on cityColorMap
  // --- End Modified getCityColor ---

  // Fetch data from API on mount
  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get('/api/calendar');
        const fetchedEvents = response.data || {};

        // Process fetched data: Convert string dates back to Date objects
        const processedEvents: Record<string, DayData> = {};
        Object.keys(fetchedEvents).forEach(dateKey => {
          const event = fetchedEvents[dateKey];
          processedEvents[dateKey] = {
            ...event,
            // Assuming dates are stored as ISO strings or similar in DB via API
            // Adjust parsing if your API returns Date objects directly or different format
            date: event.date ? parseISO(event.date) : new Date(dateKey), 
            cityRecords: event.cityRecords?.map((cr: CityRecord) => ({ 
              ...cr, 
              // Potentially process dates inside activities if needed 
            })) || []
          };
        });

        setCalendarState(prev => ({ ...prev, events: processedEvents }));
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
        setError('无法加载日历数据，请稍后重试。');
        // Optionally set events to {} or keep previous state
        setCalendarState(prev => ({ ...prev, events: {} })); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [userId]); // Re-fetch if userId changes

  // Save data to API when events change
  // useCallback helps prevent unnecessary re-creation of the save function
  const saveData = useCallback(async (eventsToSave: Record<string, DayData>) => {
    if (!userId || Object.keys(eventsToSave).length === 0) return; // Don't save if no user or no events
    setIsSaving(true);
    setError(null);
    try {
      // Prepare data for saving: potentially convert Date objects to strings
      // Our API currently accepts the object as is, assuming MongoDB handles Date types
      await axios.post('/api/calendar', eventsToSave);
      // console.log('Data saved successfully'); // Optional success log
    } catch (err) {
      console.error('Failed to save calendar data:', err);
      setError('无法保存日历数据，请检查网络连接。');
      // Handle save error (e.g., show notification, offer retry)
    } finally {
      setIsSaving(false);
    }
  }, [userId]); // Dependency array includes userId

  // useEffect to trigger save when events change
  // Note: This saves on *every* change. Debouncing is recommended for production.
  useEffect(() => {
    // Don't save during initial load or if events haven't changed meaningfully
    if (!isLoading) { 
       saveData(calendarState.events);
    }
  }, [calendarState.events, isLoading, saveData]); // Depend on events, isLoading, and the memoized saveData

  // 切换视图
  const changeView = (view: CalendarState['view']) => {
    setCalendarState(prev => ({ ...prev, view }));
  };

  // 选择月份
  const handleSelectMonth = (month: number) => {
    setCalendarState(prev => ({ 
      ...prev, 
      view: 'month',
      selectedMonth: month 
    }));
  };

  // 选择日期
  const handleSelectDate = (date: Date) => {
    setCalendarState(prev => ({ 
      ...prev, 
      view: 'week',
      selectedDate: date,
      selectedYear: date.getFullYear(),
      selectedMonth: date.getMonth()
    }));
  };

  // 更改月份
  const handleChangeMonth = (year: number, month: number) => {
    setCalendarState(prev => ({ 
      ...prev,
      selectedYear: year,
      selectedMonth: month
    }));
  };

  // 更改年份 (用于 YearView)
  const handleChangeYear = (year: number) => {
    setCalendarState(prev => ({ 
      ...prev,
      selectedYear: year
      // 可以考虑：切换年份后是否重置月份或日期选择？目前不重置
    }));
  };

  // 获取天气数据 (现在调用后端 API)
  const fetchWeather = async (city: string): Promise<Weather | null> => {
    if (!city) return null;
    console.log(`[fetchWeather] Attempting to fetch weather for city: \"${city}\"`);
    try {
      // 调用后端 API 路由
      const response = await axios.get(`/api/weather?city=${encodeURIComponent(city)}`);
      if (response.status === 200) {
        return response.data; // 后端返回标准化后的 Weather 对象
      } else {
        // Use response.data safely
        const errorMessage = response.data?.message || 'Unknown error';
        console.error(`获取天气失败 (${response.status}): ${errorMessage}`);
        return null;
      }
    } catch (error: unknown) { // Changed any to unknown again
       let errorMessage = '未知错误';
       if (axios.isAxiosError(error)) {
           // Safely access error.response properties
           errorMessage = error.response?.data?.message || error.message || 'Axios 请求错误';
       } else if (error instanceof Error) {
           errorMessage = error.message;
       }
       console.error(`调用天气 API 失败 for city \"${city}\":`, errorMessage, error); // Log original error too
       return null;
    }
  };

  // 添加城市记录
  const handleAddCityRecord = async (date: Date, cityRecord: Partial<CityRecord>) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const newId = uuidv4();
    
    // 获取天气数据
    const weather = await fetchWeather(cityRecord.city || '');
    
    const newCityRecord: CityRecord = {
      id: newId,
      city: cityRecord.city || '',
      activities: [],
      weather: weather || undefined
    };
    
    setCalendarState(prev => {
      const existingDayData = prev.events[dateStr] || { date, cityRecords: [] };
      
      return {
        ...prev,
        events: {
          ...prev.events,
          [dateStr]: {
            ...existingDayData,
            cityRecords: [...existingDayData.cityRecords, newCityRecord]
          }
        }
      };
    });
  };

  // 添加活动
  const handleAddActivity = (date: Date, cityRecordId: string, activity: Partial<Activity>) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const newActivityId = uuidv4();
    
    setCalendarState(prev => {
      const existingDayData = prev.events[dateStr];
      if (!existingDayData) return prev;
      
      const updatedCityRecords = existingDayData.cityRecords.map(record => {
        if (record.id === cityRecordId) {
          return {
            ...record,
            activities: [
              ...record.activities,
              { id: newActivityId, description: activity.description || '' }
            ]
          };
        }
        return record;
      });
      
      return {
        ...prev,
        events: {
          ...prev.events,
          [dateStr]: {
            ...existingDayData,
            cityRecords: updatedCityRecords
          }
        }
      };
    });
  };

  // 删除城市记录
  const handleDeleteCityRecord = (date: Date, cityRecordId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    setCalendarState(prev => {
      const existingDayData = prev.events[dateStr];
      if (!existingDayData) return prev;
      
      const updatedCityRecords = existingDayData.cityRecords.filter(
        record => record.id !== cityRecordId
      );
      
      const updatedEvents = { ...prev.events };
      
      if (updatedCityRecords.length === 0 && existingDayData.cityRecords.length > 0) {
        // Only delete the date entry if it previously had city records
        delete updatedEvents[dateStr];
      } else if (updatedCityRecords.length > 0) {
        // Otherwise, update the existing entry
        updatedEvents[dateStr] = {
          ...existingDayData,
          cityRecords: updatedCityRecords
        };
      } else {
        // No change if already empty
         return prev;
      }
      
      return {
        ...prev,
        events: updatedEvents
      };
    });
  };

  // 删除活动
  const handleDeleteActivity = (date: Date, cityRecordId: string, activityId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    setCalendarState(prev => {
      const existingDayData = prev.events[dateStr];
      if (!existingDayData) return prev;
      
      const updatedCityRecords = existingDayData.cityRecords.map(record => {
        if (record.id === cityRecordId) {
          return {
            ...record,
            activities: record.activities.filter(activity => activity.id !== activityId)
          };
        }
        return record;
      }).filter(record => record.activities.length > 0 || record.city); // Optional: Clean up city record if no activities left?
      
      // This part needs careful thought: Do we delete the whole city record if empty?
      // For now, just update activities.
      if(updatedCityRecords.length === 0 && existingDayData.cityRecords.length > 0){
         // If deleting the last activity makes the city record list empty, delete the date entry
          const updatedEvents = { ...prev.events };
          delete updatedEvents[dateStr];
          return {
            ...prev,
            events: updatedEvents
          };
      }
      
      return {
        ...prev,
        events: {
          ...prev.events,
          [dateStr]: {
            ...existingDayData,
            cityRecords: updatedCityRecords.length > 0 ? updatedCityRecords : existingDayData.cityRecords // Avoid setting empty if filtering logic is complex
          }
        }
      };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {isSaving && (
        <div className="fixed top-4 right-4 bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm">正在保存...</div>
      )}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">错误!</strong>
          <span className="block sm:inline"> {error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap justify-between items-center">
        <div className="space-x-1 sm:space-x-2 flex mb-2 w-full sm:mb-0 sm:w-auto">
          <button 
            onClick={() => changeView('year')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md ${
              calendarState.view === 'year' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            年视图
          </button>
          <button 
            onClick={() => changeView('month')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md ${
              calendarState.view === 'month' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            月视图
          </button>
          <button 
            onClick={() => changeView('week')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-md ${
              calendarState.view === 'week' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            周视图
          </button>
        </div>
      </div>
      
      {calendarState.view === 'year' && (
        <YearView 
          year={calendarState.selectedYear} 
          events={calendarState.events}
          onSelectMonth={handleSelectMonth}
          onChangeYear={handleChangeYear}
        />
      )}
      
      {calendarState.view === 'month' && (
        <MonthView 
          year={calendarState.selectedYear}
          month={calendarState.selectedMonth}
          events={calendarState.events}
          onDayClick={handleSelectDate}
          onChangeMonth={handleChangeMonth}
          getCityColor={getCityColor}
        />
      )}
      
      {calendarState.view === 'week' && (
        <WeekView 
          selectedDate={calendarState.selectedDate}
          events={calendarState.events}
          onDateChange={handleSelectDate}
          onAddCityRecord={handleAddCityRecord}
          onAddActivity={handleAddActivity}
          onDeleteCityRecord={handleDeleteCityRecord}
          onDeleteActivity={handleDeleteActivity}
          getCityColor={getCityColor}
        />
      )}
    </div>
  );
} 