import { useState } from 'react'
import { Alert, Box, Stack, Typography } from '@/compat/mui/material'
import { ProfileEditDialog } from '@/components/profile/profile-edit-dialog'
import { ProfileHeroCard } from '@/components/profile/profile-hero-card'
import { ProfilePersonalPerformance } from '@/components/profile/profile-personal-performance'
import { ProfileRankingSnippet } from '@/components/profile/profile-ranking-snippet'
import { ProfileTeamGamificationSummary } from '@/components/profile/profile-team-gamification-summary'
import { useAuth } from '@/contexts/AuthContext'
import { useIndicators } from '@/hooks/use-indicators'
import { useUserProgress } from '@/hooks/use-user-progress'
import { useWorkspaceContext } from '@/hooks/use-workspace-context'
import { useWorkspaceProfile } from '@/hooks/use-workspace-profile'
import { useWorkspaceRanking } from '@/hooks/use-workspace-ranking'
import { buildWorkspacePath } from '@/lib/workspace-routing'
import { useNavigate } from 'react-router-dom'

export default function Perfil() {
  const navigate = useNavigate()
  const { currentUser, currentWorkspace } = useAuth()
  const workspaceSlug = currentWorkspace?.slug ?? null
  const { workspace, membership, gamificationEnabled, isManagerial } = useWorkspaceContext(workspaceSlug)
  const {
    profile,
    loading: profileLoading,
    saving: profileSaving,
    error: profileError,
    update,
    uploadAvatarImage,
    teamGamificationSummary,
  } = useWorkspaceProfile(workspaceSlug)

  const canUseGamification = gamificationEnabled
  const showMemberRanking = canUseGamification && !isManagerial
  const showManagerTeam = canUseGamification && isManagerial

  const { data: progress, loading: progressLoading } = useUserProgress(
    currentUser?.id ?? null,
    canUseGamification,
  )

  const {
    data: indicatorsData,
    loading: indicatorsLoading,
    error: indicatorsErr,
  } = useIndicators(currentUser?.id ?? null, 'me', Boolean(currentUser?.id))

  const {
    available: rankingAvailable,
    reason: rankingReason,
    ranking,
    loading: rankingLoading,
  } = useWorkspaceRanking(workspaceSlug)

  const [editOpen, setEditOpen] = useState(false)

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Carregando perfil...</Typography>
      </Box>
    )
  }

  const heroAvatar = profile?.avatar_url ?? currentUser.avatar_url
  const heroName = profile?.display_name ?? currentUser.name
  const workspaceName = workspace?.name ?? currentWorkspace?.name ?? 'Workspace'

  const goRanking = () => {
    navigate(buildWorkspacePath(currentWorkspace?.slug, '/ranking'))
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
      <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
        <Stack spacing={0.75} sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800}>
            Perfil
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seu perfil muda por workspace. Use o ícone de edição para ajustar nome e foto exibidos neste contexto.
          </Typography>
        </Stack>

        {profileError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {profileError}
          </Alert>
        ) : null}

        <ProfileHeroCard
          heroName={heroName}
          heroAvatar={heroAvatar}
          heatUserId={currentUser.id}
          email={currentUser.email}
          workspaceName={workspaceName}
          membership={membership}
          isManagerial={isManagerial}
          onEditClick={() => setEditOpen(true)}
        />

        <ProfileEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          currentUser={currentUser}
          profileLoading={profileLoading}
          profileSaving={profileSaving}
          uploadAvatarImage={uploadAvatarImage}
          update={update}
        />

        {showManagerTeam ? (
          <ProfileTeamGamificationSummary
            profileLoading={profileLoading}
            teamGamificationSummary={teamGamificationSummary}
          />
        ) : null}

        {showMemberRanking ? (
          <ProfileRankingSnippet
            loading={rankingLoading}
            available={rankingAvailable}
            reason={rankingReason}
            ranking={ranking}
            onGoRanking={goRanking}
          />
        ) : null}

        <ProfilePersonalPerformance
          indicatorsLoading={indicatorsLoading}
          indicatorsError={indicatorsErr}
          personal={indicatorsData?.personal ?? null}
          progress={progress}
          progressLoading={progressLoading}
        />
      </Box>
    </Box>
  )
}
