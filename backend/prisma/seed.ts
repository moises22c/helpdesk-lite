import { prisma } from "../src/lib/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  const pass = await bcrypt.hash("prueba1234", 10);

  await prisma.user.upsert({
    where: { email: "prueba@demo.com" },
    update: {},
    create: {
      name: "prueba Demo",
      email: "prueba@demo.com",
      passwordHash: pass,
      role: "AGENT",
    },
  });

  await prisma.user.upsert({
    where: { email: "usuario@demo.com" },
    update: {},
    create: {
      name: "Usuario Demo",
      email: "usuario@demo.com",
      passwordHash: pass,
      role: "REQUESTER",
    },
  });
}

main().finally(() => prisma.$disconnect());
