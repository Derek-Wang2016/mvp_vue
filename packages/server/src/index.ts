import { PrismaClient } from '@prisma/client'
import { buildApp } from './app.js'
import { ensureDatabaseSchema } from './ensureDatabaseSchema.js'
import { isStrictPagePolicy } from './pageScopePolicy.js'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

const prisma = new PrismaClient()
const app = await buildApp(prisma)

if (isStrictPagePolicy()) {
  console.log('PAGE_POLICY=strict：发布模式，调试表只读')
}

try {
  const applied = await ensureDatabaseSchema(prisma)
  console.log('数据库文件:', process.env.DATABASE_URL ?? '(未设置)')
  if (applied.length > 0) {
    console.log('数据库结构已更新:', applied.join(', '))
  }
  await app.listen({ port: 3002, host: '0.0.0.0' })
  console.log('Server running at http://0.0.0.0:3002')
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
