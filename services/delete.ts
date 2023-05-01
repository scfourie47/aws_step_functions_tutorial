import { DynamoDB } from "aws-sdk";
import { EntriesResult } from './shared/ILambdaResults';
import {
  APIGatewayProxyEvent,
  Context,
} from "aws-lambda";

const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const dbClient = new DynamoDB.DocumentClient();

async function handler(
  event: APIGatewayProxyEvent,
  context: Context
) {

  console.log(`Event: ${JSON.stringify(event)}`)
  console.log(`QueryStringParameters: ${JSON.stringify(event.queryStringParameters)}`)

  const userId = event.queryStringParameters?.[PARTITION_KEY];
  const sk = event.queryStringParameters?.["sk"];
  
  if (userId == null || sk == null) {
    console.log(`Invalid request, you are missing the path id`)
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'failure',
        message: "invalid request, you are missing the path id"
      })
    };
  }

  const result: EntriesResult = {
    statusCode: 200,
    body: {
      status: 'success',
      message: `Successfully deleted ${TABLE_NAME} entry`,
    }
  };

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PARTITION_KEY]: userId,
      ["sk"]: sk,
    },
  };
  console.log(params);

  try {
    await dbClient.delete(params).promise();
  } catch (error) {
    if (error instanceof Error) {
      result.statusCode = 500;
      result.body.status = 'failure'
      result.body.message = error.message;
    }
    console.log(
      `ERROR => Status Code: ${result.statusCode} Message: ${result.body}`
    );
  }

    // return result;
    let finalResult = {
      statusCode: result.statusCode,
      body: JSON.stringify(result.body),
    };
    console.log("finalReturn:");
    console.log(finalResult);

    return finalResult;
}

export { handler };
