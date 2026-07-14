import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.user.findMany({ select: { email: true, role: true } })
  .then(r => console.log(JSON.stringify(r)))
  .finally(() => p['\']())
