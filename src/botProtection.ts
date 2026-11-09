export const botProtectedRoutes = [
  { path: '/api/waitlist', method: 'POST', advancedOptions: { checkLevel: 'deepAnalysis' as const } },
  { path: '/api/login', method: 'POST', advancedOptions: { checkLevel: 'deepAnalysis' as const } },
  { path: '/api/confirm', method: 'POST', advancedOptions: { checkLevel: 'deepAnalysis' as const } },
  { path: '/api/confirm-status', method: 'POST', advancedOptions: { checkLevel: 'deepAnalysis' as const } },
  { path: '/api/visits', method: 'POST', advancedOptions: { checkLevel: 'basic' as const } },
  { path: '/api/support', method: 'POST', advancedOptions: { checkLevel: 'deepAnalysis' as const } },
]
