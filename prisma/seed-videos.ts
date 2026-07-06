import { PrismaLibSql } from "@prisma/adapter-libsql";
// @ts-ignore
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const titles = [
  "Como melhorar seus resultados com essa técnica simples",
  "5 erros que todo iniciante comete",
  "O segredo que ninguém te conta sobre esse assunto",
  "Testei por 30 dias e olha o que aconteceu",
  "Por que a maioria das pessoas falha nessa etapa",
  "Tutorial completo do zero ao avançado",
  "Tudo que você precisa saber antes de começar",
  "Esse método mudou minha forma de trabalhar",
  "Análise honesta: vale a pena ou não?",
  "Os maiores aprendizados do meu último projeto",
  "Como eu aumentei minha produtividade em 3x",
  "Dicas que eu gostaria de ter sabido antes",
  "Reação aos maiores erros da área",
  "Comparando as duas abordagens mais populares",
  "Minha rotina completa revelada",
  "Como pensar diferente para ter resultados melhores",
  "O que mudei depois de muito tempo fazendo errado",
  "Revisão detalhada com prós e contras",
  "Experimento: tentei aplicar por uma semana",
  "Respondendo as dúvidas mais frequentes",
];

const channels = [
  "cmr5lo05p000l6jruozooxtk2", // Nutri em Casa
  "cmr5lo060000n6jruwr8vccwf", // Vida Saudável BR
  "cmr5lo066000o6jruhghm1ttc", // Tech Sem Mistério
  "cmr5lo06d000p6jruc0er9jk2", // Code na Prática
  "cmr5lo06l000q6jru6ou0jugq", // Startup do Zero
];

async function main() {
  for (const channelId of channels) {
    const count = rnd(15, 20);
    for (let i = 0; i < count; i++) {
      const ytId = `${channelId.slice(-8)}_${i}`;
      await db.video.upsert({
        where: { youtubeVideoId: ytId },
        update: {},
        create: {
          youtubeVideoId: ytId,
          channelId,
          title: titles[i % titles.length],
          thumbnailUrl: null,
          views: rnd(500, 80000),
          likes: rnd(20, 3000),
          commentsCount: rnd(5, 200),
          durationSeconds: rnd(120, 1200),
          isShort: false,
          publishedAt: new Date(Date.now() - rnd(1, 365) * 86400000),
          outlierScore: parseFloat((Math.random() * 3).toFixed(2)),
        },
      });
    }
    console.log(`Canal ${channelId.slice(-8)}: ${count} vídeos criados.`);
  }
  console.log("Pronto!");
}

main().catch(console.error).finally(() => db.$disconnect());
