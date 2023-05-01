import { Construct } from 'constructs';
import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { JsonPath, Map, Parallel, Pass, StateMachine, StateMachineType, TaskInput, Succeed, Choice, Condition, Fail, LogLevel } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { join } from "path";
import { _FUTURE_ENTRIES_TABLE, _HISTORY_ENTRIES_TABLE, _USER_TABLE } from '../shared/variables';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export class AwsStepFunctionsTutorialStack extends Stack {
  public historyTable: dynamodb.Table;
  public futureTable: dynamodb.Table;
  public userTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const parallel = new Parallel(scope, "WorkInParallel", {
      resultPath: JsonPath.DISCARD
    });

    const historyFailed = new Fail(scope, 'Journal Job Failed', {
      cause: 'AWS Job Failed',
      error: 'Failed to process',
    });

    const futureFailed = new Fail(scope, 'Progress Job Failed', {
      cause: 'AWS Job Failed',
      error: 'Failed to process',
    });

    const userFailed = new Fail(scope, 'User Job Failed', {
      cause: 'AWS Job Failed',
      error: 'Failed to process',
    });

    /// Create tables

    this.historyTable = new dynamodb.Table(this, _HISTORY_ENTRIES_TABLE(), {
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.futureTable = new dynamodb.Table(this, _FUTURE_ENTRIES_TABLE(), {
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userTable = new dynamodb.Table(this, _USER_TABLE(), {
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /// Create lambdas
    // History
    const createHistoryFunction = new NodejsFunction (this, 'createHistory', {
      entry: join(
        __dirname,
        "..",
        "services",
        "create.ts" // File name of lambda
      ),
      handler: 'handler',
      functionName: 'createHistory',
      environment: {
        TABLE_NAME: _HISTORY_ENTRIES_TABLE(),
        PARTITION_KEY: "userId",
      }
    });

    const readFromHistoryFunction = new NodejsFunction (this, 'readFromHistory', {
      entry: join(
        __dirname,
        "..",
        "services",
        "read.ts" // File name of lambda
      ),
      handler: 'handler',
      functionName: 'ReadFromHistory',
      environment: {
        TABLE_NAME: _HISTORY_ENTRIES_TABLE(),
        PARTITION_KEY: "userId",
      }
    });

    const deleteFromHistoryFunction = new NodejsFunction (this, 'deleteFromHistory', {
      entry: join(
        __dirname,
        "..",
        "services",
        "delete.ts" // File name of lambda
      ),
        handler: 'handler',
        functionName: 'DeleteFromHistory',
        environment: {
          TABLE_NAME: _HISTORY_ENTRIES_TABLE(),
          PARTITION_KEY: "userId",
        }
    });

    this.historyTable.grantWriteData(createHistoryFunction);
    this.historyTable.grantReadData(readFromHistoryFunction);
    this.historyTable.grantWriteData(deleteFromHistoryFunction);

    // Future
    const createFutureFunction = new NodejsFunction (this, 'createFuture', {
      entry: join(
        __dirname,
        "..",
        "services",
        "create.ts" // File name of lambda
      ),
      handler: 'handler',
      functionName: 'createFuture',
      environment: {
        TABLE_NAME: _FUTURE_ENTRIES_TABLE(),
        PARTITION_KEY: "userId",
      }
    });


    const readFromFutureFunction = new NodejsFunction (this, 'readFromFuture', {
      entry: join(
        __dirname,
        "..",
        "services",
        "read.ts" // File name of lambda
      ),
        handler: 'handler',
        functionName: 'ReadFromFutureFunction',
        environment: {
          TABLE_NAME: _FUTURE_ENTRIES_TABLE(),
          PARTITION_KEY: "userId",
        }
    });

    const deleteFromFutureFunction = new NodejsFunction (this, 'deleteFromFuture', {
      entry: join(
        __dirname,
        "..",
        "services",
        "delete.ts" // File name of lambda
      ),
        handler: 'handler',
        functionName: 'DeleteFromFutureFunction',
        environment: {
          TABLE_NAME: _FUTURE_ENTRIES_TABLE(),
          PARTITION_KEY: "userId",
        }
    });

    this.futureTable.grantWriteData(createFutureFunction);
    this.futureTable.grantReadData(readFromFutureFunction);
    this.futureTable.grantWriteData(deleteFromFutureFunction);

    // User
    const createUserFunction = new NodejsFunction (this, 'createUser', {
      entry: join(
        __dirname,
        "..",
        "services",
        "create.ts" // File name of lambda
      ),
      handler: 'handler',
      functionName: 'createUser',
      environment: {
        TABLE_NAME: _USER_TABLE(),
        PARTITION_KEY: "userId",
      }
    });

    const deleteFromUserFunction = new NodejsFunction (this, 'deleteFromUser', {
      entry: join(
        __dirname,
        "..",
        "services",
        "delete.ts" // File name of lambda
      ),
        handler: 'handler',
        functionName: 'DeleteFromUserFunction',
        environment: {
          TABLE_NAME: _USER_TABLE(),
          PARTITION_KEY: "userId",
        }
    });

    this.userTable.grantWriteData(createUserFunction);
    this.userTable.grantWriteData(deleteFromUserFunction);

    /// History map

    const deleteHistoryMap = new Map(this, 'Deleting History Entries', {
      itemsPath:'$.entries',
    });

    const deleteHistory = new LambdaInvoke(this, 'Delete History Entry', {
      lambdaFunction: deleteFromHistoryFunction,
      payload: TaskInput.fromObject({
        'queryStringParameters': {
          'userId': JsonPath.stringAt('$.userId'),
          'sk': JsonPath.stringAt('$.sk')
        }
      })
    });

    const readHistory = new LambdaInvoke(this, 'Get History', {
      lambdaFunction: readFromHistoryFunction,
      inputPath: "$.body",
      outputPath: '$.Payload',
    }).next(new Choice(scope, "Read History Success?")
    .when(Condition.stringEquals('$.status', 'failure'), historyFailed)
    .when(Condition.stringEquals('$.status','success'), deleteHistoryMap));

    deleteHistoryMap.iterator(deleteHistory);

    /// Future map

    const deleteFutureMap = new Map(this, 'Deleting Future Entries', {
      itemsPath:'$.entries',
    });

    const deleteFuture = new LambdaInvoke(this, 'Delete Future Entry', {
      lambdaFunction: deleteFromFutureFunction,
      payload: TaskInput.fromObject({
        'queryStringParameters': {
          'userId': JsonPath.stringAt('$.userId'),
          'sk': JsonPath.stringAt('$.sk')
        }
      })
    });

    const readFuture = new LambdaInvoke(this, 'Get Future', {
      lambdaFunction: readFromFutureFunction,
      inputPath: "$.body",
      outputPath: '$.Payload',
    }).next(new Choice(scope, "Read Future Success?")
    .when(Condition.stringEquals('$.status', 'failure'), futureFailed)
    .when(Condition.stringEquals('$.status','success'), deleteFutureMap));

    deleteFutureMap.iterator(deleteFuture);

    /// User map

    const deleteUser = new LambdaInvoke(this, 'Delete User Entry', {
      lambdaFunction: deleteFromUserFunction,
      inputPath: "$.body"
    });

    parallel.branch(readHistory);
    parallel.branch(readFuture);

    // How to recover from errors
    const sendFailureNotification = new Pass(this, 'Resetting user failed');
    parallel.addCatch(sendFailureNotification);

    // What to do in case everything succeeded
    const closeOrder = new Succeed(this, 'User was reset');

    parallel.next(deleteUser)
    .next(new Choice(scope, "User Deleted?")
        .when(Condition.numberEquals('$.Payload.statusCode', 200), closeOrder)
        .otherwise(userFailed));

    let stateMachine = new StateMachine(this, "resetuser", {
      definition: parallel,
      logs: { 
        destination: new LogGroup(this, "StepLogGroup", {
          retention: RetentionDays.ONE_DAY,
        }),
        includeExecutionData: true,
        level: LogLevel.ALL
     },
      stateMachineType: StateMachineType.EXPRESS,
    });
  }
}
