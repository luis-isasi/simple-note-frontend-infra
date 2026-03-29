import { NestedStack, NestedStackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import {
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codePipelineActions,
  aws_codebuild as codeBuild,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentNestedStack } from './EnvironmentNestedStack';

interface CoreConfig {
  repository: {
    owner: string;
    repository: string;
    connectionArn: string;
  };
}

interface DevOpsNestedStackProps extends NestedStackProps {
  developmentStack: EnvironmentNestedStack;
  productionStack: EnvironmentNestedStack;
  config: CoreConfig;
}

export class DevOpsNestedStack extends NestedStack {
  constructor(scope: Construct, props: DevOpsNestedStackProps) {
    super(scope, 'DevOps', props);

    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const pipeline = new codePipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'SimpleNoteFrontendPipeline',
      artifactBucket,
    });

    // Source artifact
    const sourceCode = new codePipeline.Artifact('SourceCode');

    // Source Stage
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codePipelineActions.CodeStarConnectionsSourceAction({
          actionName: 'Checkout',
          triggerOnPush: true,
          branch: 'main',
          output: sourceCode,
          owner: props.config.repository.owner,
          repo: props.config.repository.repository,
          connectionArn: props.config.repository.connectionArn,
        }),
      ],
    });

    // Build Development
    const devBuildOutput = new codePipeline.Artifact('DevBuildOutput');
    pipeline.addStage({
      stageName: 'BuildDevelopment',
      actions: [
        new codePipelineActions.CodeBuildAction({
          actionName: 'Build',
          project: this.createBuildProject('Development'),
          input: sourceCode,
          outputs: [devBuildOutput],
        }),
      ],
    });

    // Deploy Development
    pipeline.addStage({
      stageName: 'DeployDevelopment',
      actions: [
        new codePipelineActions.S3DeployAction({
          actionName: 'Deploy',
          bucket: props.developmentStack.customBucket.bucket,
          input: devBuildOutput,
          cacheControl: [codePipelineActions.CacheControl.noCache()],
        }),
      ],
    });

    // Manual Approval before Production
    pipeline.addStage({
      stageName: 'ApproveProduction',
      actions: [
        new codePipelineActions.ManualApprovalAction({
          actionName: 'Approve',
        }),
      ],
    });

    // Build Production
    const prodBuildOutput = new codePipeline.Artifact('ProdBuildOutput');
    pipeline.addStage({
      stageName: 'BuildProduction',
      actions: [
        new codePipelineActions.CodeBuildAction({
          actionName: 'Build',
          project: this.createBuildProject('Production'),
          input: sourceCode,
          outputs: [prodBuildOutput],
        }),
      ],
    });

    // Deploy Production
    pipeline.addStage({
      stageName: 'DeployProduction',
      actions: [
        new codePipelineActions.S3DeployAction({
          actionName: 'Deploy',
          bucket: props.productionStack.customBucket.bucket,
          input: prodBuildOutput,
          cacheControl: [
            codePipelineActions.CacheControl.setPublic(),
            codePipelineActions.CacheControl.maxAge(Duration.days(1)),
          ],
        }),
      ],
    });
  }

  private createBuildProject(envName: string): codeBuild.PipelineProject {
    return new codeBuild.PipelineProject(this, `Build${envName}`, {
      projectName: `SimpleNoteFrontend-${envName}`,
      environment: {
        buildImage: codeBuild.LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '20' },
          },
          pre_build: {
            commands: ['npm install'],
          },
          build: {
            commands: ['npm run build'],
          },
        },
        artifacts: {
          files: ['**/*'],
          'base-directory': 'out',
        },
        cache: {
          paths: ['node_modules/**/*'],
        },
      }),
    });
  }
}
