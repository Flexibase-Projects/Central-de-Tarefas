const { chromium } = require('playwright')

async function run() {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: process.env.CDT_AUDIT_BASE_URL || 'http://127.0.0.1:3002',
    api: {},
    pages: {},
    firstWorkspace: null,
    network: {
      responses4xx5xx: [],
      requestFailures: [],
    },
    console: {
      errors: [],
      warnings: [],
      pageErrors: [],
    },
    gate: {
      passed: false,
      failures: [],
      warnings: [],
    },
  }

  let currentStep = 'bootstrap'

  function setStep(step) {
    currentStep = step
  }

  function pushFailure(code, message, details) {
    report.gate.failures.push({ code, message, details: details ?? null })
  }

  function pushWarning(code, message, details) {
    report.gate.warnings.push({ code, message, details: details ?? null })
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', (msg) => {
    const entry = {
      step: currentStep,
      type: msg.type(),
      text: msg.text(),
      url: page.url(),
    }

    if (msg.type() === 'error') {
      report.console.errors.push(entry)
    } else if (msg.type() === 'warning') {
      report.console.warnings.push(entry)
    }
  })

  page.on('pageerror', (error) => {
    report.console.pageErrors.push({
      step: currentStep,
      text: error instanceof Error ? error.message : String(error),
      url: page.url(),
    })
  })

  page.on('requestfailed', (request) => {
    report.network.requestFailures.push({
      step: currentStep,
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? 'unknown',
    })
  })

  page.on('response', async (response) => {
    const status = response.status()
    if (status < 400) return

    let body = null
    try {
      body = await response.text()
    } catch {
      body = null
    }

    report.network.responses4xx5xx.push({
      step: currentStep,
      url: response.url(),
      method: response.request().method(),
      status,
      body: body ? body.slice(0, 800) : null,
    })
  })

  async function fetchJson(path, init) {
    const response = await page.evaluate(
      async ({ nextPath, nextInit }) => {
        const res = await fetch(nextPath, nextInit)
        const text = await res.text()
        let body

        try {
          body = JSON.parse(text)
        } catch {
          body = text
        }

        return {
          status: res.status,
          ok: res.ok,
          body,
        }
      },
      { nextPath: path, nextInit: init ?? undefined },
    )

    return response
  }

  async function gotoAndWait(url, step) {
    setStep(step)
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => null)
    await page.waitForTimeout(250)
  }

  async function firstHeadingText() {
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const count = await headings.count()
    if (count === 0) return null
    const value = await headings.first().textContent()
    return value ? value.trim() : null
  }

  async function bodyText() {
    const value = await page.locator('body').textContent()
    return value ? value.trim() : ''
  }

  async function hasButton(nameRegex) {
    return (await page.getByRole('button', { name: nameRegex }).count()) > 0
  }

  try {
    await gotoAndWait(report.baseUrl, 'bootstrap-open')

    setStep('api-health')
    report.api.health = await fetchJson('/api/health')

    setStep('api-public-workspaces')
    report.api.publicWorkspaces = await fetchJson('/api/auth/public-workspaces')

    setStep('api-sso-config')
    report.api.ssoConfig = await fetchJson('/api/sso/config')

    const workspaces = Array.isArray(report.api.publicWorkspaces.body?.workspaces)
      ? report.api.publicWorkspaces.body.workspaces
      : []
    const groups = Array.isArray(report.api.publicWorkspaces.body?.groups)
      ? report.api.publicWorkspaces.body.groups
      : []
    const firstWorkspace = workspaces[0] ?? null
    const ssoEnabled = report.api.ssoConfig.body?.enabled === true
    const allowLegacyPasswordLogin = report.api.ssoConfig.body?.allow_legacy_password_login !== false

    report.firstWorkspace = firstWorkspace
      ? {
          slug: firstWorkspace.slug,
          name: firstWorkspace.name,
        }
      : null

    await gotoAndWait(`${report.baseUrl}/workspaces`, 'page-workspaces')
    report.pages.workspaces = {
      url: page.url(),
      heading: await firstHeadingText(),
      bodySample: (await bodyText()).slice(0, 300),
      visibleWorkspaceNames: await page.locator('h6').evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim()).filter(Boolean).slice(0, 12),
      ),
      expectedGroupCount: groups.length,
      expectedWorkspaceCount: workspaces.length,
    }

    if (firstWorkspace?.slug) {
      const workspaceRoot = `${report.baseUrl}/w/${firstWorkspace.slug}`
      const workspaceLogin = `${workspaceRoot}/login`

      await gotoAndWait(workspaceRoot, 'page-protected-redirect')
      report.pages.protectedRedirect = {
        startUrl: workspaceRoot,
        finalUrl: page.url(),
        redirectedToLogin: page.url().startsWith(workspaceLogin),
        preservedReturnTo: page.url().includes(encodeURIComponent(`/w/${firstWorkspace.slug}`)),
      }

      await gotoAndWait(workspaceLogin, 'page-login')
      report.pages.login = {
        url: page.url(),
        heading: await firstHeadingText(),
        bodySample: (await bodyText()).slice(0, 300),
        hasSsoPrimary: await hasButton(/Entrar com SSO central/i),
        hasLegacySubmit: await hasButton(/Entrar no workspace/i),
        hasRequestAccessEntry: await hasButton(/Solicitar cadastro/i),
      }

      if (report.pages.login.hasRequestAccessEntry) {
        setStep('page-request-access')
        await page.getByRole('button', { name: /Solicitar cadastro/i }).click()
        await page.waitForLoadState('networkidle').catch(() => null)
        await page.waitForTimeout(250)
        report.pages.requestAccess = {
          requestModeVisible: (await page.getByLabel('Seu nome').count()) > 0,
          hasRequestMessageField: (await page.getByLabel('Mensagem para aprovacao').count()) > 0,
          hasBackToLogin: await hasButton(/Voltar ao login/i),
        }

        if (report.pages.requestAccess.hasBackToLogin) {
          await page.getByRole('button', { name: /Voltar ao login/i }).click()
          await page.waitForLoadState('networkidle').catch(() => null)
          await page.waitForTimeout(250)
        }
      }

      setStep('api-sso-start')
      report.api.ssoStart = await fetchJson('/api/sso/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_slug: firstWorkspace.slug,
          return_to: `/w/${firstWorkspace.slug}`,
        }),
      })

      if (report.pages.protectedRedirect?.redirectedToLogin !== true) {
        pushFailure(
          'page-protected-redirect',
          'Entrar na raiz do workspace sem sessao deve redirecionar para o login do workspace.',
          report.pages.protectedRedirect,
        )
      }

      if (report.pages.protectedRedirect?.preservedReturnTo !== true) {
        pushFailure(
          'page-protected-returnto',
          'O redirect para login deve preservar o returnTo do workspace.',
          report.pages.protectedRedirect,
        )
      }

      if (report.pages.login?.url !== `${report.baseUrl}/w/${firstWorkspace.slug}/login`) {
        pushFailure(
          'page-login-url',
          'A rota de login do workspace deve permanecer no path contextualizado.',
          report.pages.login,
        )
      }

      if (report.pages.login?.hasLegacySubmit !== allowLegacyPasswordLogin) {
        pushFailure(
          'page-login-legacy-consistency',
          'A tela de login precisa refletir allow_legacy_password_login.',
          {
            login: report.pages.login,
            ssoConfig: report.api.ssoConfig.body,
          },
        )
      }

      if (ssoEnabled && report.pages.login?.hasSsoPrimary !== true) {
        pushFailure(
          'page-login-sso-entry',
          'Com SSO habilitado, a tela de login precisa expor o CTA primario de SSO.',
          {
            login: report.pages.login,
            ssoConfig: report.api.ssoConfig.body,
          },
        )
      }

      if (!ssoEnabled && report.api.ssoStart?.status !== 404) {
        pushFailure(
          'api-sso-start-disabled',
          'Com SSO desabilitado, /api/sso/start deve responder 404 para evitar falso positivo.',
          report.api.ssoStart,
        )
      }

      if (ssoEnabled && report.api.ssoStart?.status !== 200) {
        pushFailure(
          'api-sso-start-enabled',
          'Com SSO habilitado, /api/sso/start precisa responder 200.',
          report.api.ssoStart,
        )
      }

      if (report.pages.requestAccess) {
        if (report.pages.requestAccess.requestModeVisible !== true) {
          pushFailure(
            'page-request-access-open',
            'Solicitar cadastro deve abrir o formulario de request access.',
            report.pages.requestAccess,
          )
        }

        if (report.pages.requestAccess.hasRequestMessageField !== true) {
          pushFailure(
            'page-request-access-fields',
            'O formulario de request access precisa expor a mensagem para aprovacao.',
            report.pages.requestAccess,
          )
        }
      }
    }

    await gotoAndWait(`${report.baseUrl}/auth/callback`, 'page-callback-missing-params')
    report.pages.callbackMissingParams = {
      url: page.url(),
      hasExpectedMessage: (await bodyText()).includes('Callback de SSO incompleto'),
    }

    await gotoAndWait(
      `${report.baseUrl}/auth/callback?error=access_denied&error_description=portal%20recusou`,
      'page-callback-provider-error',
    )
    report.pages.callbackProviderError = {
      url: page.url(),
      hasExpectedMessage: (await bodyText()).includes('portal recusou'),
    }

    await gotoAndWait(
      `${report.baseUrl}/auth/callback?code=invalid-code-12345678&state=bad-state-12345678`,
      'page-callback-invalid-state',
    )
    const invalidStateBody = await bodyText()
    report.pages.callbackInvalidState = {
      url: page.url(),
      hasInvalidStateMessage:
        invalidStateBody.includes('Invalid or expired SSO state') ||
        invalidStateBody.includes('Central SSO is disabled') ||
        invalidStateBody.includes('Falha ao concluir o SSO central'),
    }

    if (report.api.health.status !== 200 || report.api.health.ok !== true) {
      pushFailure('api-health', 'Health check precisa responder 200.', report.api.health)
    }

    if (report.api.publicWorkspaces.status !== 200 || report.api.publicWorkspaces.ok !== true) {
      pushFailure(
        'api-public-workspaces',
        'A listagem publica de workspaces precisa responder 200.',
        report.api.publicWorkspaces,
      )
    }

    if (report.api.ssoConfig.status !== 200 || report.api.ssoConfig.ok !== true) {
      pushFailure('api-sso-config', 'A configuracao de SSO precisa responder 200.', report.api.ssoConfig)
    }

    if (!firstWorkspace?.slug) {
      pushFailure(
        'workspace-seed',
        'A auditoria precisa de pelo menos um workspace publico para cobrir o funil.',
        report.api.publicWorkspaces.body,
      )
    }

    if (report.pages.workspaces.url !== `${report.baseUrl}/workspaces`) {
      pushFailure(
        'page-workspaces-url',
        'A rota /workspaces deve permanecer em /workspaces sem redirect inesperado.',
        report.pages.workspaces,
      )
    }

    if (report.pages.workspaces.heading !== 'Selecionar workspace') {
      pushFailure(
        'page-workspaces-heading',
        'A rota /workspaces deve expor o heading da tela de selecao de workspace.',
        report.pages.workspaces,
      )
    }

    if (workspaces.length > 0 && report.pages.workspaces.visibleWorkspaceNames.length === 0) {
      pushFailure(
        'page-workspaces-cards',
        'A rota /workspaces precisa renderizar cards/lista de workspaces visiveis.',
        report.pages.workspaces,
      )
    }

    if (report.pages.callbackMissingParams?.hasExpectedMessage !== true) {
      pushFailure(
        'page-callback-missing-params',
        'O callback sem code/state deve mostrar o erro esperado.',
        report.pages.callbackMissingParams,
      )
    }

    if (report.pages.callbackProviderError?.hasExpectedMessage !== true) {
      pushFailure(
        'page-callback-provider-error',
        'O callback com erro do provider deve renderizar a mensagem propagada.',
        report.pages.callbackProviderError,
      )
    }

    if (report.pages.callbackInvalidState?.hasInvalidStateMessage !== true) {
      pushFailure(
        'page-callback-invalid-state',
        'O callback com state invalido precisa falhar de forma legivel.',
        report.pages.callbackInvalidState,
      )
    }

    const allowedResponse = (entry) => {
      if (entry.url.endsWith('/api/sso/start') && !ssoEnabled && entry.status === 404) {
        return true
      }

      if (
        entry.url.includes('/api/sso/exchange') &&
        entry.step === 'page-callback-invalid-state' &&
        ((ssoEnabled && entry.status === 400) || (!ssoEnabled && entry.status === 404))
      ) {
        return true
      }

      return false
    }

    const unexpectedResponses = report.network.responses4xx5xx.filter((entry) => !allowedResponse(entry))
    if (unexpectedResponses.length > 0) {
      pushFailure(
        'network-unexpected-4xx5xx',
        'Foram detectadas respostas 4xx/5xx fora dos cenarios negativos explicitamente aceitos.',
        unexpectedResponses,
      )
    }

    if (report.network.requestFailures.length > 0) {
      pushFailure(
        'network-requestfailed',
        'Foram detectados requestfailed no browser durante os funis auditados.',
        report.network.requestFailures,
      )
    }

    const unexpectedConsoleErrors = report.console.errors.filter((entry) => {
      if (
        !ssoEnabled &&
        entry.text.includes('Failed to load resource') &&
        entry.url.includes(`/w/${firstWorkspace?.slug ?? ''}/login`)
      ) {
        return false
      }

      return true
    })

    if (unexpectedConsoleErrors.length > 0) {
      pushFailure(
        'console-errors',
        'Foram detectados console.error durante a auditoria.',
        unexpectedConsoleErrors,
      )
    }

    if (report.console.pageErrors.length > 0) {
      pushFailure(
        'page-errors',
        'Foram detectados erros uncaught no browser durante a auditoria.',
        report.console.pageErrors,
      )
    }

    if (report.console.warnings.length > 0) {
      pushWarning(
        'console-warnings',
        'Foram detectados warnings no console. Nao bloqueiam o gate, mas devem ser revisados.',
        report.console.warnings,
      )
    }

    report.gate.passed = report.gate.failures.length === 0
    return report
  } finally {
    await context.close()
    await browser.close()
  }
}

run()
  .then((report) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  })
  .catch((error) => {
    const payload = {
      generatedAt: new Date().toISOString(),
      fatal: true,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    }
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
    process.exit(1)
  })
