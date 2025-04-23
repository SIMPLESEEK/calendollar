import clientPromise from "@/lib/mongodb";
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { DayData } from '@/types';

// Define the structure for calendar data stored in MongoDB (可以放在 types 文件中共享)
interface CalendarData {
  _id?: ObjectId; // Use ObjectId type for _id
  userId: string;
  events: Record<string, DayData>; // Use DayData for event values
}

export async function getCalendarCollection(): Promise<{ client: MongoClient, db: Db, collection: Collection<CalendarData> }> {
    const client = await clientPromise;
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('Missing MONGODB_URI environment variable');
    }

    // Extract DB name from URI or use a default/dedicated env var
    let dbName: string;
    try {
      dbName = new URL(uri).pathname.substring(1);
      if (!dbName) {
          // If pathname is just '/', try getting DB name from env var or use default
          dbName = process.env.MONGODB_DB_NAME || 'cal'; // Example: Use MONGODB_DB_NAME or default to 'cal'
          console.warn(`MONGODB_URI does not contain DB name, using '${dbName}'. Consider setting MONGODB_DB_NAME env var.`);
      }
    } catch (e) {
        console.error("Failed to parse MONGODB_URI to get DB name, using default 'cal'. Error:", e);
        dbName = 'cal'; // Fallback on URI parsing error
    }


    const db = client.db(dbName);
    const collectionName = 'calendarEvents'; // Keep collection name consistent
    const collection = db.collection<CalendarData>(collectionName);
    console.log(`Using DB: '${dbName}', Collection: '${collectionName}'`); // Add log
    return { client, db, collection };
} 