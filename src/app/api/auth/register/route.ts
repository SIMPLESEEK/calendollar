import { NextResponse } from 'next/server';
// import { v4 as uuidv4 } from 'uuid'; // 不再需要手动生成 ID，MongoDB 会生成 _id
import bcrypt from 'bcryptjs';
import clientPromise from "@/lib/mongodb";
import { MongoClient, Db } from 'mongodb';

// 移除模拟用户存储
// const users: any[] = [];

export async function POST(request: Request) {
  let client: MongoClient | null = null; // 声明 client 变量
  try {
    const body = await request.json();
    const { name, email, password } = body;
    
    // 基本验证
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '请提供所有必填字段' },
        { status: 400 }
      );
    }

    // 将邮箱转为小写
    const lowerCaseEmail = email.toLowerCase();

    // 连接数据库
    client = await clientPromise;
    const uri = process.env.MONGODB_URI!;
    const dbName = new URL(uri).pathname.substring(1) || 'cal';
    const db: Db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // 使用小写邮箱检查是否已在数据库中注册
    const existingUser = await usersCollection.findOne({ email: lowerCaseEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: '该邮箱已被注册' },
        { status: 409 } // Conflict
      );
    }
    
    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10); // 使用 bcrypt 哈希密码，salt rounds=10
    
    // 创建新用户文档 (使用小写邮箱)
    const newUserDocument = {
      // _id 会由 MongoDB 自动生成
      // id: uuidv4(), // next-auth adapter 会处理 id
      name,
      email: lowerCaseEmail, // 保存小写邮箱
      password: hashedPassword, // 存储哈希后的密码
      emailVerified: null, // 通常在邮箱验证流程后设置
      image: null, // 可以设置默认头像 URL 或留空
      createdAt: new Date(),
      updatedAt: new Date(),
      // 可以添加其他字段，如 roles: ['user']
    };
    
    // 插入用户到数据库
    // const result = await usersCollection.insertOne(newUserDocument); // Removed unused result assignment
    await usersCollection.insertOne(newUserDocument);
    
    // 从插入结果中获取用户数据（不含密码）用于返回
    // 注意：直接使用 newUserDocument 并移除 password 可能更简单
    // const insertedUser = await usersCollection.findOne({_id: result.insertedId});
    const { password: _password, ...userWithoutPassword } = newUserDocument; // Renamed _ to _password

    return NextResponse.json(
      { message: '注册成功', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error('注册失败：', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  } finally {
     // 在使用 clientPromise 的模式下，通常不需要手动关闭连接
     // if (client) {
     //   await client.close();
     // }
  }
} 