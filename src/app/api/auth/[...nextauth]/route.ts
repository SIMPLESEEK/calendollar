import NextAuth, { User as NextAuthUser, Session, AuthOptions } from 'next-auth';
import { Adapter, AdapterUser } from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
// import { User } from '@/types'; // 使用 next-auth 的 User 类型或适配器提供的类型
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb"; // 假设你将 MongoDB 客户端配置放在 lib/mongodb.ts
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
  // 可以根据需要添加其他字段，例如 roles 等
}

// 扩展 Session 类型以包含 id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & NextAuthUser // 合并基础 User 字段 (name, email, image)
  }
  // 无需在此处再次声明 User，我们将使用导入的 NextAuthUser
}

// 移除模拟用户数据库
// const users: User[] = [ ... ];

// 将 NextAuth 配置提取到 authOptions 变量中，并显式指定类型
export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '邮箱', type: 'email', placeholder: 'test@example.com' },
        password: { label: '密码', type: 'password' }
      },
      // authorize 函数返回 next-auth 需要的 User 类型 (不含密码)
      async authorize(credentials): Promise<NextAuthUser | null> { 
        if (!credentials?.email || !credentials?.password) {
          console.error("缺少邮箱或密码");
          return null;
        }

        // 确保 MONGODB_URI 环境变量已设置
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          console.error("MONGODB_URI 环境变量未设置");
          throw new Error("数据库连接字符串未配置");
        }

        let client: MongoClient | null = null;
        try {
          client = await clientPromise; 
          // 从连接字符串或单独的环境变量中获取数据库名称
          // 这里我们假设数据库名称包含在 URI 中，或者您可以设置一个 DB_NAME 环境变量
          // 适配器通常会处理数据库名称，但这里我们需要直接查询
          const dbName = new URL(uri).pathname.substring(1) || 'cal'; // 从 URI 获取或默认为 'cal'
          const db: Db = client.db(dbName);
          // 使用 DbUser 类型与数据库交互
          const usersCollection = db.collection<DbUser>('users'); 

          // 将输入的 email 转为小写进行查找
          const lowerCaseEmail = credentials.email.toLowerCase();
          console.log(`尝试在数据库 ${dbName} 的 users 集合中查找用户 (小写): ${lowerCaseEmail}`);

          // 使用小写邮箱查找用户
          const user = await usersCollection.findOne({ email: lowerCaseEmail });

          if (!user) {
            console.log("数据库中未找到用户");
            return null;
          }
          
          console.log("数据库中找到用户，正在验证密码...");

          // 确保用户有密码字段（例如，通过 GitHub 登录的用户可能没有密码）
          if (!user.password) {
             console.log("用户没有设置密码 (可能通过 OAuth 注册)");
             return null;
          }

          // 比较密码
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (isPasswordValid) {
            console.log("密码验证成功");
            // 返回符合 NextAuthUser 结构的对象 (移除 _id 和 password)
            // 确保返回的 id 是数据库 _id 的字符串形式
            return {
              id: user._id.toHexString(), // 使用 _id 的字符串形式
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
        } finally {
          // 使用 clientPromise 时，通常不需要手动关闭连接
          // if (client) {
          //   await client.close(); 
          // }
        }
      }
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  // Session 策略: 使用数据库适配器时，推荐使用 'database' 或 'jwt'
  // 'database' 会将会话存储在数据库中，适合需要查询在线用户的场景
  // 'jwt' (默认) 速度更快，但需要处理 JWT 的吊销等问题
  // 这里我们保持 jwt，但如果你需要数据库会话，可以改为 'database'
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register', // 确保你有注册页面和逻辑
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
  // 添加调试选项，方便开发时查看日志
  debug: process.env.NODE_ENV === 'development',
};

// 使用 authOptions 初始化 NextAuth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 