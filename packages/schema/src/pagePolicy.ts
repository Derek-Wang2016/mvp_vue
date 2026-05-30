/** 系统预置页 id 上限（含） */
export const SYSTEM_PAGE_ID_MAX = 99

/** 用户页 id 下限（strict 发布态新建页从此起） */
export const MIN_USER_PAGE_ID = 100

/** id 在 (0, 100) 视为系统预置页 */
export function isSystemPageId(id: number): boolean {
  return id > 0 && id < MIN_USER_PAGE_ID
}
