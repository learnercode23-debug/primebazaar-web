export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerBankAccount from '@/models/SellerBankAccount'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'seller') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  await connectDB()
  const accounts = await SellerBankAccount.find({ seller: user._id }).lean()
  return NextResponse.json({ success: true, data: accounts })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'seller') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const { accountHolderName, bankName, accountNumber, ifscCode, mobileWallet, walletType } = await req.json()

  if (!accountHolderName || !bankName) {
    return NextResponse.json({ success: false, error: 'Name and bank are required' }, { status: 400 })
  }

  // SECURITY: Never store full account number. Store only last 4 digits.
  // In production: send full number to payout provider vault, store their token.
  const accountLast4 = accountNumber ? String(accountNumber).slice(-4) : mobileWallet?.slice(-4) || '0000'

  // If setting as default, unset all existing defaults
  await SellerBankAccount.updateMany({ seller: user._id }, { isDefault: false })

  const account = await SellerBankAccount.create({
    seller:            user._id,
    accountHolderName,
    bankName,
    accountLast4,
    ifscCode,
    mobileWallet,
    walletType:  walletType || 'bank',
    isDefault:   true,
    // KYC: starts as pending — admin must verify before payouts enabled
    kycStatus:   'submitted',
    isVerified:  false,
  })

  return NextResponse.json({ success: true, data: account })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'seller') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const { accountId, accountHolderName, bankName, accountNumber, ifscCode, mobileWallet, walletType } = await req.json()
  if (!accountId) return NextResponse.json({ success: false, error: 'accountId required' }, { status: 400 })

  const account = await SellerBankAccount.findOne({ _id: accountId, seller: user._id })
  if (!account) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })

  if (accountHolderName) account.accountHolderName = accountHolderName
  if (bankName)          account.bankName          = bankName
  if (ifscCode)          account.ifscCode          = ifscCode
  if (mobileWallet)      account.mobileWallet      = mobileWallet
  if (walletType)        account.walletType        = walletType
  if (accountNumber || mobileWallet) {
    account.accountLast4 = accountNumber
      ? String(accountNumber).slice(-4)
      : (mobileWallet || account.mobileWallet || '').slice(-4) || '0000'
  }
  // Reset KYC on edit so admin re-verifies
  account.kycStatus  = 'submitted'
  account.isVerified = false
  await account.save()

  return NextResponse.json({ success: true, data: account })
}
