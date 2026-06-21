"""DriveScore CDK stack (STUB — cloud deploy deferred).

Intended resources:
  * lambda.Function (Python 3.12) bundling ../backend + ../data, handler routing
    /score /price /explain /portfolio. InvokeMode.RESPONSE_STREAM for SSE.
  * Function URL (auth NONE for the demo) OR an HTTP API (apigwv2).
  * IAM: grant bedrock:InvokeModel + bedrock:InvokeModelWithResponseStream on
    the Claude Sonnet 4.6 model ARN in ap-southeast-1.
  * S3 bucket (static website) + BucketDeployment of ../frontend/dist.

Left as a stub so the prototype runs locally with zero cloud dependencies.
"""
# from aws_cdk import (
#     Stack, Duration, RemovalPolicy,
#     aws_lambda as _lambda,
#     aws_iam as iam,
#     aws_s3 as s3,
#     aws_s3_deployment as s3deploy,
# )
# from constructs import Construct
#
# class DriveScoreStack(Stack):
#     def __init__(self, scope: Construct, cid: str, **kwargs) -> None:
#         super().__init__(scope, cid, **kwargs)
#         fn = _lambda.Function(self, "Api",
#             runtime=_lambda.Runtime.PYTHON_3_12,
#             handler="lambda_handler.handler",
#             code=_lambda.Code.from_asset("../backend"),
#             timeout=Duration.seconds(30), memory_size=512)
#         fn.add_to_role_policy(iam.PolicyStatement(
#             actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
#             resources=["arn:aws:bedrock:ap-southeast-1::foundation-model/anthropic.claude-sonnet-4-6"]))
#         fn.add_function_url(auth_type=_lambda.FunctionUrlAuthType.NONE,
#             invoke_mode=_lambda.InvokeMode.RESPONSE_STREAM)
#         site = s3.Bucket(self, "Site", website_index_document="index.html",
#             public_read_access=True, removal_policy=RemovalPolicy.DESTROY,
#             auto_delete_objects=True)
#         s3deploy.BucketDeployment(self, "Deploy",
#             sources=[s3deploy.Source.asset("../frontend/dist")],
#             destination_bucket=site)
