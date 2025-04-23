import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // @ts-expect-error - Use ts-expect-error instead of ts-ignore
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    // @ts-expect-error - Use ts-expect-error instead of ts-ignore
    global._mongoClientPromise = client.connect()
  }
  // @ts-expect-error - Use ts-expect-error instead of ts-ignore
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// 导出 MongoClient promise. 通过这种方式，
// 可以在整个应用中共享这个 promise，无需重复连接。
export default clientPromise 