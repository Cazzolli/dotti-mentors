import { PrismaLibSql } from "@prisma/adapter-libsql";
// @ts-ignore
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const STD_HASH = "$2b$12$6HTv1hgP/GvDvtSHiwgV3OAq9SvBtqQyIgXt1f0wbMDfV3c/LVAMm"; // aluno123

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fakeVideoId(i: number) {
  return `fkVid${String(i).padStart(8, "0")}`;
}

function fakeChannelId(slug: string) {
  return `UC${slug}FakeChannel`;
}

async function makeVideos(channelId: string, count: number) {
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
  for (let i = 0; i < count; i++) {
    const vid = `${channelId.slice(0, 6)}_v${i}`;
    await db.video.upsert({
      where: { youtubeVideoId: vid },
      update: {},
      create: {
        youtubeVideoId: vid,
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
}

async function main() {
  console.log("Atualizando usuários existentes...");

  await db.user.update({
    where: { id: "cmr5c4k6b0002afru1qfret14" },
    data: { name: "Lucas Ferreira", email: "lucas.ferreira@gmail.com", passwordHash: STD_HASH },
  });

  await db.user.update({
    where: { id: "849faf22-4159-4e60-b16d-684c9a8abdd6" },
    data: { name: "João Mendes", email: "joao.mendes@gmail.com", passwordHash: STD_HASH },
  });

  await db.user.update({
    where: { id: "d1814fb3-3890-4342-b64c-1362c01d2e37" },
    data: { name: "Maria Santos", email: "maria.santos@gmail.com", passwordHash: STD_HASH },
  });

  await db.user.update({
    where: { id: "7f8d8461-791f-47d3-be07-cba9d369f93e" },
    data: { name: "Pedro Lima", email: "pedro.lima@gmail.com", passwordHash: STD_HASH },
  });

  console.log("Criando 2 novos alunos...");

  const ana = await db.user.upsert({
    where: { email: "ana.oliveira@gmail.com" },
    update: {},
    create: {
      email: "ana.oliveira@gmail.com",
      name: "Ana Oliveira",
      passwordHash: STD_HASH,
      role: "STUDENT",
    },
  });

  const rafael = await db.user.upsert({
    where: { email: "rafael.souza@gmail.com" },
    update: {},
    create: {
      email: "rafael.souza@gmail.com",
      name: "Rafael Souza",
      passwordHash: STD_HASH,
      role: "STUDENT",
    },
  });

  const anaChannels = [
    { ytId: "UCana01FitnessBR", name: "Fit com Ana", handle: "@fitcomana" },
    { ytId: "UCana02NutriDica", name: "Nutri em Casa", handle: "@nutriemcasa" },
    { ytId: "UCana03VidaSaudavel", name: "Vida Saudável BR", handle: "@vidasaudavelbr" },
  ];

  const rafaelChannels = [
    { ytId: "UCraf01TechBR", name: "Tech Sem Mistério", handle: "@techsemmisterio" },
    { ytId: "UCraf02CodeBR", name: "Code na Prática", handle: "@codenaprática" },
    { ytId: "UCraf03StartupBR", name: "Startup do Zero", handle: "@startupdozero" },
  ];

  for (const ch of anaChannels) {
    const channel = await db.channel.upsert({
      where: { youtubeChannelId: ch.ytId },
      update: {},
      create: {
        youtubeChannelId: ch.ytId,
        name: ch.name,
        handle: ch.handle,
        avatarUrl: null,
        subscriberCount: rnd(800, 12000),
        viewCount: rnd(20000, 500000),
        uploadPlaylistId: null,
        lastSync: new Date(),
        studentId: ana.id,
        channelIdea: null,
      },
    });
    await makeVideos(channel.id, rnd(15, 20));
    console.log(`  Canal "${ch.name}" com vídeos criado.`);
  }

  for (const ch of rafaelChannels) {
    const channel = await db.channel.upsert({
      where: { youtubeChannelId: ch.ytId },
      update: {},
      create: {
        youtubeChannelId: ch.ytId,
        name: ch.name,
        handle: ch.handle,
        avatarUrl: null,
        subscriberCount: rnd(1000, 25000),
        viewCount: rnd(30000, 800000),
        uploadPlaylistId: null,
        lastSync: new Date(),
        studentId: rafael.id,
        channelIdea: null,
      },
    });
    await makeVideos(channel.id, rnd(15, 20));
    console.log(`  Canal "${ch.name}" com vídeos criado.`);
  }

  console.log("Pronto!");
}

main().catch(console.error).finally(() => db.$disconnect());
