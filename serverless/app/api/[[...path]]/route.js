import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// ---------- DB ----------
let client, db
async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME || 'subscription_savvy')
  }
  return db
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
  const [s, h] = stored.split(':')
  if (!s || !h) return false
  const test = crypto.scryptSync(password, s, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(h,'hex'), Buffer.from(test,'hex'))
}
function getAuth(request) {
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyJWT(auth.slice(7))
}
async function requireUser(request) {
  const payload = getAuth(request)
  if (!payload?.uid) return null
  const dbi = await connectToMongo()
  const user = await dbi.collection('users').findOne({ id: payload.uid })
  return user || null
}
function unauth() { return withCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 })) }
function badRequest(msg) { return withCORS(NextResponse.json({ error: msg }, { status: 400 })) }
const clean = (o) => { const { _id, password, ...r } = o || {}; return r }

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
    const dbi = await connectToMongo()

    // Health
    if (route === '/' && method === 'GET') return withCORS(NextResponse.json({ message: 'SubscriptionSavvy API' }))
    if (route === '/root' && method === 'GET') return withCORS(NextResponse.json({ message: 'SubscriptionSavvy API' }))

    // ---------- AUTH ----------
    if (route === '/auth/register' && method === 'POST') {
      const { email, password } = await request.json().catch(()=>({}))
      if (!email || !password) return badRequest('Email and password required')
      if (password.length < 6) return badRequest('Password must be at least 6 characters')
      const existing = await dbi.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) return badRequest('Email already registered')
      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashPassword(password),
        created_at: new Date(),
      }
      await dbi.collection('users').insertOne(user)
      const token = signJWT({ uid: user.id, email: user.email })
      return withCORS(NextResponse.json({ access_token: token, token_type: 'bearer', user: { id: user.id, email: user.email } }))
    }

    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json().catch(()=>({}))
      if (!email || !password) return badRequest('Email and password required')
      const user = await dbi.collection('users').findOne({ email: email.toLowerCase() })
      if (!user || !verifyPassword(password, user.password)) return withCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }))
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
      const list = await dbi.collection('subscriptions').find({ user_id: user.id }).toArray()
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
        created_at: new Date(),
      }
      await dbi.collection('subscriptions').insertOne(sub)
      return withCORS(NextResponse.json(clean(sub)))
    }

    const subMatch = route.match(/^\/subscriptions\/([^\/]+)$/)
    if (subMatch) {
      const id = subMatch[1]
      const user = await requireUser(request); if (!user) return unauth()
      if (method === 'PUT') {
        const body = await request.json().catch(()=>({}))
        const update = {}
        ;['name','category','billing_cycle','notes'].forEach(k => { if (body[k] !== undefined) update[k] = body[k] })
        if (body.cost !== undefined) update.cost = parseFloat(body.cost)
        if (body.next_payment) update.next_payment = String(body.next_payment).slice(0,10)
        const r = await dbi.collection('subscriptions').findOneAndUpdate({ id, user_id: user.id }, { $set: update }, { returnDocument:'after' })
        const doc = r.value || r
        if (!doc) return withCORS(NextResponse.json({ error:'Not found' }, { status:404 }))
        return withCORS(NextResponse.json(clean(doc)))
      }
      if (method === 'DELETE') {
        const r = await dbi.collection('subscriptions').deleteOne({ id, user_id: user.id })
        if (!r.deletedCount) return withCORS(NextResponse.json({ error:'Not found' }, { status:404 }))
        return withCORS(NextResponse.json({ ok: true }))
      }
    }

    const payMatch = route.match(/^\/subscriptions\/([^\/]+)\/pay$/)
    if (payMatch && method === 'POST') {
      const id = payMatch[1]
      const user = await requireUser(request); if (!user) return unauth()
      const sub = await dbi.collection('subscriptions').findOne({ id, user_id: user.id })
      if (!sub) return withCORS(NextResponse.json({ error:'Not found' }, { status:404 }))
      const next = nextCycleDate(sub.next_payment, sub.billing_cycle)
      await dbi.collection('subscriptions').updateOne({ id, user_id: user.id }, { $set: { next_payment: next, last_paid: new Date() } })
      await dbi.collection('payments').insertOne({ id: uuidv4(), user_id: user.id, subscription_id: id, amount: sub.cost, paid_at: new Date(), for_date: sub.next_payment })
      return withCORS(NextResponse.json({ ok: true, next_payment: next }))
    }

    // ---------- ANALYTICS ----------
    if (route === '/analytics/summary' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await dbi.collection('subscriptions').find({ user_id: user.id }).toArray()
      const monthly = subs.reduce((a,s)=> a + monthlyEquivalent(s), 0)
      return withCORS(NextResponse.json({
        monthly_total: Math.round(monthly*100)/100,
        annual_total: Math.round(monthly*12*100)/100,
        active_subscriptions: subs.length,
      }))
    }

    if (route === '/analytics/category-breakdown' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await dbi.collection('subscriptions').find({ user_id: user.id }).toArray()
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
      const subs = await dbi.collection('subscriptions').find({ user_id: user.id }).toArray()
      const csv = toCSV(subs.map(clean))
      return withCORS(new NextResponse(csv, { status: 200, headers: { 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscriptions.csv"' } }))
    }

    if (route === '/export/pdf' && method === 'GET') {
      const user = await requireUser(request); if (!user) return unauth()
      const subs = await dbi.collection('subscriptions').find({ user_id: user.id }).toArray()
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
