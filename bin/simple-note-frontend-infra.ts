#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SimpleNoteFrontendStack } from "../lib/SimpleNoteFrontendStack";
import config from "../config/config.json";

const app = new cdk.App();

// Obtener el ambiente desde el contexto o usar 'development' por defecto
const environment = app.node.tryGetContext("environment") || "development";
const envConfig = config[environment as keyof typeof config] as any;

// Validar que existe la configuración para el ambiente
if (!envConfig || typeof envConfig !== "object") {
  throw new Error(
    `Configuración no encontrada para el ambiente: ${environment}`
  );
}

// Crear el stack con la configuración del ambiente
new SimpleNoteFrontendStack(app, `SimpleNoteFrontendStack-${environment}`, {
  env: {
    account: "192474940472",
    region: config.region,
  },
  environment,
  appName: config.amplify.appName,
  repository: config.amplify.repository,
  branch: config.amplify.branch,
  githubTokenSecretName: config.amplify.githubTokenSecretName,
  subdomain: envConfig.subdomain,
  baseDomain: config.domain.baseDomain,
  enableAutoBuilds: envConfig.enableAutoBuilds,
  tags: {
    Environment: environment,
    Project: "SimpleNote",
    ManagedBy: "CDK",
  },
});
app.synth();

