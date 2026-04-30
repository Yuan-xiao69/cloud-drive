const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const repos = await prisma.repository.findMany({ include: { owner: true } });
  console.log('Repositories:', repos.length);
  repos.forEach(r => console.log('-', r.owner.username + '/' + r.name));

  const discs = await prisma.discussion.findMany({ include: { author: true } });
  console.log('Discussions:', discs.length);
  discs.forEach(d => console.log('-', d.title));

  await prisma.$disconnect();
}
main();
