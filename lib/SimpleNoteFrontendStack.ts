import { Stack, StackProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";

interface SimpleNoteFrontendStackProps extends StackProps {}

export class SimpleNoteFrontendStack extends Stack {
  constructor(scope: Construct, props?: SimpleNoteFrontendStackProps) {
    super(scope, "SimpleNoteFrontendStack", props);
  }
}
