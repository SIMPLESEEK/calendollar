'use client';

import React, { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  addWeeks,
  subWeeks,
  isSameDay,
  addDays,
  subDays
} from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarState, CityRecord, Activity, Weather } from '@/types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
// 导入 react-icons 天气图标
import {
  WiDaySunny, WiNightClear, WiCloud, WiCloudy, WiFog, WiShowers, WiRain, 
  WiThunderstorm, WiSnow, WiDayCloudy, WiNightAltCloudy, WiRainMix, 
  WiDayShowers, WiNightAltShowers, WiDayRain, WiNightAltRain, WiDaySnow, 
  WiNightAltSnow, WiDaySleet, WiNightAltSleet, WiNa, WiTornado, 
  WiDust, WiSnowflakeCold, WiSleet, WiRaindrop, WiRaindrops,
  WiStrongWind
} from 'react-icons/wi'; 

// 更新天气图标映射为 React Icons 组件 (适配 WeatherAPI.com)
const getWeatherIcon = (condition: string | undefined): React.ReactElement => {
  const lowerCondition = condition?.toLowerCase() || '';
  const iconSize = "w-4 h-4"; // 定义统一图标大小
  let iconComponent: React.ReactElement = <WiNa className={iconSize} />; // Default icon
  let animationClass = ''; // Default no animation

  // --- 主要天气状况映射 ---
  if (lowerCondition.includes('sunny')) {
    iconComponent = <WiDaySunny className={iconSize} />;
    animationClass = 'animate-spin-slow';
  } else if (lowerCondition.includes('clear')) { // Usually means clear night
    iconComponent = <WiNightClear className={iconSize} />;
    animationClass = 'animate-spin-slow';
  } else if (lowerCondition.includes('partly cloudy')) {
    iconComponent = <WiDayCloudy className={iconSize} />;
    animationClass = 'animate-float';
  } else if (lowerCondition.includes('cloudy')) {
    iconComponent = <WiCloud className={iconSize} />;
    animationClass = 'animate-float';
  } else if (lowerCondition.includes('overcast')) {
    iconComponent = <WiCloudy className={iconSize} />;
    animationClass = 'animate-float';
  } else if (lowerCondition.includes('mist') || lowerCondition.includes('fog') || lowerCondition.includes('haze')) {
    iconComponent = <WiFog className={iconSize} />; 
  } else if (lowerCondition.includes('patchy rain possible') || lowerCondition.includes('light rain shower')) {
     iconComponent = <WiDayShowers className={iconSize} />;
  } else if (lowerCondition.includes('rain')) {
    if (lowerCondition.includes('light')) iconComponent = <WiRaindrop className={iconSize} />;
    else if (lowerCondition.includes('moderate')) iconComponent = <WiRaindrops className={iconSize} />;
    else if (lowerCondition.includes('heavy')) iconComponent = <WiRain className={iconSize} />;
    else if (lowerCondition.includes('freezing')) iconComponent = <WiRainMix className={iconSize} />;
    else iconComponent = <WiRain className={iconSize} />;
  } else if (lowerCondition.includes('snow')) {
    if (lowerCondition.includes('light')) iconComponent = <WiDaySnow className={iconSize} />;
    else if (lowerCondition.includes('moderate')) iconComponent = <WiSnow className={iconSize} />;
    else if (lowerCondition.includes('heavy')) iconComponent = <WiSnowflakeCold className={iconSize} />;
    else if (lowerCondition.includes('patchy')) iconComponent = <WiDaySnow className={iconSize} />;
    else iconComponent = <WiSnow className={iconSize} />;
  } else if (lowerCondition.includes('sleet')) {
      iconComponent = <WiSleet className={iconSize} />;
  } else if (lowerCondition.includes('thunder')) {
    iconComponent = <WiThunderstorm className={iconSize} />;
  } else if (lowerCondition.includes('blizzard')) {
    // Use strong wind + snow for blizzard representation
    // Wrap in a fragment, animation applied individually if needed later
    iconComponent = <><WiStrongWind className={iconSize} /><WiSnow className={iconSize} /></>;
  } else if (lowerCondition.includes('ice pellets')) {
    iconComponent = <WiDaySleet className={iconSize} />;
  } else if (lowerCondition.includes('dust') || lowerCondition.includes('sand')) {
      iconComponent = <WiDust className={iconSize} />;
  }
  
  // Wrap the icon in a span with animation class if needed
  if (animationClass) {
    // For blizzard, animationClass won't apply to the fragment wrapper easily, skip for now
    if (lowerCondition.includes('blizzard')) {
        return iconComponent; 
    }
    return <span className={animationClass}>{iconComponent}</span>;
  }
  
  return iconComponent;
};

