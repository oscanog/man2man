export const USERNAME_IN_USE_PREFIX = 'USERNAME_IN_USE:'
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20

export function parseSuggestedUsername(message: string): string | null {
  const start = message.indexOf(USERNAME_IN_USE_PREFIX)
  if (start === -1) {
    return null
  }

  const suggestion = message
    .slice(start + USERNAME_IN_USE_PREFIX.length)
    .trim()
    .split(/\s+/)[0] ?? ''

  return suggestion.length > 0 ? suggestion : null
}

export function sanitizeUsernameInput(username: string): string {
  return username.replace(/\s+/g, ' ').trim().slice(0, USERNAME_MAX_LENGTH)
}

export function generateGuestUsername(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000).toString()
  return `guest${suffix}`
}
