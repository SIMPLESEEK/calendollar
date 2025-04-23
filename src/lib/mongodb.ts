import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // 在开发模式下，使用全局变量以便热重载不会创建过多的连接
  // @ts-ignore
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    // @ts-ignore
    global._mongoClientPromise = client.connect()
  }
  // @ts-ignore
  clientPromise = global._mongoClientPromise
} else {
  // 在生产模式下，不需要全局变量
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// 导出 MongoClient promise. 通过这种方式，
// 可以在整个应用中共享这个 promise，无需重复连接。
export default clientPromise 