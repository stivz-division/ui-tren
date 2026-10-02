type ExerciseVideo = { kind: 'youtube' | 'file' | 'link', href: string, src: string }

export function exerciseVideo(value: string | null): ExerciseVideo | null {
  if (!value) return null
  let url: URL
  try { url = new URL(value) }
  catch { return null }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null

  const host = url.hostname.toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.slice(1)
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null
  }
  if (id && /^[\w-]{11}$/.test(id)) {
    return { kind: 'youtube', href: url.href, src: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1` }
  }
  return { kind: /\.(mp4|webm|ogv)$/i.test(url.pathname) ? 'file' : 'link', href: url.href, src: url.href }
}
