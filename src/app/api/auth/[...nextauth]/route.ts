import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions'; // Import from the new file

// Removed local imports and definitions previously used only by authOptions:
// import { Adapter, AdapterUser } from 'next-auth/adapters';
// import { JWT } from 'next-auth/jwt';
// import CredentialsProvider from 'next-auth/providers/credentials';
// import GithubProvider from 'next-auth/providers/github';
// import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
// import clientPromise from "@/lib/mongodb"; 
// import bcrypt from 'bcryptjs';
// import { MongoClient, Db, ObjectId } from 'mongodb';
// interface DbUser { ... }
// declare module "next-auth" { ... }
// const authOptions: AuthOptions = { ... }; // Removed the entire local definition

// Use the imported authOptions to initialize NextAuth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 