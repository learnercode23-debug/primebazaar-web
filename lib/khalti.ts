const SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a507256'
const API_URL = process.env.KHALTI_API_URL || 'https://a.khalti.com/api/v2'

export interface KhaltiInitiateParams {
  returnUrl: string
  websiteUrl: string
  amountNPR: number       // in Rupees; internally converted to Paisa (×100)
  purchaseOrderId: string // unique order identifier
  purchaseOrderName: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
}

export interface KhaltiInitiateResponse {
  pidx: string
  paymentUrl: string
  expiresAt: string
  expiresIn: number
}

/**
 * Call Khalti's initiation API to get a hosted payment URL.
 * All amounts are in PAISA (1 NPR = 100 paisa).
 */
export async function initiateKhaltiPayment(
  params: KhaltiInitiateParams
): Promise<KhaltiInitiateResponse> {
  const body = {
    return_url: params.returnUrl,
    website_url: params.websiteUrl,
    amount: Math.round(params.amountNPR * 100), // convert to paisa
    purchase_order_id: params.purchaseOrderId,
    purchase_order_name: params.purchaseOrderName,
    ...(params.customerName && {
      customer_info: {
        name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
    }),
  }

  const res = await fetch(`${API_URL}/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err))
  }

  return res.json()
}

export interface KhaltiLookupResponse {
  pidx: string
  total_amount: number   // paisa
  status: 'Completed' | 'Pending' | 'Initiated' | 'Refunded' | 'Expired' | 'User canceled'
  transaction_id?: string
  fee?: number
  refunded?: boolean
  purchase_order_id: string
}

/**
 * Verify a Khalti payment by looking up the pidx.
 * Call this on your return_url route after Khalti redirects back.
 */
export async function verifyKhaltiPayment(pidx: string): Promise<KhaltiLookupResponse> {
  const res = await fetch(`${API_URL}/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err))
  }

  return res.json()
}
