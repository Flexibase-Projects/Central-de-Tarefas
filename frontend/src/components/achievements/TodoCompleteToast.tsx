import { useEffect, useState, useRef, useCallback } from 'react'
import { Box, Typography } from '@mui/material'

// ---------------------------------------------------------------------------
// Som de conquista gerado via Web Audio API
// ---------------------------------------------------------------------------
function playAchievementSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    // Acorde ascendente tipo jingle de conquista: C5 → E5 → G5 → C6
    const notes = [
      { freq: 523.25, start: 0.0,  dur: 0.35 },
      { freq: 659.25, start: 0.1,  dur: 0.35 },
      { freq: 783.99, start: 0.2,  dur: 0.35 },
      { freq: 1046.5, start: 0.3,  dur: 0.55 },
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      // Leve reverb com delay
      const delay = ctx.createDelay(0.3)
      delay.delayTime.value = 0.15
      const delayGain = ctx.createGain()
      delayGain.gain.value = 0.18

      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.connect(delay)
      delay.connect(delayGain)
      delayGain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = freq

      const t0 = ctx.currentTime + start
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)

      osc.start(t0)
      osc.stop(t0 + dur + 0.05)
    })
  } catch {
    // Audio não disponível — ignora silenciosamente
  }
}

// ---------------------------------------------------------------------------
// Tipos de evento
// ---------------------------------------------------------------------------
export interface TodoCompleteDetail {
  title: string
  xp: number
}

// Helper chamado pelo todo-list
export function fireTodoCompleteToast(detail: TodoCompleteDetail) {
  window.dispatchEvent(new CustomEvent<TodoCompleteDetail>('cdt-todo-completed', { detail }))
}

// ---------------------------------------------------------------------------
// Componente de toast
// ---------------------------------------------------------------------------
const DISPLAY_MS   = 4200
const PROGRESS_INTERVAL = 30

interface ToastState {
  id: number
  title: string
  xp: number
  progress: number // 100 → 0
}

export function TodoCompleteToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterRef  = useRef(0)

  const clearTimers = useCallback(() => {
    if (timerRef.current)   clearInterval(timerRef.current)
    if (dismissRef.current) clearTimeout(dismissRef.current)
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setToast((prev) => prev ? { ...prev, progress: 0 } : null)
    setTimeout(() => setToast(null), 350) // aguarda animação de saída
  }, [clearTimers])

  useEffect(() => {
    const handler = (e: Event) => {
      const { title, xp } = (e as CustomEvent<TodoCompleteDetail>).detail

      clearTimers()
      playAchievementSound()

      const id = ++counterRef.current
      setToast({ id, title, xp, progress: 100 })

      const steps    = DISPLAY_MS / PROGRESS_INTERVAL
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
        bottom: 28,
        right: 28,
        zIndex: 9999,
        width: 340,
        cursor: 'pointer',
        transform: visible ? 'translateX(0)' : 'translateX(380px)',
        transition: 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
        userSelect: 'none',
      }}
    >
      {/* Painel principal estilo Xbox One */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: '4px',
          overflow: 'hidden',
          bgcolor: 'rgba(15, 15, 18, 0.97)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Faixa esquerda dourada */}
        <Box
          sx={{
            width: 5,
            flexShrink: 0,
            background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
          }}
        />

        {/* Ícone troféu */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1.5,
            py: 1.5,
            fontSize: 28,
            flexShrink: 0,
          }}
        >
          🏆
        </Box>

        {/* Texto */}
        <Box sx={{ flex: 1, py: 1.25, pr: 1.5, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: '#FFD700',
              lineHeight: 1,
              mb: 0.4,
            }}
          >
            TO-DO CONCLUÍDO
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {toast.title}
          </Typography>
          {toast.xp > 0 && (
            <Typography
              sx={{
                fontSize: 11,
                color: 'rgba(167,139,250,0.9)',
                fontWeight: 700,
                mt: 0.3,
              }}
            >
              +{toast.xp.toFixed(2)} XP
            </Typography>
          )}
        </Box>
      </Box>

      {/* Barra de progresso esgotando (Xbox-style) */}
      <Box
        sx={{
          height: 3,
          bgcolor: 'rgba(255,255,255,0.1)',
          borderRadius: '0 0 4px 4px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${toast.progress}%`,
            background: 'linear-gradient(90deg, #FFD700, #FFA500)',
            transition: `width ${PROGRESS_INTERVAL}ms linear`,
          }}
        />
      </Box>
    </Box>
  )
}
