"""
DriveScore CDK stack.

  * Lambda (Python 3.12, x86_64) running the FastAPI backend under the AWS
    Lambda Web Adapter (zip + layer — no Docker). Function URL in
    RESPONSE_STREAM mode so the /explain SSE streams natively.
  * IAM: bedrock:InvokeModel* on Anthropic Claude models (used only when
    USE_BEDROCK=1; the keyless live LLM + template fallback need no AWS perms).
  * Frontend: private S3 bucket + CloudFront (OAC, HTTPS) serving frontend/dist.
  * The frontend is built with VITE_API_BASE = the Function URL, so it calls the
    backend directly (SSE is not buffered by CloudFront).

Deployed only to the personal account <APP_ACCOUNT> / ap-southeast-1 (see app.py
guardrail + scripts/deploy.sh account check).
"""
import os

from aws_cdk import (
    Stack, Duration, CfnOutput, RemovalPolicy,
    aws_lambda as _lambda,
    aws_iam as iam,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_cloudfront as cf,
    aws_cloudfront_origins as origins,
)
from constructs import Construct

REGION = "ap-southeast-1"
# Public AWS Lambda Web Adapter layer (x86_64). Verify the latest version for
# ap-southeast-1 at deploy time; override with LWA_LAYER_ARN env if needed.
LWA_LAYER_ARN = os.environ.get(
    "LWA_LAYER_ARN",
    "arn:aws:lambda:ap-southeast-1:753240598075:layer:LambdaAdapterLayerX86_64:24",
)


class DriveScoreStack(Stack):
    def __init__(self, scope: Construct, cid: str, **kwargs) -> None:
        super().__init__(scope, cid, **kwargs)

        backend_asset = os.environ.get("BACKEND_ASSET", "../build/backend")
        frontend_asset = os.environ.get("FRONTEND_ASSET", "../frontend/dist")

        fn = _lambda.Function(
            self, "Api",
            runtime=_lambda.Runtime.PYTHON_3_12,
            architecture=_lambda.Architecture.X86_64,
            handler="lambda_function.handler",
            code=_lambda.Code.from_asset(backend_asset),
            timeout=Duration.seconds(60),
            memory_size=1024,
            environment={
                "DATA_DIR": "/var/task/data",
                "LLM_ENABLED": "1",
                "USE_BEDROCK": os.environ.get("USE_BEDROCK", "0"),
                "AWS_REGION_BEDROCK": REGION,
            },
        )

        fn.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            resources=[f"arn:aws:bedrock:{REGION}::foundation-model/anthropic.*"],
        ))

        # CORS is handled by FastAPI's CORSMiddleware (allow_origins=["*"]).
        # Do NOT also set Function URL CORS — that produces duplicate
        # Access-Control-Allow-Origin headers and browsers reject the response.
        furl = fn.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,
        )

        site = s3.Bucket(
            self, "Site",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True,
        )

        dist = cf.Distribution(
            self, "Cdn",
            default_behavior=cf.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(site),
                viewer_protocol_policy=cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            default_root_object="index.html",
            error_responses=[
                cf.ErrorResponse(http_status=403, response_http_status=200, response_page_path="/index.html"),
                cf.ErrorResponse(http_status=404, response_http_status=200, response_page_path="/index.html"),
            ],
            comment="DriveScore static site",
        )

        s3deploy.BucketDeployment(
            self, "Deploy",
            sources=[s3deploy.Source.asset(frontend_asset)],
            destination_bucket=site,
            distribution=dist,
            distribution_paths=["/*"],
        )

        CfnOutput(self, "FunctionUrl", value=furl.url)
        CfnOutput(self, "SiteUrl", value=f"https://{dist.distribution_domain_name}")
        CfnOutput(self, "BucketName", value=site.bucket_name)
