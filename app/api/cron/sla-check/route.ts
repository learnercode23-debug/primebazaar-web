// @ts-nocheck
export const dynamic = 'force-dynamic'
/**
 * GET /api/cron/sla-check
 *
 * Called every 15 minutes by Vercel Cron (configured in vercel.json).
 * Secured by Vercel's CRON_SECRET in the Authorization header.
 *
 * What it does:
 *  1. Finds sub-orders that breached their accept-deadline
 *     → auto-reassign to another eligible seller OR auto-cancel (per SLAConfig)
 *  2. Marks ship-deadline breaches as 'ship_breached'
 *  3. Marks near-deadline sub-orders as 'at_risk'
 *  4. Sends an admin notification if SLAConfig.notifyAdmin is true
 *
 * Every action is logged in AssignmentLog for full audit trail.
 */
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import SubOrder from '@/models/SubOrder'
import Order from '@/models/Order'
import SLAConfig from '@/models/SLAConfig'
import AssignmentLog from '@/models/AssignmentLog'
import SellerInventory from '@/models/SellerInventory'
import User from '@/models/User'
import { deriveParentStatus } from '@/lib/splitOrder'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  // Security: Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const now = new Date()
  const sla = await SLAConfig.findOne().lean() || { acceptHours: 24, shipDays: 3, onAcceptBreach: 'reassign', onShipBreach: 'flag', notifyAdmin: true }

  const stats = { acceptBreaches: 0, shipBreaches: 0, atRisk: 0, reassigned: 0, cancelled: 0 }

  /* ═══════════════════════════════════════════════════════════
     STEP 1 — Accept-deadline breaches
     Find confirmed sub-orders past their accept-deadline
     ═══════════════════════════════════════════════════════════ */
  const acceptBreached = await SubOrder.find({
    status: 'confirmed',
    acceptDeadline: { $lt: now },
    autoActionTaken: { $ne: true },
  })

  for (const sub of acceptBreached) {
    stats.acceptBreaches++
    let acted = false

    if (sla.onAcceptBreach === 'reassign') {
      // Try to find another eligible seller for each item
      const allItems = sub.items as Array<{ product: unknown; quantity: number }>
      const firstItem = allItems[0]

      if (firstItem) {
        const eligible = await SellerInventory.find({
          product:  firstItem.product,
          isActive: true,
          stock:    { $gte: firstItem.quantity },
          seller:   { $ne: sub.seller }, // not the current (non-responding) seller
        }).populate('seller', 'name').lean()

        if (eligible.length > 0) {
          const newSellerInv = eligible[0]
          const prevSellerId = sub.seller.toString()

          sub.seller           = newSellerInv.seller._id
          sub.assignmentRule   = 'sla_reassign'
          sub.assignmentReason = `Auto-reassigned: original seller missed ${sla.acceptHours}h accept deadline`
          sub.statusHistory.push({ status: 'confirmed', timestamp: now, note: `SLA auto-reassign to ${newSellerInv.seller.name}` })

          await AssignmentLog.create({
            subOrder:    sub._id,
            order:       sub.parentOrder,
            action:      'manual_reassigned',
            fromSeller:  prevSellerId,
            toSeller:    newSellerInv.seller._id,
            rule:        'sla_auto_reassign',
            reason:      `Accept deadline breached (${sla.acceptHours}h). Auto-reassigned to ${newSellerInv.seller.name}.`,
            performedBy: null,
            timestamp:   now,
          })

          acted = true
          stats.reassigned++
        }
      }
    }

    // If couldn't reassign (or policy is cancel), cancel the sub-order
    if (!acted) {
      sub.status         = 'cancelled'
      sub.rejectedAt     = now
      sub.rejectionReason = `Auto-cancelled: seller missed ${sla.acceptHours}h accept deadline`
      sub.statusHistory.push({ status: 'cancelled', timestamp: now, note: 'SLA auto-cancel' })

      await AssignmentLog.create({
        subOrder:    sub._id,
        order:       sub.parentOrder,
        action:      'manual_reassigned',
        fromSeller:  sub.seller,
        toSeller:    sub.seller,
        rule:        'sla_auto_cancel',
        reason:      `Accept deadline breached (${sla.acceptHours}h). Auto-cancelled.`,
        performedBy: null,
        timestamp:   now,
      })
      stats.cancelled++
    }

    sub.slaStatus       = 'accept_breached'
    sub.autoActionTaken = true
    sub.autoActionAt    = now
    sub.autoActionType  = acted ? 'reassigned' : 'cancelled'
    await sub.save()

    // Sync parent order
    const siblings = await SubOrder.find({ parentOrder: sub.parentOrder }).select('status').lean()
    await Order.findByIdAndUpdate(sub.parentOrder, { status: deriveParentStatus(siblings.map((s) => s.status)) })
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 2 — Ship-deadline breaches
     ═══════════════════════════════════════════════════════════ */
  const shipBreached = await SubOrder.find({
    status:      { $in: ['confirmed', 'processing', 'packed'] },
    shipDeadline:{ $lt: now },
    slaStatus:   { $ne: 'ship_breached' },
    autoActionTaken: { $ne: true },
  })

  for (const sub of shipBreached) {
    stats.shipBreaches++
    sub.slaStatus = 'ship_breached'

    if (sla.onShipBreach === 'cancel') {
      sub.status         = 'cancelled'
      sub.rejectedAt     = now
      sub.rejectionReason = `Auto-cancelled: seller missed ${sla.shipDays}-day ship deadline`
      sub.statusHistory.push({ status: 'cancelled', timestamp: now, note: 'SLA ship deadline auto-cancel' })
      sub.autoActionTaken = true
      sub.autoActionAt    = now
      sub.autoActionType  = 'cancelled'

      await AssignmentLog.create({
        subOrder:    sub._id,
        order:       sub.parentOrder,
        action:      'manual_reassigned',
        fromSeller:  sub.seller,
        toSeller:    sub.seller,
        rule:        'sla_ship_cancel',
        reason:      `Ship deadline breached (${sla.shipDays}d). Auto-cancelled.`,
        performedBy: null,
        timestamp:   now,
      })
      stats.cancelled++
    }

    await sub.save()

    if (sla.onShipBreach === 'cancel') {
      const siblings = await SubOrder.find({ parentOrder: sub.parentOrder }).select('status').lean()
      await Order.findByIdAndUpdate(sub.parentOrder, { status: deriveParentStatus(siblings.map((s) => s.status)) })
    }
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 3 — Mark "at risk" (within 25% of window remaining)
     ═══════════════════════════════════════════════════════════ */
  const acceptRiskMs = sla.acceptHours * 3600 * 1000 * 0.25
  const shipRiskMs   = sla.shipDays    * 86400 * 1000 * 0.20

  const atRiskAccept = await SubOrder.find({
    status:         'confirmed',
    acceptDeadline: { $gte: now, $lte: new Date(now.getTime() + acceptRiskMs) },
    slaStatus:      'ok',
  })
  for (const sub of atRiskAccept) {
    sub.slaStatus = 'at_risk'
    await sub.save()
    stats.atRisk++
  }

  const atRiskShip = await SubOrder.find({
    status:      { $in: ['confirmed', 'processing', 'packed'] },
    shipDeadline:{ $gte: now, $lte: new Date(now.getTime() + shipRiskMs) },
    slaStatus:   'ok',
  })
  for (const sub of atRiskShip) {
    sub.slaStatus = 'at_risk'
    await sub.save()
    stats.atRisk++
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 4 — Notify admin if any breaches occurred
     ═══════════════════════════════════════════════════════════ */
  if (sla.notifyAdmin && (stats.acceptBreaches + stats.shipBreaches) > 0) {
    const admins = await User.find({ role: 'admin' }).select('_id').lean()
    for (const adminUser of admins) {
      await createNotification(
        adminUser._id.toString(),
        'admin_alert',
        'SLA Alert',
        `${stats.acceptBreaches} accept breach(es), ${stats.shipBreaches} ship breach(es) detected. ${stats.reassigned} reassigned, ${stats.cancelled} cancelled.`,
        '/admin/tracking'
      ).catch(console.error)
    }
  }

  return NextResponse.json({ success: true, stats, timestamp: now })
}
