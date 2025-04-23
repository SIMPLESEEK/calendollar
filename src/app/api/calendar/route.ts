import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/lib/authOptions'; // Changed import path
// Remove local DB imports if moved to dbUtils
// import clientPromise from "@/lib/mongodb";
// import { MongoClient, Db } from 'mongodb';
import { getCalendarCollection } from '@/lib/dbUtils'; // Import the helper function

// Remove local CalendarData interface if moved to types or dbUtils
// interface CalendarData { ... }

// Remove local getCalendarCollection helper function
// async function getCalendarCollection(): Promise<{ ... }> { ... }

// GET handler to fetch calendar data for the logged-in user
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // Use the imported helper function
        const { collection } = await getCalendarCollection(); 
        const calendarData = await collection.findOne({ userId: userId });

        if (calendarData) {
            // Return only the events object
            return NextResponse.json(calendarData.events || {}, { status: 200 });
        } else {
            // No data found for this user, return empty object
            return NextResponse.json({}, { status: 200 });
        }
    } catch (error) {
        console.error('Failed to fetch calendar data:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST handler to save/update calendar data for the logged-in user
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let eventsData;

    try {
        eventsData = await request.json();
        if (typeof eventsData !== 'object' || eventsData === null) {
             throw new Error("Invalid data format received.");
        }
    } catch (error) {
         console.error('Failed to parse request body:', error);
        return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }


    try {
        // Use the imported helper function
        const { collection } = await getCalendarCollection();

        const result = await collection.updateOne(
            { userId: userId },
            { $set: { userId: userId, events: eventsData } },
            { upsert: true }
        );

        if (result.acknowledged) {
            return NextResponse.json({ message: 'Calendar data saved successfully' }, { status: 200 });
        } else {
            throw new Error("Database update not acknowledged.");
        }
    } catch (error) {
        console.error('Failed to save calendar data:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
} 