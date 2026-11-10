export function getApiBase(): string {
  const env = import.meta.env.VITE_API_BASE as string | undefined
  if (env) return env.replace(/\/$/, '')
  return `http://${window.location.hostname}:3002`
}
