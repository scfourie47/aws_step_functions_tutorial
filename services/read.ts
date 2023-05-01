import { DynamoDB } from "aws-sdk";
import {
  APIGatewayProxyEvent,
  Context,
} from "aws-lambda";
import { EntriesResult } from "./shared/ILambdaResults";

const TABLE_NAME = process.env.TABLE_NAME || "";
const PARTITION_KEY = process.env.PARTITION_KEY || "";
const dbClient = new DynamoDB.DocumentClient();

async function handler(
  event: APIGatewayProxyEvent,
  context: Context
) {

  console.log(`Event: ${JSON.stringify(event)}`)
  console.log(`QueryStringParameters: ${JSON.stringify(event.queryStringParameters)}`)

  const result: EntriesResult = {
    statusCode: 200,
    body: {
      status: 'success',
      message: `Successfully retrieved the ${TABLE_NAME} entries`,
    }
  };

  try {
    // Query via Partition key
    const params = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": PARTITION_KEY,
        },
        ExpressionAttributeValues: {
          ":pk": event.queryStringParameters![PARTITION_KEY],
        },
      };
    
      const queryResponse = await dbClient.query(params).promise();
      return queryResponse.Items;
  } catch (error) {
    if (error instanceof Error) {
      result.body.status = 'failure'
      result.body.message = error.message;
    }
  }

  console.log(
    `Result => Status Code: ${result.statusCode} Message: ${JSON.stringify(result.body)}`
  );

  // If query comes from reset user state machine
  if(event.resource == null){
    return {"status": result.body.status, "entries": result.body.entries};
  }

  // return result;
  let finalReturn = {
    statusCode: result.statusCode,
    body: JSON.stringify(result.body),
  };
  console.log("finalReturn:");
  console.log(finalReturn);
  
  return finalReturn;
}

export { handler };
