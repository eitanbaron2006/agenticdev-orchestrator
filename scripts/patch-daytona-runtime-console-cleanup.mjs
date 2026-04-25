import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const container = process.env.DAYTONA_API_CONTAINER || 'daytona-api-1'
const workDir = join(tmpdir(), 'daytona-runtime-console-cleanup')
const dashboardAsset = '/daytona/dist/apps/dashboard/assets/index-E-7Kbz-p.js'
const apiBundle = '/daytona/dist/apps/api/main.js'

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

function copyFromContainer(containerPath, localPath) {
  run('docker', ['cp', `${container}:${containerPath}`, localPath])
}

function copyToContainer(localPath, containerPath) {
  run('docker', ['cp', localPath, `${container}:${containerPath}`])
}

function replaceOrSkip(source, needle, replacement, alreadyPatchedMarker, label) {
  if (source.includes(alreadyPatchedMarker)) {
    return source
  }

  if (!source.includes(needle)) {
    throw new Error(`Could not find expected ${label} snippet in Daytona runtime bundle.`)
  }

  return source.replace(needle, replacement)
}

if (!existsSync(workDir)) {
  mkdirSync(workDir, { recursive: true })
}

const localDashboardAsset = join(workDir, 'dashboard-index.js')
const localApiBundle = join(workDir, 'api-main.js')

copyFromContainer(dashboardAsset, localDashboardAsset)
copyFromContainer(apiBundle, localApiBundle)

let dashboardSource = readFileSync(localDashboardAsset, 'utf8')
const userAgentHeaderPattern =
  /headers:\{"User-Agent":(`api-client-typescript\/\$\{[^`]+\}`),\.\.\.ja\.baseOptions\?\.headers\}/

if (!dashboardSource.includes('typeof XMLHttpRequest!="undefined"')) {
  const patchedDashboardSource = dashboardSource.replace(
    userAgentHeaderPattern,
    'headers:{...(typeof XMLHttpRequest!="undefined"?{}:{"User-Agent":$1}),...ja.baseOptions?.headers}',
  )

  if (patchedDashboardSource === dashboardSource) {
    throw new Error('Could not find Daytona API client User-Agent snippet in dashboard runtime bundle.')
  }

  dashboardSource = patchedDashboardSource
}

const sdkUserAgentHeaderPattern = /"User-Agent":(`\$\{Ba\}\/\$\{version\$6\}`),\.\.\.Ua/
if (!dashboardSource.includes('{"User-Agent":`${Ba}/${version$6}`})')) {
  const patchedDashboardSource = dashboardSource.replace(
    sdkUserAgentHeaderPattern,
    '...(typeof XMLHttpRequest!="undefined"?{}:{"User-Agent":$1}),...Ua',
  )

  if (patchedDashboardSource === dashboardSource) {
    throw new Error('Could not find Daytona SDK User-Agent snippet in dashboard runtime bundle.')
  }

  dashboardSource = patchedDashboardSource
}

writeFileSync(localDashboardAsset, dashboardSource)

let apiSource = readFileSync(localApiBundle, 'utf8')
apiSource = replaceOrSkip(
  apiSource,
  'async getInitializationStatus(e){const t=await this.webhookService.getInitializationStatus(e);if(!t)throw new s.NotFoundException("Webhook initialization status not found");return l.WebhookInitializationStatusDto.fromWebhookInitialization(t)}',
  'async getInitializationStatus(e){const t=await this.webhookService.getInitializationStatus(e);if(!t)return{organizationId:e,svixApplicationId:null,lastError:this.webhookService.isEnabled()?null:"Webhook service is not configured",retryCount:0,createdAt:"1970-01-01T00:00:00.000Z",updatedAt:"1970-01-01T00:00:00.000Z"};return l.WebhookInitializationStatusDto.fromWebhookInitialization(t)}',
  'createdAt:"1970-01-01T00:00:00.000Z"',
  'webhook initialization status',
)
apiSource = replaceOrSkip(
  apiSource,
  'async getAppPortalAccess(e){if(!this.svix)throw new s.ServiceUnavailableException("Webhook service is not configured");try{',
  'async getAppPortalAccess(e){if(!this.svix)return{token:"",url:""};try{',
  'if(!this.svix)return{token:"",url:""}',
  'webhook app portal access',
)

writeFileSync(localApiBundle, apiSource)

copyToContainer(localDashboardAsset, dashboardAsset)
copyToContainer(localApiBundle, apiBundle)
run('docker', ['restart', container])

console.log('Patched Daytona runtime dashboard/API bundles and restarted the API container.')
