import crypto from 'crypto'

const MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST'
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q'
export const ESEWA_PAYMENT_URL =
  process.env.ESEWA_PAYMENT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
const VERIFY_URL =
  process.env.ESEWA_VERIFY_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/'

export interface EsewaPaymentParams {
  amount: number            // item amount (NPR)
  taxAmount?: number        // tax (NPR), default 0
  totalAmount: number       // amount + tax + serviceCharge + deliveryCharge
  transactionUuid: string   // unique per transaction
  successUrl: string
  failureUrl: string
}

/**
 * Generate the HMAC-SHA256 signature eSewa requires.
 * Signed string: "total_amount,transaction_uuid,product_code"
 */
export function generateEsewaSignature(
  totalAmount: number,
  transactionUuid: string
): string {
  const signedFieldNames = 'total_amount,transaction_uuid,product_code'
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${MERCHANT_CODE}`
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64')
}

/**
 * Build the form-field map to POST to eSewa's payment URL.
 * The checkout page renders a hidden form and auto-submits it.
 */
export function buildEsewaFormFields(params: EsewaPaymentParams): Record<string, string> {
  const {
    amount,
    taxAmount = 0,
    totalAmount,
    transactionUuid,
    successUrl,
    failureUrl,
  } = params

  const signature = generateEsewaSignature(totalAmount, transactionUuid)

  return {
    amount: String(amount),
    tax_amount: String(taxAmount),
    total_amount: String(totalAmount),
    transaction_uuid: transactionUuid,
    product_code: MERCHANT_CODE,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature,
  }
}

/**
 * Verify an eSewa payment after redirect.
 * eSewa redirects back with base64-encoded `data` query param.
 */
export async function verifyEsewaPayment(
  encodedData: string
): Promise<{ success: boolean; transactionUuid?: string; refId?: string; status?: string }> {
  try {
    const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8')) as {
      transaction_uuid: string
      total_amount: string
      status: string
      signed_field_names: string
      signature: string
    }

    // Re-verify the signature from eSewa's response
    const { transaction_uuid, total_amount, status } = decoded
    const expectedSig = generateEsewaSignature(parseFloat(total_amount), transaction_uuid)

    // Verify with eSewa status API
    const url = `${VERIFY_URL}?product_code=${MERCHANT_CODE}&transaction_uuid=${transaction_uuid}&total_amount=${total_amount}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const verifyData = await res.json() as { status: string; ref_id?: string }

    const success =
      verifyData.status === 'COMPLETE' &&
      decoded.status === 'COMPLETE' &&
      decoded.signature === expectedSig

    return {
      success,
      transactionUuid: transaction_uuid,
      refId: verifyData.ref_id,
      status: verifyData.status,
    }
  } catch {
    return { success: false }
  }
}
