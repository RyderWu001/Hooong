import prisma from '../src/db/client'
import bcrypt from 'bcryptjs'

async function main() {
  const hash = bcrypt.hashSync('admin1234', 10)
  await prisma.user.update({
    where: { email: 'admin@test.com' },
    data: { password: hash },
  })
  console.log('✅ admin@test.com 密碼已重設為 admin1234')
}

main().finally(() => prisma.$disconnect())
