#!/usr/bin/env bash
# DriveScore — deploy to the PERSONAL AWS account only.
#   Frontend: S3 + CloudFront (HTTPS).  Backend: Lambda (FastAPI via Lambda Web
#   Adapter, Function URL streaming).  No Docker required (Linux wheels).
#
# Usage:  AWS_PROFILE=gunjan-aws ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."                      # scenario root

PROFILE="${AWS_PROFILE:-gunjan-aws}"
ACCOUNT_EXPECTED="<APP_ACCOUNT>"
REGION="ap-southeast-1"

echo "==> 0/5  Verifying credentials point to the PERSONAL account"
ACCT=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)
if [ "$ACCT" != "$ACCOUNT_EXPECTED" ]; then
  echo "ABORT: profile '$PROFILE' resolves to account $ACCT, expected $ACCOUNT_EXPECTED."
  echo "       Refusing to deploy so your work account is never touched."
  exit 1
fi
echo "    OK — account $ACCT (region $REGION) via profile '$PROFILE'"
export AWS_PROFILE="$PROFILE" AWS_REGION="$REGION" CDK_DEFAULT_REGION="$REGION"
export CDK_DEFAULT_ACCOUNT="$ACCT"

echo "==> 1/5  Packaging backend (Linux wheels — no Docker)"
rm -rf build/backend && mkdir -p build/backend/data
cp backend/*.py backend/run.sh build/backend/
chmod +x build/backend/run.sh
cp data/drivers.json data/explain_cache.json build/backend/data/
python3 -m pip install \
  --platform manylinux2014_x86_64 --implementation cp --python-version 3.12 \
  --only-binary=:all: --no-compile --upgrade --target build/backend \
  -r backend/requirements.txt

echo "==> 2/5  CDK bootstrap (idempotent) + first deploy"
cd infra
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install --quiet -r requirements.txt
export PATH="$PWD/.venv/bin:$PATH"
# Build an initial frontend bundle so the first synth has assets to upload.
( cd ../frontend && npm install >/dev/null 2>&1 || true && npm run build >/dev/null )
cdk bootstrap "aws://$ACCOUNT_EXPECTED/$REGION" >/dev/null 2>&1 || cdk bootstrap "aws://$ACCOUNT_EXPECTED/$REGION"
cdk deploy --require-approval never

echo "==> 3/5  Reading the Function URL"
FURL=$(aws cloudformation describe-stacks --stack-name DriveScoreStack \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" --output text)
FURL="${FURL%/}"
echo "    Function URL: $FURL"

echo "==> 4/5  Rebuilding frontend against the live API + redeploying"
( cd ../frontend && VITE_API_BASE="$FURL" npm run build >/dev/null )
cdk deploy --require-approval never

echo "==> 5/5  Done"
SITE=$(aws cloudformation describe-stacks --stack-name DriveScoreStack \
  --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" --output text)
echo
echo "DriveScore is live:"
echo "  Frontend : $SITE"
echo "  API      : $FURL"
echo "  (Bedrock live AI: redeploy with USE_BEDROCK=1 once model access is enabled.)"
