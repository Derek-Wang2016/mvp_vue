import type { FastifyReply } from 'fastify'
import type { PageDraft, PagePublished } from '@prisma/client'
import { PageScopeError } from './pageScopePolicy.js'

export function sendScopeError(reply: FastifyReply, err: unknown): boolean {
  if (err instanceof PageScopeError) {
    reply.status(err.statusCode).send({ error: err.message })
    return true
  }
  return false
}

export function formatDraftDetail(row: PageDraft) {
  return {
    ...row,
    schemaJson: JSON.parse(row.schemaJson),
  }
}

export function formatPublishDetail(row: PagePublished) {
  return {
    ...row,
    schemaJson: JSON.parse(row.schemaJson),
  }
}

export function deepCloneSchemaJson(schemaJson: string): string {
  return JSON.stringify(JSON.parse(schemaJson))
}
