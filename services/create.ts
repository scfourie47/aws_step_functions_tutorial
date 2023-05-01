import { DynamoDB } from "aws-sdk";
import {
  APIGatewayProxyEvent,
  Context
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

  if (!event.body) {
    console.log(`Invalid request, you are missing the parameter body`)
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'failure',
        message: "invalid request, you are missing the parameter body"
      }),
    };
  }

  let result: EntriesResult = {
    statusCode: 200,
    body: {
      status: 'success',
      message: `Successfully created ${TABLE_NAME} entry`
    }
  };

  const item = typeof event.body == "object" ? event.body : JSON.parse(event.body);
  item[PARTITION_KEY] = item['userId'];

  if(TABLE_NAME != "tutorial-user-table") {
    item["createdAt"] = Date.now();
    item["sk"] = `${TABLE_NAME}-entry`;

    item["sk"] += `-${item["createdAt"]}`;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };

  try {
    const createResult = await dbClient.put(params).promise();
    console.log(`Result: ${JSON.stringify(createResult)}`);
    result.body.entries = item;
    console.log(
      `SUCCESS => Status Code: ${result.statusCode} Message: ${result.body.message} Entry: ${JSON.stringify(result.body.entries)}`
    );
  } catch (error) {
    result.statusCode = 500;

    if (error instanceof Error) {
      result.body.message = error.message;
    }
    console.log(
      `ERROR => Status Code: ${result.statusCode} Message: ${result.body.message}`
    );
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
