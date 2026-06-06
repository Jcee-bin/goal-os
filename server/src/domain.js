export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001'

export const cues = new Set(['morning', 'afternoon', 'night', 'anytime'])
export const cadences = new Set(['ongoing', 'weekly'])
export const accounts = new Set(['cash', 'bank', 'savings'])
export const transactionTypes = new Set(['income', 'expense', 'saving'])
export const transactionStatuses = new Set(['paid', 'to-pay'])
export const categories = new Set(['income', 'needs', 'wants', 'debt', 'saving'])

export function getDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWeekKey(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return getDateKey(monday)
}

export function requireText(value, field, maxLength = 160) {
  const normalized = String(value ?? '').trim()
  if (!normalized) throw validationError(field, `${field} is required`)
  if (normalized.length > maxLength) {
    throw validationError(field, `${field} must be ${maxLength} characters or fewer`)
  }
  return normalized
}

export function requirePositiveInteger(value, field, max = 10000) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw validationError(field, `${field} must be an integer between 1 and ${max}`)
  }
  return number
}

export function requireEnum(value, field, allowed) {
  if (!allowed.has(value)) throw validationError(field, `Invalid ${field}`)
  return value
}

export function validationError(field, message) {
  const error = new Error(message)
  error.status = 400
  error.details = { [field]: message }
  return error
}

export function notFound(message = 'Not found') {
  const error = new Error(message)
  error.status = 404
  return error
}

export function conflict(message) {
  const error = new Error(message)
  error.status = 409
  return error
}
