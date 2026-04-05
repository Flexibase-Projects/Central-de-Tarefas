import { useEffect, useRef, useState } from 'react'
import { Avatar, Box, Button, Stack, TextField, Typography } from '@/compat/mui/material'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { User, WorkspaceProfileData } from '@/types'
import { compressImageFileToMaxBytes } from './compress-avatar-image'
import { formatProfileInitials } from './profile-utils'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)
}

export interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: WorkspaceProfileData | null
  currentUser: User
  profileLoading: boolean
  profileSaving: boolean
  uploadAvatarImage: (imageDataUrl: string) => Promise<string>
  update: (payload: { display_name: string; avatar_url: string | null }) => Promise<WorkspaceProfileData | undefined>
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
  currentUser,
  profileLoading,
  profileSaving,
  uploadAvatarImage,
  update,
}: ProfileEditDialogProps) {
  const [displayName, setDisplayName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const [removeWorkspaceAvatar, setRemoveWorkspaceAvatar] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [oversizedPendingFile, setOversizedPendingFile] = useState<File | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDisplayName(profile?.display_name ?? currentUser.name ?? '')
    setSelectedFile(null)
    setRemoveWorkspaceAvatar(false)
    setLocalError(null)
    setOversizedPendingFile(null)
    setCompressing(false)
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [open, profile?.display_name, profile?.avatar_url, currentUser.name])

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    }
  }, [previewObjectUrl])

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject(new Error('Falha ao ler arquivo'))
      }
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
      reader.readAsDataURL(file)
    })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null)
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError('Selecione um arquivo de imagem.')
      return
    }
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setRemoveWorkspaceAvatar(false)

    if (file.size > MAX_AVATAR_BYTES) {
      setSelectedFile(null)
      setOversizedPendingFile(file)
      setLocalError(
        `Este arquivo tem ${formatMegabytes(file.size)} MB. O limite de envio é 5 MB. Comprima a imagem ou escolha outro arquivo.`,
      )
      return
    }

    setOversizedPendingFile(null)
    setSelectedFile(file)
  }

  const handleAuthorizeCompress = async () => {
    const source = oversizedPendingFile
    if (!source) return
    const ok = window.confirm(
      'Podemos redimensionar e comprimir esta foto para JPEG até ficar abaixo de 5 MB. A qualidade pode reduzir um pouco. Deseja continuar?',
    )
    if (!ok) return

    setCompressing(true)
    setLocalError(null)
    try {
      const compressed = await compressImageFileToMaxBytes(source, MAX_AVATAR_BYTES)
      if (compressed.size > MAX_AVATAR_BYTES) {
        setLocalError('Ainda acima de 5 MB após comprimir. Tente outra imagem.')
        return
      }
      setPreviewObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(compressed)
      })
      setSelectedFile(compressed)
      setOversizedPendingFile(null)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao comprimir a imagem.')
    } finally {
      setCompressing(false)
    }
  }

  const handleRestore = () => {
    setDisplayName(profile?.display_name ?? currentUser.name ?? '')
    setSelectedFile(null)
    setRemoveWorkspaceAvatar(false)
    setLocalError(null)
    setOversizedPendingFile(null)
    setCompressing(false)
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    const name = displayName.trim()
    if (!name) {
      setLocalError('Informe o nome do perfil.')
      return
    }
    setLocalError(null)
    setSubmitting(true)
    try {
      let avatarUrl: string | null
      if (removeWorkspaceAvatar) {
        avatarUrl = null
      } else if (selectedFile) {
        const dataUrl = await readFileAsDataUrl(selectedFile)
        avatarUrl = await uploadAvatarImage(dataUrl)
      } else {
        avatarUrl = profile?.avatar_url ?? null
      }
      await update({ display_name: name, avatar_url: avatarUrl })
      onOpenChange(false)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = profileSaving || submitting || profileLoading || compressing

  const previewSrc = removeWorkspaceAvatar
    ? currentUser.avatar_url ?? undefined
    : previewObjectUrl
      ? previewObjectUrl
      : profile?.avatar_url ?? currentUser.avatar_url ?? undefined

  const previewName = displayName.trim() || currentUser.name

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar perfil do workspace</DialogTitle>
          <DialogDescription>Este ajuste vale somente para este workspace.</DialogDescription>
        </DialogHeader>

        <Stack spacing={2} sx={{ pt: 1 }}>
          {localError ? (
            <Stack spacing={1}>
              <Typography variant="body2" color="error">
                {localError}
              </Typography>
              {oversizedPendingFile ? (
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  onClick={() => void handleAuthorizeCompress()}
                  disabled={busy}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {compressing ? 'Comprimindo…' : 'Comprimir e usar esta foto'}
                </Button>
              ) : null}
            </Stack>
          ) : null}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={previewSrc} sx={{ width: 64, height: 64, fontWeight: 800 }}>
              {formatProfileInitials(previewName)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleFileChange}
              />
              <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                Escolher imagem
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                PNG, JPEG ou WebP, até 5MB.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="text"
            size="small"
            color="inherit"
            onClick={() => {
              setSelectedFile(null)
              setRemoveWorkspaceAvatar(true)
              setLocalError(null)
              setOversizedPendingFile(null)
              setCompressing(false)
              setPreviewObjectUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                return null
              })
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}
          >
            Remover foto deste workspace
          </Button>

          <TextField
            label="Nome do perfil"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            disabled={busy}
          />
        </Stack>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outlined" onClick={handleRestore} disabled={busy}>
            Restaurar
          </Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={busy || !displayName.trim()}>
            {busy ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
