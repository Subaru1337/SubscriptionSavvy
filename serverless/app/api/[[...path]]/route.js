import { neon } from '@neondatabase/serverless'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'

// ---------- DB ----------
let sql
let schemaReady = false
let googleClient

function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

async function ensureSchema() {
  if (schemaReady) return
  const db = getDb()
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      auth_provider TEXT NOT NULL DEFAULT 'local',
      google_sub TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  // Backward compatible migrations for existing databases.
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';`
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;`
  await db`ALTER TABLE users ALTER COLUMN password DROP NOT NULL;`
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);`
  await db`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cost DOUBLE PRECISION NOT NULL,
      category TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      next_payment DATE NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_paid TIMESTAMPTZ
    );
  `
  await db`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      for_date DATE
    );
  `
  await db`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);`
  await db`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);`
  schemaReady = true
}

// ---------- CORS ----------
function withCORS(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 200 })) }

// ---------- Auth utils ----------
const SECRET = process.env.JWT_SECRET || 'subscription-savvy-secret-key-change-me'
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
const b64uDec = (s) => Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf-8')

function signJWT(payload, days = 30) {
  const header = { alg:'HS256', typ:'JWT' }
  const exp = Math.floor(Date.now()/1000) + days*86400
  const body = { ...payload, iat: Math.floor(Date.now()/1000), exp }
  const h = b64u(JSON.stringify(header))
  const p = b64u(JSON.stringify(body))
  const sig = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest()
  return `${h}.${p}.${b64u(sig)}`
}
function verifyJWT(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const expected = b64u(crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest())
  if (expected !== s) return null
  try {
    const body = JSON.parse(b64uDec(p))
    if (body.exp && body.exp < Math.floor(Date.now()/1000)) return null
    return body
  } catch { return null }
}
function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const h = crypto.scryptSync(password, s, 64).toString('hex')
  return `${s}:${h}`
}
function verifyPassword(password, stored) {
  if (!stored) return false
  const [s, h] = stored.split(':')
  if (!s || !h) return false
  const test = crypto.scryptSync(password, s, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(h,'hex'), Buffer.from(test,'hex'))
}
function getGoogleClient() {
  if (!googleClient) {
    const audience = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!audience) throw new Error('GOOGLE_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID) is not configured')
    googleClient = new OAuth2Client(audience)
  }
  return googleClient
}
async function verifyGoogleIdToken(credential) {
  const audience = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const client = getGoogleClient()
  const ticket = await client.verifyIdToken({ idToken: credential, audience })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload?.email) throw new Error('Invalid Google token payload')
  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
  }
}
function getAuth(request) {
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyJWT(auth.slice(7))
}
async function requireUser(request) {
  const payload = getAuth(request)
  if (!payload?.uid) return null
  const db = getDb()
  const [user] = await db`SELECT id, email, password, created_at FROM users WHERE id = ${payload.uid} LIMIT 1`
  return user || null
}
function unauth() { return withCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 })) }
function badRequest(msg) { return withCORS(NextResponse.json({ error: msg }, { status: 400 })) }
const clean = (o) => { const { password, ...r } = o || {}; return r }

