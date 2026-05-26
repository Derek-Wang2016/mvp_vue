import { type InjectionKey } from 'vue'

export interface PageNavContextValue {
  navigateToPage: (pageId: number) => void
}

export const PAGE_NAV_KEY: InjectionKey<PageNavContextValue> = Symbol('pageNav')
