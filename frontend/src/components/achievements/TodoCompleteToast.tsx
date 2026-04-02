import { useEffect, useState, useRef, useCallback } from 'react'
import { Box, Typography } from '@/compat/mui/material'
import { Trophy } from 'lucide-react'

function playAchievementSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.28 },
      { freq: 659.25, start: 0.08, dur: 0.28 },
      { freq: 783.99, start: 0.16, dur: 0.28 },
      { freq: 1046.5, start: 0.24, dur: 0.42 },
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq

      const t0 = ctx.currentTime + start
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)

      osc.start(t0)
      osc.stop(t0 + dur + 0.05)
    })
  } catch {
    return
  }
}

export interface TodoCompleteDetail {
  title: string
  xp: number
}

export function fireTodoCompleteToast(detail: TodoCompleteDetail) {
  window.dispatchEvent(new CustomEvent<TodoCompleteDetail>('cdt-todo-completed', { detail }))
}

const DISPLAY_MS = 4200
const PROGRESS_INTERVAL = 30

interface ToastState {
  id: number
  title: string
  xp: number
  progress: number
}

export function TodoCompleteToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterRef = useRef(0)

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (dismissRef.current) clearTimeout(dismissRef.current)
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setToast((prev) => (prev ? { ...prev, progress: 0 } : null))
    setTimeout(() => setToast(null), 260)
  }, [clearTimers])

  useEffect(() => {
    const handler = (e: Event) => {
      const { title, xp } = (e as CustomEvent<TodoCompleteDetail>).detail

      clearTimers()
      playAchievementSound()

      const id = ++counterRef.current
      setToast({ id, title, xp, progress: 100 })

      const steps = DISPLAY_MS / PROGRESS_INTERVAL
      const decrement = 100 / steps

      timerRef.current = setInterval(() => {
        setToast((prev) => {
          if (!prev || prev.id !== id) return prev
          const next = prev.progress - decrement
          if (next <= 0) return { ...prev, progress: 0 }
          return { ...prev, progress: next }
        })
      }, PROGRESS_INTERVAL)

      dismissRef.current = setTimeout(() => dismiss(), DISPLAY_MS)
    }

    window.addEventListener('cdt-todo-completed', handler)
    return () => {
      window.removeEventListener('cdt-todo-completed', handler)
      clearTimers()
    }
  }, [clearTimers, dismiss])

  if (!toast) return null

  const visible = toast.progress > 0

  return (
    <Box
      onClick={dismiss}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 320,
        cursor: 'pointer',
        transform: visible ? 'translateX(0)' : 'translateX(340px)',
        transition: 'transform 0.24s ease',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 4,
            flexShrink: 0,
            background: 'linear-gradient(180deg, #3e63b8 0%, #7f6db4 100%)',
          }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1.5,
            py: 1.5,
            flexShrink: 0,
            color: 'primary.main',
          }}
        >
          <Trophy size={18} />
        </Box>

        <Box sx={{ flex: 1, py: 1.25, pr: 1.5, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: 'text.secondary',
              lineHeight: 1,
              mb: 0.4,
            }}
          >
            To-do concluido
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {toast.title}
          </Typography>
          {toast.xp > 0 ? (
            <Typography
              sx={{
                fontSize: 11,
                color: 'primary.main',
                fontWeight: 700,
                mt: 0.3,
              }}
            >
              +{toast.xp.toFixed(2)} XP
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box
        sx={{
          height: 3,
          bgcolor: 'action.hover',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${toast.progress}%`,
            background: 'linear-gradient(90deg, #3e63b8, #7f6db4)',
            transition: `width ${PROGRESS_INTERVAL}ms linear`,
          }}
        />
      </Box>
    </Box>
  )
}
