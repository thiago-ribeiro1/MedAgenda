const mongoose = require("mongoose");
const app = require("./app");
const { PORT, MONGO_URL, SEED_AO_INICIAR } = require("./config");
const { enviarLembretes } = require("./services/notificacoes");
const { popular } = require("./seed");

async function iniciar() {
  for (let tentativa = 1; ; tentativa++) {
    try {
      await mongoose.connect(MONGO_URL);
      break;
    } catch (e) {
      if (tentativa >= 20) throw e;
      console.log(`Aguardando o MongoDB (${tentativa})...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  console.log("MongoDB conectado");
  if (SEED_AO_INICIAR) await popular({ somenteSeVazio: true });

  const lembretes = () => enviarLembretes().catch(e => console.error("lembretes:", e.message));
  lembretes();
  setInterval(lembretes, 5 * 60 * 1000);

  app.listen(PORT, () => console.log(`API do MedAgenda em http://localhost:${PORT}/api`));
}

iniciar().catch(e => { console.error(e); process.exit(1); });
