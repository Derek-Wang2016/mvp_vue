export type PageScope = 'draft' | 'publish'

export function isStrictPagePolicy(): boolean {
  return import.meta.env.VITE_PAGE_POLICY === 'strict'
}

/** 发布态下调试表只读；发布表可编辑 */
export function isPageScopeReadOnly(scope: PageScope): boolean {
  return isStrictPagePolicy() && scope === 'draft'
}

export function isCurrentPageReadOnly(scope: PageScope): boolean {
  return isPageScopeReadOnly(scope)
}

/** 调试环境下编辑器默认操作调试表；发布态默认发布表 */
export function defaultEditorPageScope(): PageScope {
  return isStrictPagePolicy() ? 'publish' : 'draft'
}

export function parsePageScope(raw: string | null): PageScope {
  return raw === 'publish' ? 'publish' : 'draft'
}
