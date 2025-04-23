import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path if needed
import { getCalendarCollection } from '@/lib/dbUtils';
// Remove date-fns imports if no longer needed after switching to string comparison
// import { parse, isWithinInterval, isValid } from 'date-fns';

interface CityDurations {
    [city: string]: number;
}

interface KeywordCounts {
    [keyword: string]: number;
}

interface StatisticsResponse {
    cityDurations: CityDurations;
    keywordCounts?: KeywordCounts;
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        console.error("Statistics API: No session or user ID found."); // Log no session
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log("Statistics API: Processing request for userId:", userId); // Log Session User ID

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const keywordsParam = searchParams.get('keywords');

    if (!startDateParam || !endDateParam) {
        return NextResponse.json({ error: 'Missing startDate or endDate parameters' }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateParam) || !dateRegex.test(endDateParam)) {
         return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }
     if (startDateParam > endDateParam) {
         return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
     }

    const keywords = keywordsParam ? keywordsParam.split(',').map(k => k.trim()).filter(k => k) : [];

    try {
        // === Use the shared function to get DB and collection ===
        const { collection } = await getCalendarCollection();
        // console.log(`Statistics API: Using collection from getCalendarCollection.`); // Log confirmation

        console.log(`Statistics API: Attempting to find events for userId: ${userId}`);
        // The findOne query below is returning null. Check:
        // 1. Is the userId string exactly matching the one stored in the DB?
        // 2. Do dbName and collectionName above match your DB?
        // 3. Does the DB user in MONGODB_URI have read permissions for this collection?
        const userEvents = await collection.findOne({ userId: userId });

        // Log the raw result from findOne
        console.log("Statistics API: Result from findOne:", JSON.stringify(userEvents, null, 2));

        // Enhanced check for valid events data
        if (!userEvents || !userEvents.events || typeof userEvents.events !== 'object' || Object.keys(userEvents.events).length === 0) {
            console.warn("Statistics API: No events found for user or events object is empty/invalid. Returning empty stats."); // Log reason for empty stats
            // Return empty stats if no events found or events object is empty/invalid
            const response: StatisticsResponse = {
                cityDurations: {},
            };
            if (keywords.length > 0) {
                response.keywordCounts = keywords.reduce((acc, key) => { acc[key] = 0; return acc; }, {} as KeywordCounts);
            }
            return NextResponse.json(response, { status: 200 });
        }

        console.log("Statistics API: Found events, proceeding with calculation."); // Log confirmation
        const cityDurations: CityDurations = {};
        const keywordCounts: KeywordCounts = keywords.reduce((acc, key) => { acc[key] = 0; return acc; }, {} as KeywordCounts);

        // Iterate through the dates in the user's events
        for (const dateStr in userEvents.events) { 
            
            // Direct string comparison
            if (dateStr >= startDateParam && dateStr <= endDateParam) {
                const dayData = userEvents.events[dateStr];

                // City duration calculation (lowercase key)
                if (dayData.cityRecords && dayData.cityRecords.length > 0) {
                   const uniqueCitiesToday = new Set<string>();
                   dayData.cityRecords.forEach((record: { city: string }) => {
                       if (typeof record.city === 'string' && record.city.trim()) {
                          uniqueCitiesToday.add(record.city.trim().toLowerCase());
                       }
                   });
                   uniqueCitiesToday.forEach(city => {
                      cityDurations[city] = (cityDurations[city] || 0) + 1;
                   });
                }

                // Keyword count calculation (case-insensitive match, original keyword key)
                if (keywords.length > 0 && dayData.cityRecords && dayData.cityRecords.length > 0) {
                   dayData.cityRecords.forEach((record: { city?: string, activities?: Array<{ description: string }> }) => {
                        if (record.activities) {
                            record.activities.forEach((activity: { description: string }) => {
                                if (activity.description && typeof activity.description === 'string') {
                                    const desc = activity.description.toLowerCase();
                                    keywords.forEach(keyword => {
                                        const lowerKeyword = keyword.toLowerCase();
                                        if (lowerKeyword && desc.includes(lowerKeyword)) {
                                            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            } 
        }

        console.log("Statistics API: Calculation complete. Final Stats:", JSON.stringify({ cityDurations, keywordCounts }, null, 2));
        const response: StatisticsResponse = { cityDurations };
        if (keywords.length > 0) {
            response.keywordCounts = keywordCounts;
        }
        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        console.error('Statistics API: Error fetching statistics:', error); // Log actual error
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 