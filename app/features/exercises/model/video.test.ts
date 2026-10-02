import { describe, expect, it } from 'vitest'
import { exerciseVideo } from './video'

describe('exercise video URLs', () => {
  it.each([
    'https://www.youtube.com/watch?v=3K259_IsCgg&autoplay=1',
    'https://youtu.be/3K259_IsCgg?t=20',
    'https://m.youtube.com/shorts/3K259_IsCgg',
    'https://www.youtube-nocookie.com/embed/3K259_IsCgg',
  ])('embeds only the video ID from %s without autoplay', (url) => {
    expect(exerciseVideo(url)).toMatchObject({ kind: 'youtube', src: 'https://www.youtube-nocookie.com/embed/3K259_IsCgg?playsinline=1', href: url })
  })

  it.each([null, '', 'javascript:alert(1)', 'data:text/html,test', '/relative', 'https://user:password@example.com/video.mp4'])('rejects unsafe or absent URL %s', (url) => {
    expect(exerciseVideo(url)).toBeNull()
  })

  it('does not embed a lookalike host or arbitrary website', () => {
    expect(exerciseVideo('https://youtube.com.evil.test/watch?v=3K259_IsCgg')?.kind).toBe('link')
    expect(exerciseVideo('https://example.com/video')?.kind).toBe('link')
    expect(exerciseVideo('https://youtube.com/watch?v=invalid')?.kind).toBe('link')
  })

  it('recognizes direct video files with query strings', () => {
    expect(exerciseVideo('https://example.com/demo.MP4?token=abc')).toEqual({ kind: 'file', href: 'https://example.com/demo.MP4?token=abc', src: 'https://example.com/demo.MP4?token=abc' })
  })
})
