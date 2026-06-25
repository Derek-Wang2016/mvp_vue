import type { PageComponent } from '@mvp-vue/schema'
import { clampComponentLayout, type ComponentLayoutRect } from './componentLayout'

export type GroupBounds = ComponentLayoutRect

export function getGroupMembers(components: PageComponent[], groupId: string): PageComponent[] {
  return components.filter((c) => c.groupId === groupId)
}

export function computeGroupBounds(members: PageComponent[]): GroupBounds | null {
  if (members.length === 0) return null
  const xs = members.map((c) => c.x)
  const ys = members.map((c) => c.y)
  const rights = members.map((c) => c.x + c.w)
  const bottoms = members.map((c) => c.y + c.h)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const w = Math.max(...rights) - x
  const h = Math.max(...bottoms) - y
  return { x, y, w, h }
}

/** 选中扩展：任一组成员 → 整组 ids */
export function expandIdsToFullGroups(components: PageComponent[], ids: string[]): string[] {
  const result = new Set<string>()
  const byId = new Map(components.map((c) => [c.id, c]))

  for (const id of ids) {
    const comp = byId.get(id)
    if (!comp) continue
    if (comp.groupId) {
      for (const m of getGroupMembers(components, comp.groupId)) {
        result.add(m.id)
      }
    } else {
      result.add(id)
    }
  }

  return [...result]
}

/** 组合前收集选中项涉及的所有 groupId */
export function collectGroupIdsFromSelection(components: PageComponent[], ids: string[]): Set<string> {
  const groupIds = new Set<string>()
  const byId = new Map(components.map((c) => [c.id, c]))
  for (const id of ids) {
    const comp = byId.get(id)
    if (comp?.groupId) groupIds.add(comp.groupId)
  }
  return groupIds
}

/** 收集选中项及关联组的全部成员 id（扁平合并用） */
export function collectMembersForGrouping(components: PageComponent[], ids: string[]): string[] {
  const expanded = expandIdsToFullGroups(components, ids)
  return expanded
}

/** 判断是否「完整选中一个组」且仅一个组 */
export function isFullGroupSelection(components: PageComponent[], selectedIds: string[]): {
  isFullGroup: boolean
  groupId: string | null
  memberIds: string[]
} {
  if (selectedIds.length === 0) {
    return { isFullGroup: false, groupId: null, memberIds: [] }
  }

  const expanded = expandIdsToFullGroups(components, selectedIds)
  const selectedSet = new Set(selectedIds)
  const expandedSet = new Set(expanded)

  if (expandedSet.size !== selectedSet.size || expanded.length !== selectedIds.length) {
    return { isFullGroup: false, groupId: null, memberIds: expanded }
  }

  const groupIds = new Set<string>()
  for (const id of selectedIds) {
    const comp = components.find((c) => c.id === id)
    if (!comp?.groupId) {
      return { isFullGroup: false, groupId: null, memberIds: expanded }
    }
    groupIds.add(comp.groupId)
  }

  if (groupIds.size !== 1) {
    return { isFullGroup: false, groupId: null, memberIds: expanded }
  }

  const groupId = [...groupIds][0]!
  const members = getGroupMembers(components, groupId)
  if (members.length !== selectedIds.length) {
    return { isFullGroup: false, groupId: null, memberIds: expanded }
  }

  return { isFullGroup: true, groupId, memberIds: members.map((m) => m.id) }
}

/** 等比缩放各成员位置与尺寸 */
export function scaleMembersToBounds(
  members: PageComponent[],
  oldBounds: GroupBounds,
  newBounds: GroupBounds,
): PageComponent[] {
  if (oldBounds.w <= 0 || oldBounds.h <= 0) return members

  return members.map((c) => {
    const relX = (c.x - oldBounds.x) / oldBounds.w
    const relY = (c.y - oldBounds.y) / oldBounds.h
    const relW = c.w / oldBounds.w
    const relH = c.h / oldBounds.h

    return {
      ...c,
      x: Math.round(newBounds.x + relX * newBounds.w),
      y: Math.round(newBounds.y + relY * newBounds.h),
      w: Math.max(1, Math.round(relW * newBounds.w)),
      h: Math.max(1, Math.round(relH * newBounds.h)),
    }
  })
}

/** 删除后清理只剩 1 个成员的 groupId */
export function cleanupOrphanGroupIds(components: PageComponent[]): PageComponent[] {
  const countByGroup = new Map<string, number>()
  for (const c of components) {
    if (!c.groupId) continue
    countByGroup.set(c.groupId, (countByGroup.get(c.groupId) ?? 0) + 1)
  }

  return components.map((c) => {
    if (!c.groupId) return c
    if ((countByGroup.get(c.groupId) ?? 0) <= 1) {
      const { groupId: _, groupLocked: __, ...rest } = c
      return rest as PageComponent
    }
    return c
  })
}

export function selectionHasGroupId(components: PageComponent[], ids: string[]): boolean {
  const byId = new Map(components.map((c) => [c.id, c]))
  return ids.some((id) => !!byId.get(id)?.groupId)
}

export function isGroupLockedById(components: PageComponent[], groupId: string): boolean {
  const members = getGroupMembers(components, groupId)
  return members.length > 0 && members.some((c) => !!c.groupLocked)
}

export function clampGroupBounds(
  bounds: GroupBounds,
  pageWidth: number,
  pageHeight: number,
): GroupBounds {
  return clampComponentLayout(bounds, pageWidth, pageHeight)
}
