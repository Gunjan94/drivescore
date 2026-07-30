"""CDK app entry — DriveScore.

Pinned to the account set via DEPLOY_ACCOUNT / ap-southeast-1. A guardrail aborts
synth/deploy if the resolved credentials point anywhere else, so a stray default
(work) profile can never deploy this stack.
"""
import os
import sys

import aws_cdk as cdk

from drivescore_stack import DriveScoreStack

ACCOUNT = os.environ.get("DEPLOY_ACCOUNT") or os.environ.get("CDK_DEFAULT_ACCOUNT")
REGION = "ap-southeast-1"

resolved = os.environ.get("CDK_DEFAULT_ACCOUNT")
if resolved and resolved != ACCOUNT:
    sys.exit(
        f"\n[GUARDRAIL] Refusing to deploy: resolved AWS account {resolved} != "
        f"personal account {ACCOUNT}.\nUse the personal profile, e.g. "
        f"`AWS_PROFILE=gunjan-aws cdk deploy`.\n"
    )

app = cdk.App()
DriveScoreStack(
    app, "DriveScoreStack",
    env=cdk.Environment(account=ACCOUNT, region=REGION),
    description="DriveScore — usage-based motor insurance prototype (personal account only)",
)
app.synth()