// ---------- Business helpers ----------
function monthlyEquivalent(s) {
  const c = parseFloat(s.cost) || 0
  return s.billing_cycle === 'yearly' ? c / 12 : c
}
function nextCycleDate(dateStr, cycle) {
  const d = new Date(dateStr)
  if (cycle === 'yearly') d.setFullYear(d.getFullYear()+1)
  else d.setMonth(d.getMonth()+1)
  return d.toISOString().slice(0,10)
}
function toCSV(rows) {
  const headers = ['name','category','cost','billing_cycle','next_payment','notes']
  const esc = (v) => { const s = (v??'').toString(); return /[,"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s }
  const lines = [headers.join(',')]
  rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')))
  return lines.join('\n')
}
function simplePDF(title, lines) {
  // Minimal valid one-page PDF with text
  const esc = (s) => s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')
  const ops = []
  ops.push('BT')
  ops.push('/F1 18 Tf 50 770 Td (' + esc(title) + ') Tj')
  ops.push('/F1 10 Tf 0 -22 Td (Generated ' + esc(new Date().toLocaleString('en-IN')) + ') Tj')
  ops.push('0 -18 Td')
  lines.forEach(l => { ops.push('0 -14 Td (' + esc(l).slice(0,500) + ') Tj') })
  ops.push('ET')
  const stream = ops.join('\n')
  const objs = []
  objs.push('<< /Type /Catalog /Pages 2 0 R >>')
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>')
  objs.push('<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream')
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i+1} 0 obj\n${o}\nendobj\n` })
  const xrefStart = out.length
  out += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n`
  offsets.forEach(off => { out += off.toString().padStart(10,'0') + ' 00000 n \n' })
  out += `trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(out, 'binary')
}

// ---------- Router ----------
async function handler(request, { params }) {
  const { path = [] } = params
  const route = '/' + path.join('/')
  const method = request.method

  try {
    await ensureSchema()
    const db = getDb()

    // Health
    if (route === '/' && method === 'GET') return withCORS(NextResponse.json({ message: 'SubscriptionSavvy API' }))
    if (route === '/root' && method === 'GET') return withCORS(NextResponse.json({ message: 'SubscriptionSavvy API' }))

    // ---------- AUTH ----------
    if (route === '/auth/register' && method === 'POST') {
      const { email, password } = await request.json().catch(()=>({}))
      if (!email || !password) return badRequest('Email and password required')
      if (password.length < 6) return badRequest('Password must be at least 6 characters')
      const normalizedEmail = email.toLowerCase()
      const [existing] = await db`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`
      if (existing) return badRequest('Email already registered')
      const user = {
        id: uuidv4(),
        email: normalizedEmail,
        password: hashPassword(password),
      }
      await db`
        INSERT INTO users (id, email, password)
        VALUES (${user.id}, ${user.email}, ${user.password})
      `
      const token = signJWT({ uid: user.id, email: user.email })
      return withCORS(NextResponse.json({ access_token: token, token_type: 'bearer', user: { id: user.id, email: user.email } }))
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json().catch(()=>({}))
      if (!email || !password) return badRequest('Email and password required')
      const [user] = await db`
        SELECT id, email, password, auth_provider
        FROM users
        WHERE email = ${email.toLowerCase()}
        LIMIT 1
      `
      if (user?.auth_provider === 'google' && !user?.password) {
        return withCORS(NextResponse.json({ error: 'Use Google sign in for this account' }, { status: 400 }))
      }
      if (!user || !verifyPassword(password, user.password)) return withCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }))
      const token = signJWT({ uid: user.id, email: user.email })
      return withCORS(NextResponse.json({ access_token: token, token_type: 'bearer', user: { id: user.id, email: user.email } }))
    }

    if (route === '/auth/google' && method === 'POST') {
      const { credential } = await request.json().catch(() => ({}))
      if (!credential) return badRequest('Google credential is required')
      const google = await verifyGoogleIdToken(credential)
      if (!google.emailVerified) return badRequest('Google email is not verified')

      let [user] = await db`
        SELECT id, email, auth_provider, google_sub
        FROM users
        WHERE google_sub = ${google.googleSub}
        LIMIT 1
      `

      if (!user) {
        ;[user] = await db`
          SELECT id, email, auth_provider, google_sub
          FROM users
          WHERE email = ${google.email}
          LIMIT 1
        `
      }

      if (!user) {
        const id = uuidv4()
        await db`
          INSERT INTO users (id, email, password, auth_provider, google_sub)
          VALUES (${id}, ${google.email}, ${null}, 'google', ${google.googleSub})
        `
        user = { id, email: google.email, auth_provider: 'google', google_sub: google.googleSub }
      } else if (!user.google_sub || user.google_sub !== google.googleSub || user.auth_provider !== 'google') {
        await db`
          UPDATE users
          SET google_sub = ${google.googleSub}, auth_provider = 'google'
          WHERE id = ${user.id}
        `
      }

      const token = signJWT({ uid: user.id, email: user.email })
      return withCORS(NextResponse.json({ access_token: token, token_type: 'bearer', user: { id: user.id, email: user.email } }))
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await requireUser(request)
      if (!user) return unauth()
      return withCORS(NextResponse.json({ id: user.id, email: user.email }))
    }

    // ---------- SUBSCRIPTIONS ----------
    if (route === '/subscriptions' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const list = await db`
        SELECT id, user_id, name, cost, category, billing_cycle, next_payment, notes, active, created_at, last_paid
        FROM subscriptions
        WHERE user_id = ${user.id}
      `
      return withCORS(NextResponse.json(list.map(clean).sort((a,b)=> new Date(a.next_payment)-new Date(b.next_payment))))
    }

    if (route === '/subscriptions' && method === 'POST') {
      const user = await requireUser(request); if (!user) return unauth()
      const body = await request.json().catch(()=>({}))
      const { name, cost, category, billing_cycle, next_payment, notes } = body
      if (!name || cost == null || !category || !billing_cycle || !next_payment) return badRequest('Missing fields')
      const sub = {
        id: uuidv4(),
        user_id: user.id,
        name: String(name),
        cost: parseFloat(cost),
        category,
        billing_cycle,
        next_payment: String(next_payment).slice(0,10),
        notes: notes || '',
        active: true,
      }
      await db`
        INSERT INTO subscriptions (id, user_id, name, cost, category, billing_cycle, next_payment, notes, active)
        VALUES (${sub.id}, ${sub.user_id}, ${sub.name}, ${sub.cost}, ${sub.category}, ${sub.billing_cycle}, ${sub.next_payment}, ${sub.notes}, ${sub.active})
      `
      return withCORS(NextResponse.json(clean(sub)))
    }

    const subMatch = route.match(/^\/subscriptions\/([^\/]+)$/)
    if (subMatch) {
      const id = subMatch[1]
      const user = await requireUser(request); if (!user) return unauth()
      if (method === 'PUT') {
        const body = await request.json().catch(()=>({}))
        const [existing] = await db`
          SELECT id, user_id, name, cost, category, billing_cycle, next_payment, notes, active, created_at, last_paid
          FROM subscriptions
          WHERE id = ${id} AND user_id = ${user.id}
          LIMIT 1
        `
        if (!existing) return withCORS(NextResponse.json({ error:'Not found' }, { status:404 }))
        const updated = {
          name: body.name !== undefined ? body.name : existing.name,
          category: body.category !== undefined ? body.category : existing.category,
          billing_cycle: body.billing_cycle !== undefined ? body.billing_cycle : existing.billing_cycle,
          notes: body.notes !== undefined ? body.notes : existing.notes,
          cost: body.cost !== undefined ? parseFloat(body.cost) : parseFloat(existing.cost),
          next_payment: body.next_payment ? String(body.next_payment).slice(0,10) : existing.next_payment,
        }
        const [doc] = await db`
          UPDATE subscriptions
          SET name = ${updated.name},
              category = ${updated.category},
              billing_cycle = ${updated.billing_cycle},
              notes = ${updated.notes},
              cost = ${updated.cost},
              next_payment = ${updated.next_payment}
          WHERE id = ${id} AND user_id = ${user.id}
          RETURNING id, user_id, name, cost, category, billing_cycle, next_payment, notes, active, created_at, last_paid
        `
        return withCORS(NextResponse.json(clean(doc)))
      }
      if (method === 'DELETE') {
        const deleted = await db`
          DELETE FROM subscriptions
          WHERE id = ${id} AND user_id = ${user.id}
          RETURNING id
        `
        if (!deleted.length) return withCORS(NextResponse.json({ error:'Not found' }, { status:404 }))
        return withCORS(NextResponse.json({ ok: true }))
      }
    }

    const payMatch = route.match(/^\/subscriptions\/([^\/]+)\/pay$/)
    if (payMatch && method === 'POST') {
      const id = payMatch[1]
      const user = await requireUser(request); if (!user) return unauth()
      const [sub] = await db`
        SELECT id, user_id, cost, billing_cycle, next_payment
        FROM subscriptions
        WHERE id = ${id} AND user_id = ${user.id}
        LIMIT 1
      `
      if (!sub) return withCORS(NextResponse.json({ error:'Not found' }, { status:404 }))
      const next = nextCycleDate(sub.next_payment, sub.billing_cycle)
      await db`
        UPDATE subscriptions
        SET next_payment = ${next}, last_paid = NOW()
        WHERE id = ${id} AND user_id = ${user.id}
      `
      await db`
        INSERT INTO payments (id, user_id, subscription_id, amount, paid_at, for_date)
        VALUES (${uuidv4()}, ${user.id}, ${id}, ${parseFloat(sub.cost)}, NOW(), ${sub.next_payment})
      `
      return withCORS(NextResponse.json({ ok: true, next_payment: next }))
    }

    // ---------- ANALYTICS ----------
    if (route === '/analytics/summary' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await db`
        SELECT id, cost, billing_cycle, next_payment
        FROM subscriptions
        WHERE user_id = ${user.id}
      `
      const monthly = subs.reduce((a,s)=> a + monthlyEquivalent(s), 0)
      return withCORS(NextResponse.json({
        monthly_total: Math.round(monthly*100)/100,
        annual_total: Math.round(monthly*12*100)/100,
        active_subscriptions: subs.length,
      }))
    }

    if (route === '/analytics/category-breakdown' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await db`
        SELECT category, cost, billing_cycle
        FROM subscriptions
        WHERE user_id = ${user.id}
      `
      const map = new Map()
      subs.forEach(s => {
        const cur = map.get(s.category) || { category: s.category, count: 0, monthly_amount: 0 }
        cur.count += 1
        cur.monthly_amount += monthlyEquivalent(s)
        map.set(s.category, cur)
      })
      const arr = [...map.values()].map(x => ({ ...x, monthly_amount: Math.round(x.monthly_amount*100)/100 }))
        .sort((a,b)=> b.monthly_amount - a.monthly_amount)
      return withCORS(NextResponse.json(arr))
    }

    // ---------- EXPORT ----------
    if (route === '/export/csv' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await db`
        SELECT name, category, cost, billing_cycle, next_payment, notes
        FROM subscriptions
        WHERE user_id = ${user.id}
      `
      const csv = toCSV(subs.map(clean))
      return withCORS(new NextResponse(csv, { status: 200, headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscriptions.csv"' } }))
    }

    if (route === '/export/pdf' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await db`
        SELECT name, category, cost, billing_cycle, next_payment
        FROM subscriptions
        WHERE user_id = ${user.id}
      `
      const lines = subs.map(s => `${s.name}  |  ${s.category}  |  Rs ${parseFloat(s.cost).toFixed(2)}  |  ${s.billing_cycle}  |  next: ${s.next_payment}`)
      const total = subs.reduce((a,s)=> a + monthlyEquivalent(s), 0)
      lines.push('')
      lines.push(`Monthly equivalent total: Rs ${(Math.round(total*100)/100).toFixed(2)}`)
      lines.push(`Annual equivalent total:  Rs ${(Math.round(total*12*100)/100).toFixed(2)}`)
      const pdf = simplePDF('SubscriptionSavvy Report - ' + user.email, lines)
      return withCORS(new NextResponse(pdf, { status: 200, headers: { 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="subscriptions.pdf"' } }))
    }

    return withCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (e) {
    console.error('API Error:', e)
    return withCORS(NextResponse.json({ error: 'Internal server error', detail: e.message }, { status: 500 }))
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
