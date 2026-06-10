import User from '@/models/User'

export function makeReferralCode(name: string) {
  const base = 'PP-' + (name || 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${rand}`
}

// Returns a referral code not already taken.
export async function uniqueReferralCode(name: string) {
  let code = makeReferralCode(name)
  for (let i = 0; i < 6; i++) {
    const exists = await User.findOne({ referralCode: code }).select('_id').lean()
    if (!exists) return code
    code = makeReferralCode(name)
  }
  return code
}

// Lazily assign a referral code to an existing user that doesn't have one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureReferralCode(user: any): Promise<string> {
  if (user.referralCode) return user.referralCode
  user.referralCode = await uniqueReferralCode(user.name)
  await user.save()
  return user.referralCode
}
