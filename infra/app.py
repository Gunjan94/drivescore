"""CDK app entry point (STUB — cloud deploy deferred for this prototype).

When fleshed out this will synthesize the DriveScoreStack: a Python 3.12 Lambda
(response streaming enabled) fronting engine.py/explain.py, a Function URL or
HTTP API, an IAM role granting bedrock:InvokeModelWithResponseStream, and an S3
static site for the built frontend. Region: ap-southeast-1 (fallback us-east-1).

The backend handlers in ../backend are written as plain functions specifically
so they can be lifted into a Lambda handler with minimal change.
"""
# import aws_cdk as cdk
# from drivescore_stack import DriveScoreStack
#
# app = cdk.App()
# DriveScoreStack(app, "DriveScoreStack",
#                 env=cdk.Environment(region="ap-southeast-1"))
# app.synth()

if __name__ == "__main__":
    print("infra/ is a stub — cloud deploy is deferred. Run locally: ./scripts/dev.sh")
