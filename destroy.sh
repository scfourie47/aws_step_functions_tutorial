#!/bin/bash
set -e

source .env
STAGE=${1:-$STAGE}
REGION=${REGION}
PROFILE=${default:-$PROFILE}

yarn cdk destroy --force \
    -c stage=${STAGE} \
    -c region=${REGION} \
    --profile ${PROFILE} \
    --AwsStepFunctionsTutorialStack-stephan-dev 