#!/bin/sh

# Executed when localstack is up and running.
# Executed from inside the localstack container

set -x

export AWS_DEFAULT_REGION="us-east-1"

# Using dummy credentials for LocalStack
export AWS_ACCESS_KEY_ID="test-123"
export AWS_SECRET_ACCESS_KEY="test-123"

awslocal s3 mb s3://my-bucket-1
awslocal s3 cp /localstack_from_host_machine s3://my-bucket-1/ --recursive
awslocal s3api put-bucket-cors --bucket my-bucket-1 --cors-configuration file:///localstack_from_host_machine/cors-setup.json

awslocal s3 mb s3://my-bucket-2
awslocal s3 cp /localstack_from_host_machine s3://my-bucket-2/ --recursive
awslocal s3api put-bucket-cors --bucket my-bucket-2 --cors-configuration file:///localstack_from_host_machine/cors-setup.json

set +x