const CF_API_VERSION = '2025-01-01'

function getConfig() {
  const appId = process.env.CASHFREE_APP_ID
  const secret = process.env.CASHFREE_SECRET_KEY
  const env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase()
  const baseUrl =
    env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
  return { appId, secret, env, baseUrl }
}

export function isCashfreeConfigured(): boolean {
  const { appId, secret } = getConfig()
  return Boolean(appId && secret)
}

export function cashfreeMode(): 'production' | 'sandbox' {
  return getConfig().env === 'production' ? 'production' : 'sandbox'
}

function headers() {
  const { appId, secret } = getConfig()
  if (!appId || !secret) throw new Error('Cashfree is not configured')
  return {
    'Content-Type': 'application/json',
    'x-api-version': CF_API_VERSION,
    'x-client-id': appId,
    'x-client-secret': secret,
  }
}

export interface CreateOrderParams {
  orderId: string
  amount: number
  currency: string
  customerId: string
  customerEmail: string
  customerPhone: string
  returnUrl: string
}

export interface CreateOrderResult {
  paymentSessionId: string
  orderId: string
}

export async function createCashfreeOrder(
  params: CreateOrderParams
): Promise<CreateOrderResult> {
  const { baseUrl } = getConfig()
  const body = {
    order_id: params.orderId,
    order_amount: Number(params.amount),
    order_currency: params.currency,
    customer_details: {
      customer_id: params.customerId,
      customer_email: params.customerEmail,
      // Cashfree requires a phone; fall back to a placeholder if none on file.
      customer_phone: params.customerPhone || '9999999999',
    },
    order_meta: {
      return_url: `${params.returnUrl}?order_id={order_id}`,
    },
  }

  const res = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Cashfree order creation failed: ${data?.message || res.status}`)
  }

  return {
    paymentSessionId: data.payment_session_id,
    orderId: data.order_id,
  }
}

export interface CashfreeOrderStatus {
  orderId: string
  orderStatus: string // PAID | ACTIVE | EXPIRED | TERMINATED ...
  isPaid: boolean
}

export async function getCashfreeOrderStatus(orderId: string): Promise<CashfreeOrderStatus> {
  const { baseUrl } = getConfig()
  const res = await fetch(`${baseUrl}/orders/${orderId}`, {
    method: 'GET',
    headers: headers(),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Cashfree order fetch failed: ${data?.message || res.status}`)
  }
  return {
    orderId: data.order_id,
    orderStatus: data.order_status,
    isPaid: data.order_status === 'PAID',
  }
}
