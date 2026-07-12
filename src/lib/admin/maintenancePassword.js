const DEFAULT_MAINTENANCE_PASSWORD = '123456.'

export function getAdminMaintenancePassword() {
  return (
    process.env.ADMIN_MAINTENANCE_PASSWORD?.trim() ||
    process.env.ADMIN_FULL_REDEPLOY_PASSWORD?.trim() ||
    DEFAULT_MAINTENANCE_PASSWORD
  )
}

export function readAdminMaintenancePassword(req, body = req?.body) {
  const bodyPassword = typeof body?.password === 'string' ? body.password : ''
  const maintenanceHeader = req?.headers?.['x-admin-maintenance-password']
  const redeployHeader = req?.headers?.['x-full-redeploy-password']
  const headerPassword =
    typeof maintenanceHeader === 'string'
      ? maintenanceHeader
      : typeof redeployHeader === 'string'
        ? redeployHeader
        : ''

  return (bodyPassword || headerPassword).trim()
}

export function verifyAdminMaintenancePassword(req, body) {
  return readAdminMaintenancePassword(req, body) === getAdminMaintenancePassword()
}
