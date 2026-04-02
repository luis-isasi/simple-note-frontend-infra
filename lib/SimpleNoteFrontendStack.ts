import { Stack, StackProps, Tags } from "aws-cdk-lib";
import { aws_amplify as amplify } from "aws-cdk-lib";
import { Construct } from "constructs";
import configuration from "../config/config.json";
import { DevOpsNestedStack } from "./DevOpsNestedStack";

export class SimpleNoteFrontendStack extends Stack {
  constructor(scope: Construct, props: StackProps) {
    super(scope, "SimpleNoteFrontendStack", props);

    Tags.of(this).add("project", "SimpleNoteClone");

    const amplifyApp = new amplify.CfnApp(this, "AmplifyApp", {
      name: "simple-note-clone",
      platform: "WEB",
      customRules: [
        {
          source:
            "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
      customHeaders: `
customHeaders:
  - pattern: '**/*'
    headers:
      - key: Strict-Transport-Security
        value: max-age=31536000; includeSubDomains
      - key: X-Content-Type-Options
        value: nosniff
      - key: X-Frame-Options
        value: DENY
      - key: X-XSS-Protection
        value: 1; mode=block
      - key: Referrer-Policy
        value: strict-origin-when-cross-origin
`,
    });

    const devBranch = new amplify.CfnBranch(this, "DevBranch", {
      appId: amplifyApp.attrAppId,
      branchName: configuration.component.core.branches.development,
      stage: "DEVELOPMENT",
    });

    const prodBranch = new amplify.CfnBranch(this, "ProdBranch", {
      appId: amplifyApp.attrAppId,
      branchName: configuration.component.core.branches.production,
      stage: "PRODUCTION",
    });

    const domain = new amplify.CfnDomain(this, "Domain", {
      appId: amplifyApp.attrAppId,
      domainName: configuration.domain.baseDomain,
      subDomainSettings: [
        {
          branchName: configuration.component.core.branches.development,
          prefix: "notes-dev",
        },
        {
          branchName: configuration.component.core.branches.production,
          prefix: "notes",
        },
      ],
    });

    domain.addDependency(devBranch);
    domain.addDependency(prodBranch);

    new DevOpsNestedStack(this, {
      amplifyAppId: amplifyApp.attrAppId,
      config: configuration.component.core,
      devEnvs: configuration.component.development.envs,
      prodEnvs: configuration.component.production.envs,
    });
  }
}
