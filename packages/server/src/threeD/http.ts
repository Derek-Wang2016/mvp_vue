import type { FastifyReply } from 'fastify'

export class CorruptConfigError extends Error {
  constructor() {
    super('模型配置已损坏')
    this.name = 'CorruptConfigError'
  }
}

export function sendError(
  reply: FastifyReply,
  status: number,
  error: string,
  field?: string,
) {
  reply.status(status).send(field ? { error, field } : { error })
}

export function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null
}

export function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  )
}
