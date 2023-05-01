export interface EntriesResult {
    statusCode: number,
    body: {
      status: string, 
      message: string,
      entries?: object
    }
}