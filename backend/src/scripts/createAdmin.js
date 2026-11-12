// Crea el primer administrador. Se ejecuta una sola vez:  npm run create-admin
// Modo interactivo (pregunta nombre, correo y contraseña sin mostrarla) o, para
// automatizar, con las variables ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD.
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { z } from 'zod';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';
import { ROLES } from '../config/roles.js';
import { emailSchema, nameSchema, passwordSchema } from '../validators/common.js';

const schema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });

async function collectInput() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_NAME && ADMIN_EMAIL && ADMIN_PASSWORD) {
    return { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  }

  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
  });

  const askHidden = async (label) => {
    process.stdout.write(label);
    muted = true;
    const answer = await rl.question('');
    muted = false;
    process.stdout.write('\n');
    return answer;
  };

  try {
    const name = await rl.question('Nombre completo: ');
    const email = await rl.question('Correo: ');
    const password = await askHidden('Contraseña (no se muestra): ');
    const confirm = await askHidden('Repite la contraseña: ');
    if (password !== confirm) throw new Error('Las contraseñas no coinciden');
    return { name, email, password };
  } finally {
    rl.close();
  }
}

async function main() {
  const parsed = schema.safeParse(await collectInput());
  if (!parsed.success) {
    console.error('Datos inválidos:');
    for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  await connectDB();
  try {
    if (await User.exists({ email: parsed.data.email })) {
      console.error('Ya existe un usuario con ese correo.');
      process.exitCode = 1;
      return;
    }
    const user = await User.create({ ...parsed.data, role: ROLES.ADMIN });
    console.log(`Administrador creado: ${user.email}`);
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
