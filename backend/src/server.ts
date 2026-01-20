import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const port = Number(process.env.PORT) || 4000;

async function start() {
  try {
    await prisma.$connect();
    console.log("Base de datos conectada");

    app.listen(port, () => {
      console.log(`Servidor corriendo en el puerto ${port}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor: ", error);
    process.exit(1);
  }
}

start();
