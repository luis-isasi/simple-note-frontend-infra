import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import {
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
  aws_codebuild as codeBuild,
  aws_s3 as s3,
  aws_iam as iam,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface CoreConfig {
  repository: {
    owner: string;
    repository: string;
    connectionArn: string;
  };
  branches: {
    development: string;
    production: string;
  };
}

interface DevOpsNestedStackProps extends NestedStackProps {
  amplifyAppId: string;
  config: CoreConfig;
  devEnvs: Record<string, string | boolean>;
  prodEnvs: Record<string, string | boolean>;
}

export class DevOpsNestedStack extends NestedStack {
  constructor(scope: Construct, props: DevOpsNestedStackProps) {
    super(scope, "DevOps", props);

    const artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const pipeline = new codePipeline.Pipeline(this, "Pipeline", {
      pipelineName: "SimpleNoteFrontendPipeline",
      artifactBucket,
    });

    // Source artifact
    const sourceCode = new codePipeline.Artifact("SourceCode");

    // Source Stage
    pipeline.addStage({
      stageName: "Source",
      actions: [
        new codePipelineActions.CodeStarConnectionsSourceAction({
          actionName: "Checkout",
          triggerOnPush: true,
          branch: "main",
          output: sourceCode,
          owner: props.config.repository.owner,
          repo: props.config.repository.repository,
          connectionArn: props.config.repository.connectionArn,
        }),
      ],
    });

    // Build & Deploy Development
    const devBuildProject = this.createBuildProject(
      "Development",
      props.amplifyAppId,
      props.config.branches.development,
      props.devEnvs,
    );

    pipeline.addStage({
      stageName: "BuildDevelopment",
      actions: [
        new codePipelineActions.CodeBuildAction({
          actionName: "Build",
          project: devBuildProject,
          input: sourceCode,
        }),
      ],
    });

    // Manual Approval before Production
    pipeline.addStage({
      stageName: "ApproveProduction",
      actions: [
        new codePipelineActions.ManualApprovalAction({
          actionName: "Approve",
        }),
      ],
    });

    // Build & Deploy Production
    const prodBuildProject = this.createBuildProject(
      "Production",
      props.amplifyAppId,
      props.config.branches.production,
      props.prodEnvs,
    );

    pipeline.addStage({
      stageName: "BuildProduction",
      actions: [
        new codePipelineActions.CodeBuildAction({
          actionName: "Build",
          project: prodBuildProject,
          input: sourceCode,
        }),
      ],
    });
  }

  private createBuildProject(
    envName: string,
    amplifyAppId: string,
    branchName: string,
    envs: Record<string, string | boolean>,
  ): codeBuild.PipelineProject {
    const viteEnvVars = Object.fromEntries(
      Object.entries(envs).map(([key, value]) => [key, { value: String(value) }])
    );

    const project = new codeBuild.PipelineProject(this, `Build${envName}`, {
      projectName: `SimpleNoteFrontend-${envName}`,
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_7_0,
      },
      environmentVariables: {
        AMPLIFY_APP_ID: { value: amplifyAppId },
        AMPLIFY_BRANCH: { value: branchName },
        ...viteEnvVars,
      },
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": { nodejs: "20" },
          },
          pre_build: {
            commands: ["npm install"],
          },
          build: {
            commands: [
              "npm run build",
              "cd dist && zip -r ../build.zip . && cd ..",
              "RESULT=$(aws amplify create-deployment --app-id $AMPLIFY_APP_ID --branch-name $AMPLIFY_BRANCH)",
              "JOB_ID=$(echo $RESULT | python3 -c \"import sys,json; print(json.load(sys.stdin)['jobId'])\")",
              "ZIP_URL=$(echo $RESULT | python3 -c \"import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])\")",
              'curl -T build.zip "$ZIP_URL"',
              "aws amplify start-deployment --app-id $AMPLIFY_APP_ID --branch-name $AMPLIFY_BRANCH --job-id $JOB_ID",
            ],
          },
        },
        cache: {
          paths: ["node_modules/**/*"],
        },
      }),
    });

    project.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["amplify:CreateDeployment", "amplify:StartDeployment"],
        resources: [
          `arn:aws:amplify:*:*:apps/${amplifyAppId}/branches/${branchName}/deployments/*`,
          `arn:aws:amplify:*:*:apps/${amplifyAppId}/branches/${branchName}`,
        ],
      }),
    );

    return project;
  }
}
