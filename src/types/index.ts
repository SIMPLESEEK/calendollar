export interface CityRecord {
  id: string;
  city: string;
  activities: Activity[];
  weather?: Weather;
}

export interface Activity {
  id: string;
  description: string;
}

export interface Weather {
  temperature: number;
  condition: string;
  icon: string;
}

export interface DayData {
  date: Date;
  cityRecords: CityRecord[];
}

export interface CalendarState {
  view: 'year' | 'month' | 'week';
  selectedDate: Date;
  selectedYear: number;
  selectedMonth: number;
  events: Record<string, DayData>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
} 