interface WeekViewProps {
  selectedDate: Date;
  events: CalendarState['events'];
  onDateChange: (date: Date) => void;
  onAddCityRecord: (date: Date, cityRecord: Partial<CityRecord>) => Promise<void>;
  onAddActivity: (date: Date, cityRecordId: string, activity: Partial<Activity>) => void;
  onDeleteCityRecord: (date: Date, cityRecordId: string) => void;
  onDeleteActivity: (date: Date, cityRecordId: string, activityId: string) => void;
  getCityColor: (city: string) => string;
}

export default function WeekView({ 
  selectedDate, 
  events,
  onDateChange,
  onAddCityRecord,
  onAddActivity,
  onDeleteCityRecord,
  onDeleteActivity,
  getCityColor
}: WeekViewProps) {
  const [addingCity, setAddingCity] = useState<{ date: Date | null }>({ date: null });
  const [newCity, setNewCity] = useState('');
  const [addingActivity, setAddingActivity] = useState<{ cityRecordId: string | null }>({ cityRecordId: null });
  const [newActivity, setNewActivity] = useState('');

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const daysInWeek = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const prevWeek = () => onDateChange(subDays(weekStart, 7));
  const nextWeek = () => onDateChange(addDays(weekEnd, 1));

  const handleStartAddCity = (day: Date) => {
    setAddingCity({ date: day });
    setNewCity('');
  };

  const handleConfirmAddCity = async () => {
    if (newCity.trim() && addingCity.date) {
      await onAddCityRecord(addingCity.date, { city: newCity });
      setAddingCity({ date: null });
      setNewCity('');
    }
  };

  const handleCancelAddCity = () => {
    setAddingCity({ date: null });
    setNewCity('');
  };
  
  const handleStartAddActivity = (cityRecordId: string) => {
    setAddingActivity({ cityRecordId });
    setNewActivity('');
  };

  const handleConfirmAddActivity = (date: Date, cityRecordId: string) => {
    if (newActivity.trim()) {
      onAddActivity(date, cityRecordId, { description: newActivity });
      setAddingActivity({ cityRecordId: null });
      setNewActivity('');
    }
  };
  
  const handleCancelAddActivity = () => {
     setAddingActivity({ cityRecordId: null });
     setNewActivity('');
  };

  return (
    <div className="bg-amber-50 p-3 sm:p-4 rounded-lg shadow-md border border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevWeek} className="p-1.5 sm:p-2 rounded-full text-amber-700 hover:bg-amber-100">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-amber-900">
          {format(weekStart, 'yyyy年 MMMM d日', { locale: zhCN })} - {format(weekEnd, 'd日', { locale: zhCN })}
        </h2>
        <button onClick={nextWeek} className="p-1.5 sm:p-2 rounded-full text-amber-700 hover:bg-amber-100">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {daysInWeek.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayRecords = events[dateStr]?.cityRecords || [];
          const isAddingCityForThisDay = addingCity.date && isSameDay(day, addingCity.date);

          return (
            <div key={dateStr} className="bg-white p-2 sm:p-3 rounded shadow border border-amber-100 space-y-2 flex flex-col">
              <div className="flex justify-between items-center pb-1 border-b border-amber-100">
                <span className={`font-semibold text-sm sm:text-base ${isToday(day) ? 'text-blue-600' : 'text-amber-800'}`}>
                  {format(day, 'EEE d', { locale: enUS })}
                </span>
                {!isAddingCityForThisDay && (
                   <button 
                    onClick={() => handleStartAddCity(day)}
                    className="p-1 rounded-full text-amber-600 hover:bg-amber-100"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {isAddingCityForThisDay && (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="输入城市名..."
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAddCity(); }}
                    className="w-full border-amber-300 rounded shadow-sm text-sm p-1.5 focus:ring-amber-500 focus:border-amber-500"
                    autoFocus
                  />
                  <div className="flex space-x-1">
                     <button onClick={handleConfirmAddCity} className="flex-1 bg-amber-500 text-white text-xs py-1 rounded hover:bg-amber-600">添加</button>
                     <button onClick={handleCancelAddCity} className="flex-1 bg-gray-300 text-gray-700 text-xs py-1 rounded hover:bg-gray-400">取消</button>
                  </div>
                </div>
              )}

              <div className="space-y-2 flex-grow">
                {dayRecords.map((record) => {
                   const isAddingActivityForThisCity = addingActivity.cityRecordId === record.id;
                   return (
                    <div key={record.id} className="p-1.5 rounded border border-amber-200 bg-amber-50/50">
                      <div className="flex flex-row justify-between items-center mb-1 sm:flex-col sm:items-start">
                        <div className="flex justify-between items-center flex-grow sm:w-full">
                          <span
                            title={record.city}
                            className={`font-medium text-xs px-2 py-0.5 rounded text-white shadow-sm ${getCityColor(record.city)} sm:mb-1`}
                          >
                            {record.city}
                          </span>
                          <button 
                            onClick={() => onDeleteCityRecord(day, record.id)} 
                            className="hidden sm:block p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center w-auto sm:w-full sm:mt-1">
                          {record.weather ? (
                             <span className="text-xs text-amber-700 flex items-center space-x-0.5 flex-grow mr-1">
                                {getWeatherIcon(record.weather.condition)}
                                <span className="truncate" title={record.weather.condition}>{record.weather.condition}</span>
                                <span>{record.weather.temperature}°C</span>
                             </span>
                          ) : (
                            <span className="flex-grow sm:hidden"></span> 
                          )}
                           <button 
                             onClick={() => onDeleteCityRecord(day, record.id)} 
                             className="block sm:hidden p-0.5 text-gray-400 hover:text-red-500 flex-shrink-0"
                           >
                             <TrashIcon className="h-3.5 w-3.5" />
                           </button>
                        </div>
                      </div>
                      <ul className="space-y-0.5 text-xs text-amber-800 pl-2">
                         {record.activities.map(activity => (
                          <li key={activity.id} className="flex justify-between items-center group">
                            <span>• {activity.description}</span>
                            <button 
                              onClick={() => onDeleteActivity(day, record.id, activity.id)} 
                              className="p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      {isAddingActivityForThisCity ? (
                          <div className="mt-1 space-y-0.5">
                              <input 
                                type="text" 
                                placeholder="输入活动..."
                                value={newActivity}
                                onChange={(e) => setNewActivity(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAddActivity(day, record.id); }}
                                className="w-full border-amber-300 rounded text-xs p-1 focus:ring-amber-500 focus:border-amber-500"
                                autoFocus
                              />
                              <div className="flex space-x-1">
                                <button onClick={() => handleConfirmAddActivity(day, record.id)} className="flex-1 bg-amber-500 text-white text-[0.6rem] py-0.5 rounded hover:bg-amber-600">添加</button>
                                <button onClick={handleCancelAddActivity} className="flex-1 bg-gray-300 text-gray-700 text-[0.6rem] py-0.5 rounded hover:bg-gray-400">取消</button>
                             </div>
                          </div>
                      ) : (
                          <button 
                            onClick={() => handleStartAddActivity(record.id)}
                            className="mt-1 w-full text-left text-amber-600 hover:text-amber-800 text-xs flex items-center"
                          >
                              <PlusIcon className="h-3 w-3 mr-1" /> 添加活动
                          </button>
                      )}
                    </div>
                   );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 