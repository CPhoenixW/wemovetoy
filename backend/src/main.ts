import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = parseCorsOrigins(config.get<string>("CORS_ORIGIN"));

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: corsOrigins,
    credentials: corsOrigins !== "*",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("WEMOVE SPORTS API")
    .setDescription("WEMOVE SPORTS course project backend API")
    .setVersion("v1")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
  });

  app.enableShutdownHooks();
  const port = Number(config.get<string>("PORT") || 3000);
  await app.listen(Number.isFinite(port) ? port : 3000);
}

function parseCorsOrigins(rawOrigins: string | undefined): string | string[] {
  if (!rawOrigins || rawOrigins.trim() === "*") {
    return "*";
  }

  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] : origins;
}

void bootstrap();
