import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const apiClientConfiguration = read('daytona-server/libs/api-client/src/configuration.ts')
const toolboxApiClientConfiguration = read('daytona-server/libs/toolbox-api-client/src/configuration.ts')
const sdkTypeScriptDaytona = read('daytona-server/libs/sdk-typescript/src/Daytona.ts')

assert(
  apiClientConfiguration.includes('XMLHttpRequest'),
  'The generated TypeScript API client should detect browser runtimes before adding browser-forbidden headers.',
)

assert(
  !/headers:\s*{\s*'User-Agent':/.test(apiClientConfiguration),
  'The generated TypeScript API client must not inject User-Agent unconditionally in browser requests.',
)

assert(
  toolboxApiClientConfiguration.includes('XMLHttpRequest'),
  'The generated TypeScript toolbox API client should detect browser runtimes before adding browser-forbidden headers.',
)

assert(
  !/headers:\s*{\s*'User-Agent':/.test(toolboxApiClientConfiguration),
  'The generated TypeScript toolbox API client must not inject User-Agent unconditionally in browser requests.',
)

assert(
  sdkTypeScriptDaytona.includes('XMLHttpRequest'),
  'The TypeScript SDK should detect browser runtimes before adding browser-forbidden headers.',
)

assert(
  sdkTypeScriptDaytona.includes("...(hasBrowserForbiddenHeaders ? {} : { 'User-Agent': `sdk-typescript/${packageJson.version}` })"),
  'The TypeScript SDK must not inject User-Agent unconditionally in browser requests.',
)

const webhookController = read('daytona-server/apps/api/src/webhook/controllers/webhook.controller.ts')
const webhookInitializationDto = read('daytona-server/apps/api/src/webhook/dto/webhook-initialization-status.dto.ts')

assert(
  webhookController.includes('WebhookInitializationStatusDto.emptyForOrganization'),
  'Webhook initialization-status should return a non-error empty status when no Svix application exists.',
)

assert(
  webhookInitializationDto.includes('emptyForOrganization'),
  'Webhook initialization DTO should expose a reusable empty status response.',
)

const appPortalHook = read('daytona-server/apps/dashboard/src/hooks/queries/useWebhookAppPortalAccessQuery.ts')
const svixProvider = read('daytona-server/apps/dashboard/src/providers/SvixProvider.tsx').replace(/\s+/g, ' ')

assert(
  appPortalHook.includes('enabled = true') && appPortalHook.includes('enabled: Boolean(organizationId) && enabled'),
  'App portal access query should support being disabled until a Svix app exists.',
)

assert(
  svixProvider.includes('useWebhookAppPortalAccessQuery(selectedOrganization?.id, Boolean(svixApplicationId))'),
  'SvixProvider should not request app portal access until initialization status has a Svix application id.',
)

console.log('Daytona dashboard console cleanup guards passed')
