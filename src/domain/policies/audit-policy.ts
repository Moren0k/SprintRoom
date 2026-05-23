/**
 * Reglas globales de auditoria de comentarios definidas en T004.
 */
export const AuditPolicy = {
  commentsAreImmutable: true,
  commentsCanBeDeletedByEndUsers: false,
  commentsRetentionIsIndefinite: true,
} as const;
