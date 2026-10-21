export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env) return env.replace(/\/$/, '')
  return `http://${window.location.hostname}:3002`
}

type RuntimeConfig = { rendererPort?: string | number }

function getRuntimeConfig(): RuntimeConfig {
  return (window as unknown as { __MVP_RUNTIME__?: RuntimeConfig }).__MVP_RUNTIME__ ?? {}
}

export function getRendererBase(): string {
  const env = import.meta.env.VITE_RENDERER_BASE as string | undefined
  if (env) return env.replace(/\/$/, '')

  const runtimePort = getRuntimeConfig().rendererPort
  if (runtimePort) {
    return `${window.location.protocol}//${window.location.hostname}:${runtimePort}`
  }

  return `http://${window.location.hostname}:5001`
}
