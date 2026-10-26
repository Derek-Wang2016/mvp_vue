import type { FastifyReply } from 'fastify'

export function sendError(
  reply: FastifyReply,
  status: number,
  error: string,
  field?: string,
) {
  reply.status(status).send(field ? { error, field } : { error })
}

export function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === code
  )
}
