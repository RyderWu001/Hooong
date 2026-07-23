import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.user.findMany({ select: { id: true, email: true, role: true, username: true } })
  .then(u => { console.log(JSON.stringify(u, null, 2)); p.$disconnect() })
