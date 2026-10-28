if (process.env.DATABASE_URL_CUSTOM) process.env.DATABASE_URL = process.env.DATABASE_URL_CUSTOM;
import 'express-async-errors';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { startAutoConvertWorker } from './jobs/autoConvertLeads.js';

async function bootstrap() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start server
    app.listen(env.PORT, () => {
      console.log('');
      console.log('🚀 CRM API started');
      console.log(`   → Environment: ${env.NODE_ENV}`);
      console.log(`   → Server:      http://localhost:${env.PORT}`);
      console.log(`   → Health:      http://localhost:${env.PORT}/health`);
      console.log(`   → CORS origin: ${env.APP_URL}`);
      console.log('');

      // Start background auto-convert worker
      startAutoConvertWorker();
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// ─── Graceful shutdown ───
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();


// ✅ Prevent Render Free Tier from sleeping
setInterval(() => {
  // @ts-ignore
  fetch('https://ifleadnajeeb.onrender.com/health')
    .then(() => console.log('🔄 Keep-alive ping sent'))
    .catch((err: any) => console.error('Keep-alive failed:', err.message));
}, 10 * 60 * 1000); // Runs every 10 minutes
