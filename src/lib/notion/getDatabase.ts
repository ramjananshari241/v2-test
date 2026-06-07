import { ContentType } from '@/src/types/blog'
import { isFullDatabase, isFullPage } from '@notionhq/client'
import {
  DatabaseObjectResponse,
  GetDatabaseResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  QueryDatabaseResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'
import { ApiScope } from './../../types/notion'
import { filterSwitch } from './filter'
import { databaseId, notion } from './notion'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isTransient = (e: unknown) => {
  const msg = String((e as Error)?.message || '')
  const code = String((e as { code?: string })?.code || '')
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|socket hang up|network|fetch failed|aborted/i.test(msg)
    || /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|ENOTFOUND/i.test(code)
}

async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < retries; i++) {
    try { return await fn() }
    catch (e) {
      lastErr = e
      if (!isTransient(e) || i === retries - 1) throw e
      await sleep(500 * Math.pow(2, i))
    }
  }
  throw lastErr
}

// TODO: Refactor this to use the Utility functions `iteratePaginatedAPI` & `collectPaginatedAPI`  in @notionhq/client

export const getDatabase = async (
  scope?: ApiScope,
  cursor?: string,
  id?: string
): Promise<QueryDatabaseResponse> => {
  const filter = scope ? filterSwitch(scope) : undefined

  const response = await withRetry(() => notion.databases.query({
    database_id: id ?? databaseId,
    filter: filter,
    sorts: id
      ? [
          {
            timestamp: 'created_time',
            direction: 'ascending',
          },
        ]
      : [{ property: 'date', direction: 'descending' }],
    start_cursor: cursor,
  }))

  return response
}

export const getAll = async (
  scope?: ApiScope,
  id?: string
): Promise<Array<PageObjectResponse>> => {
  const response = await getDatabase(scope, undefined, id)
  const objects: PageObjectResponse[] = []
  addObjects(response.results, objects)
  let cursor = response.next_cursor
  if (cursor) {
    do {
      const additional: QueryDatabaseResponse = await getDatabase(
        scope,
        cursor,
        id
      )
      addObjects(additional.results, objects)
      cursor = additional.next_cursor
    } while (cursor)
  }

  return objects
}

export const getDatabaseMetadata = async (): Promise<GetDatabaseResponse> => {
  const response = await withRetry(() => notion.databases.retrieve({ database_id: databaseId }))
  return response
}

export const getDatabaseTitle = async (): Promise<
  Array<RichTextItemResponse>
> => {
  const response = await getDatabaseMetadata()
  if (!isFullDatabase(response)) {
    throw new Error('Database response is not full')
  }
  return response.title
}

export const getDatabaseIcon = async (): Promise<
  DatabaseObjectResponse['icon']
> => {
  const response = await getDatabaseMetadata()
  if (!isFullDatabase(response)) {
    throw new Error('Database response is not full')
  }
  return response.icon
}

export const getDatabaseProperties = async (): Promise<
  PartialDatabaseObjectResponse['properties']
> => {
  const response = await getDatabaseMetadata()
  return response.properties
}

function addObjects(
  results: QueryDatabaseResponse['results'],
  objects: PageObjectResponse[],
  filter?: ContentType
) {
  results.forEach((object) => {
    if (isFullPage(object)) {
      if (
        !filter ||
        (object.properties.type.type === 'select' &&
          object.properties.type.select?.name === filter)
      ) {
        objects.push(object)
      }
    }
  })
}
