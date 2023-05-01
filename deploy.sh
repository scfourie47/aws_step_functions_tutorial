#!/bin/bash
set -e

source .env
STAGE=${1:-$STAGE}
PROFILE=${PROFILE:-default}
ACCOUNT_ID=$(aws sts get-caller-identity --profile ${PROFILE} --query Account --output text)
REGION=${REGION}

echo STAGE: $STAGE 
echo Deploying using profile: $PROFILE
echo Region: $REGION Account:$ACCOUNT_ID

yarn cdk deploy --require-approval never \
    -c stage=${STAGE} \
    -c accountId=${ACCOUNT_ID} \
    -c region=${REGION} \
    --profile ${PROFILE} \
    --no-rollback \
    -O ./aws_config.json