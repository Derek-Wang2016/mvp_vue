type EmbeddedWindow = Window & { __MVP_EMBEDDED__?: boolean }

interface NavigatorUaBrand {
  brand: string
  version: string
}

interface NavigatorUaData {
  brands?: NavigatorUaBrand[]
  getHighEntropyValues?: (hints: string[]) => Promise<{ fullVersionList?: NavigatorUaBrand[] }>
}

function getNavigatorUaData(): NavigatorUaData | undefined {
  return (navigator as Navigator & { userAgentData?: NavigatorUaData }).userAgentData
}

function parseFullscreenBtnParam(): boolean | null {
  const param = new URLSearchParams(window.location.search).get('fullscreenBtn')
  if (param === '0' || param === 'false') return false
  if (param === '1' || param === 'true') return true
  return null
}

function parseEmbedParam(): boolean {
  const embed = new URLSearchParams(window.location.search).get('embed')
  return embed === '1' || embed === 'true'
}

function hasNativeEmbeddedFlag(): boolean {
  const w = window as EmbeddedWindow
  return w.__MVP_EMBEDDED__ === true
}

function uaLooksLikeHybridShell(ua: string): boolean {
  return /webview|WebView|uni-app|Html5Plus|Crosswalk|MicroMessenger|WeChat|AlipayClient|DingTalk/i.test(ua)
}

function uaLooksLikeAndroidSystemWebView(ua: string): boolean {
  if (!/Android/i.test(ua)) return false
  // Android 5+ System WebView 标准标记
  if (/;\s*wv\)/i.test(ua)) return true
  // userAgentData.brands 同步可读（Chromium 90+）
  const brands = getNavigatorUaData()?.brands
  if (brands?.some((b: NavigatorUaBrand) => /webview/i.test(b.brand))) return true
  return false
}

function androidLikelyEmbeddedWithoutFullscreenApi(ua: string): boolean {
  if (!/Android/i.test(ua)) return false
  if (typeof document === 'undefined') return false
  // 独立 Chrome / Firefox / Samsung 等通常支持全屏 API；WebView 多为 false
  if (document.fullscreenEnabled === false) return true
  return false
}

/**
 * 判断是否为嵌入式 WebView（非独立浏览器）。
 *
 * 覆盖方式（优先级从高到低）：
 * - `window.__MVP_EMBEDDED__ = true`（原生 WebView 注入）
 * - `?fullscreenBtn=0|1` 或 `?embed=1`
 * - UA / fullscreen API 启发式
 */
export function isEmbeddedWebView(): boolean {
  const btnParam = parseFullscreenBtnParam()
  if (btnParam === false) return true
  if (btnParam === true) return false
  if (parseEmbedParam()) return true
  if (hasNativeEmbeddedFlag()) return true

  const ua = navigator.userAgent
  if (uaLooksLikeHybridShell(ua)) return true
  if (uaLooksLikeAndroidSystemWebView(ua)) return true
  if (androidLikelyEmbeddedWithoutFullscreenApi(ua)) return true

  return false
}

/** userAgentData 高熵 brands（部分 WebView 仅此处含 Android WebView） */
export async function refineEmbeddedWebView(): Promise<boolean> {
  if (parseFullscreenBtnParam() !== null || parseEmbedParam() || hasNativeEmbeddedFlag()) {
    return isEmbeddedWebView()
  }
  const uad = getNavigatorUaData()
  if (!uad?.getHighEntropyValues) return isEmbeddedWebView()
  try {
    const { fullVersionList } = await uad.getHighEntropyValues(['fullVersionList'])
    if (fullVersionList?.some((b: NavigatorUaBrand) => /webview/i.test(b.brand))) return true
  } catch {
    // ignore
  }
  return isEmbeddedWebView()
}

export function shouldShowFullscreenButton(): boolean {
  return !isEmbeddedWebView()
}
