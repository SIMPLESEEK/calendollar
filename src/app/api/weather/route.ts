import { NextResponse } from 'next/server';
import pinyin from 'pinyin'; // Import pinyin library

// --- 配置 WeatherAPI.com ---
const WEATHERAPI_CURRENT_API = 'https://api.weatherapi.com/v1/current.json';
const API_KEY = process.env.WEATHER_API_KEY; // Assuming you updated this key

// Function to check if string contains Chinese characters
const containsChinese = (text: string): boolean => {
  return /[\u4E00-\u9FA5]/.test(text);
};

// Function to convert Chinese city name to Pinyin
const convertToPinyin = (chineseCity: string): string => {
  const pinyinArray = pinyin(chineseCity, {
    style: pinyin.STYLE_NORMAL, // Get Pinyin without tone marks
  });
  // Join the Pinyin parts, WeatherAPI seems to prefer joined pinyin (e.g., "wuxi" not "wu xi")
  return pinyinArray.map(part => part[0]).join(''); 
};

export async function GET(request: Request) {
  console.log('[Weather API] Received GET request (using WeatherAPI.com)');
  if (!API_KEY) {
    console.error('[Weather API] Weather API key is missing');
    return NextResponse.json({ message: 'Weather service not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const cityParam = searchParams.get('city'); // Get original city param
  console.log(`[Weather API] Original request for city: \"${cityParam}\"`);

  if (!cityParam) {
    console.log('[Weather API] City parameter is missing');
    return NextResponse.json({ message: 'City parameter is required' }, { status: 400 });
  }

  // Convert to Pinyin if necessary
  let queryCity = cityParam;
  if (containsChinese(cityParam)) {
    queryCity = convertToPinyin(cityParam);
    console.log(`[Weather API] Converted Chinese city \"${cityParam}\" to Pinyin: \"${queryCity}\"`);
  } else {
      console.log(`[Weather API] City \"${cityParam}\" is not Chinese, using directly.`);
  }


  // 直接使用城市名称 (或 Pinyin) 获取天气
  const weatherUrl = `${WEATHERAPI_CURRENT_API}?key=${API_KEY}&q=${encodeURIComponent(queryCity)}&aqi=no`; // aqi=no to avoid air quality data
  console.log(`[Weather API] Requesting weather URL: ${weatherUrl}`);

  try {
    const weatherResponse = await fetch(weatherUrl);
    console.log(`[Weather API] WeatherAPI.com Response Status: ${weatherResponse.status} ${weatherResponse.statusText}`);

    const weatherData = await weatherResponse.json();
    // Log the raw response for debugging if needed
    // console.log(`[Weather API] WeatherAPI.com Raw Response for query \"${queryCity}\":`, weatherData);

    if (!weatherResponse.ok) {
      // WeatherAPI might return error details in the JSON body even on non-200 status
      // Check specifically for "No matching location found." error (code 1006)
      if (weatherData?.error?.code === 1006) {
           console.error(`[Weather API] WeatherAPI.com Error for city \"${cityParam}\" (query: \"${queryCity}\"). Status: ${weatherResponse.status}. Message: No matching location found.`);
           // Return a user-friendly 404, using original city name
           return NextResponse.json({ message: `未找到城市 '${cityParam}' 的天气信息` }, { status: 404 }); 
      }
      
      const errorMessage = weatherData?.error?.message || `获取天气失败 (${weatherResponse.status})`;
      console.error(`[Weather API] WeatherAPI.com Error for city \"${cityParam}\" (query: \"${queryCity}\"). Status: ${weatherResponse.status}. Message:`, errorMessage, weatherData);
      // Return the error message from WeatherAPI if available
      return NextResponse.json({ message: errorMessage }, { status: weatherResponse.status });
    }

    // 检查响应中是否有 current 数据
    if (weatherData.current && weatherData.current.condition) {
      const current = weatherData.current;
      const standardizedData = {
        temperature: Math.round(current.temp_c), // 获取摄氏温度并四舍五入
        condition: current.condition.text || '未知',      // 天气状况文字
        icon: current.condition.text || '未知'           // 使用状况文字给前端判断
      };
      // Use original city name for logging clarity
      console.log(`[Weather API] Successfully fetched weather for city \"${cityParam}\". Returning data:`, standardizedData); 
      return NextResponse.json(standardizedData, { status: 200 });
    } else {
        console.error(`[Weather API] WeatherAPI.com response format error for city \"${cityParam}\". Missing 'current' data. Response:`, weatherData);
        return NextResponse.json({ message: '获取实时天气数据格式错误' }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error(`[Weather API] Error fetching real-time weather for city \"${cityParam}\":`, error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Internal Server Error while fetching weather' }, { status: 500 });
  }
} 