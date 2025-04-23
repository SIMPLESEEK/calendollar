// src/lib/authOptions.ts
import { User as NextAuthUser, Session, AuthOptions } from 'next-auth';
import { Adapter, AdapterUser } from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb"; 
import bcrypt from 'bcryptjs';
import { MongoClient, Db, ObjectId } from 'mongodb';

// 定义用于数据库交互的用户类型，包含密码
interface DbUser {
  _id: ObjectId; // MongoDB 的 ID
  id: string; // next-auth 使用的 ID (通常是 _id 的字符串形式)
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null; // next-auth 适配器可能使用
  image?: string | null;
  password?: string | null; // 哈希后的密码
}

// 扩展 Session 类型以包含 id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & NextAuthUser // 合并基础 User 字段 (name, email, image)
  }
}

// 将 NextAuth 配置提取到 authOptions 变量中，并显式指定类型
export const authOptions: AuthOptions = { // <-- Added export here
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '邮箱', type: 'email', placeholder: 'test@example.com' },
        password: { label: '密码', type: 'password' }
      },
      async authorize(credentials): Promise<NextAuthUser | null> { 
        if (!credentials?.email || !credentials?.password) {
          console.error("缺少邮箱或密码");
          return null;
        }
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          console.error("MONGODB_URI 环境变量未设置");
          throw new Error("数据库连接字符串未配置");
        }
        let client: MongoClient | null = null;
        try {
          client = await clientPromise; 
          const dbName = new URL(uri).pathname.substring(1) || 'cal'; 
          const db: Db = client.db(dbName);
          const usersCollection = db.collection<DbUser>('users'); 
          const lowerCaseEmail = credentials.email.toLowerCase();
          console.log(`尝试在数据库 ${dbName} 的 users 集合中查找用户 (小写): ${lowerCaseEmail}`);
          const user = await usersCollection.findOne({ email: lowerCaseEmail });
          if (!user) {
            console.log("数据库中未找到用户");
            return null;
          }
          console.log("数据库中找到用户，正在验证密码...");
          if (!user.password) {
             console.log("用户没有设置密码 (可能通过 OAuth 注册)");
             return null;
          }
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (isPasswordValid) {
            console.log("密码验证成功");
            return {
              id: user._id.toHexString(), 
              name: user.name,
              email: user.email,
              image: user.image,
            };
          } else {
            console.log("密码验证失败");
            return null;
          }
        } catch (error) {
          console.error("Authorize 函数出错:", error);
          return null;
        }
        // finally block removed as client closing is handled by clientPromise
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register', 
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser | AdapterUser }) {
        if (user?.id) {
            token.id = user.id;
        }
        return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
        if (token?.id && session.user) {
            session.user.id = token.id as string;
        }
        return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
}; 