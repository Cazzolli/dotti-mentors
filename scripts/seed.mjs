import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const db = createClient({ url: "file:./dev.db" });

async function hash(password) {
  return bcrypt.hash(password, 12);
}

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await hash(password);
  const existing = await db.execute({
    sql: "SELECT id FROM User WHERE email = ?",
    args: [email],
  });
  if (existing.rows.length > 0) {
    await db.execute({
      sql: "UPDATE User SET name=?, passwordHash=?, role=? WHERE email=?",
      args: [name, passwordHash, role, email],
    });
    console.log(`✓ Updated: ${email} (${role})`);
  } else {
    const id = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO User (id, email, name, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, email, name, passwordHash, role, new Date().toISOString()],
    });
    console.log(`✓ Created: ${email} (${role})`);
  }
}

await upsertUser({
  name: "Victor Cazzolli",
  email: "victorkalamith@gmail.com",
  password: "admin123",
  role: "ADMIN",
});

await upsertUser({
  name: "Prof. Ana Souza",
  email: "ana@dottimentors.com",
  password: "mentor123",
  role: "ADMIN",
});

await upsertUser({
  name: "João Aluno",
  email: "joao@aluno.com",
  password: "aluno123",
  role: "STUDENT",
});

console.log("\nCredenciais:");
console.log("  ADM 1  → victorkalamith@gmail.com / admin123");
console.log("  ADM 2  → ana@dottimentors.com / mentor123");
console.log("  Aluno  → joao@aluno.com / aluno123");
