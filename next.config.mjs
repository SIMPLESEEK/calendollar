/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'mysecret',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    GITHUB_ID: process.env.GITHUB_ID || '',
    GITHUB_SECRET: process.env.GITHUB_SECRET || '',
  },
};

export default nextConfig; 