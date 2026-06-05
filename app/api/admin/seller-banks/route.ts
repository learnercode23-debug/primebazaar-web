export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getAuthUser } from '@/lib/auth'
import SellerBankAccount from '@/models/SellerBankAccount'

// GET — list all seller bank accounts pending/verified/rejected
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  await connectDB()
  const accounts = await SellerBankAccount.find()
    .populate('seller', 'name email phone')
    .sort({ createdAt: -1 })
    .lean()
  return NextResponse.json({ success: true, data: accounts })
}

// PUT — approve or reject KYC for a bank account
export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  await connectDB()
  const { accountId, action, note } = await req.json()

  const account = await SellerBankAccount.findById(accountId)
  if (!account) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    account.kycStatus = 'verified'
    account.isVerified = true
    account.kycNote = note || 'Verified by admin'
  } else if (action === 'reject') {
    account.kycStatus = 'rejected'
    account.isVerified = false
    account.kycNote = note || 'Rejected by admin'
  }

  await account.save()
  return NextResponse.json({ success: true, data: account })
}

// PATCH — admin saves full account number for a seller (for manual payouts)
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
  await connectDB()
  const { sellerId, accountNumber } = await req.json()
  if (!sellerId || !accountNumber) return NextResponse.json({ success: false, error: 'sellerId and accountNumber required' }, { status: 400 })

  const account = await SellerBankAccount.findOne({ seller: sellerId, isDefault: true })
    || await SellerBankAccount.findOne({ seller: sellerId })
  if (!account) return NextResponse.json({ success: false, error: 'No bank account found for this seller' }, { status: 404 })

  account.accountNumber = String(accountNumber).trim()
  account.accountLast4  = String(accountNumber).trim().slice(-4)
  await account.save()
  return NextResponse.json({ success: true })
}
