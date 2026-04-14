import crypto from 'crypto'
import { cookies } from 'next/headers'
import { dbQuery } from '@/lib/mysql/db'
import { findUserByAuthId } from '@/lib/mysql/auth'
import { getSessionCookieName, verifySessionToken } from '@/lib/mysql/session'

function buildWhere(filters) {
  if (!filters?.length) return { sql: '', params: [] }
  const clauses = []
  const params = []
  for (const filter of filters) {
    const { op, column, value } = filter
    if (op === 'eq') { clauses.push(`\`${column}\` = ?`); params.push(value) }
    if (op === 'neq') { clauses.push(`\`${column}\` <> ?`); params.push(value) }
    if (op === 'gt') { clauses.push(`\`${column}\` > ?`); params.push(value) }
    if (op === 'gte') { clauses.push(`\`${column}\` >= ?`); params.push(value) }
    if (op === 'lt') { clauses.push(`\`${column}\` < ?`); params.push(value) }
    if (op === 'lte') { clauses.push(`\`${column}\` <= ?`); params.push(value) }
    if (op === 'like') { clauses.push(`\`${column}\` LIKE ?`); params.push(value) }
    if (op === 'ilike') { clauses.push(`LOWER(\`${column}\`) LIKE LOWER(?)`); params.push(value) }
    if (op === 'in') { clauses.push(`\`${column}\` IN (${value.map(() => '?').join(',')})`); params.push(...value) }
    if (op === 'is') clauses.push(value === null ? `\`${column}\` IS NULL` : `\`${column}\` IS NOT NULL`)
    if (op === 'not' && filter.operator === 'is') clauses.push(value === null ? `\`${column}\` IS NOT NULL` : `\`${column}\` IS NULL`)
    if (op === 'or' && typeof filter.expr === 'string') {
      const parts = filter.expr.split(',').map(s => s.trim()).filter(Boolean)
      const orClauses = []
      for (const part of parts) {
        const [field, operator, ...rest] = part.split('.')
        const raw = rest.join('.')
        if (!field || !operator) continue
        if (operator === 'ilike') {
          const safe = raw.replace(/^%?/, '%').replace(/%?$/, '%')
          orClauses.push(`LOWER(\`${field}\`) LIKE LOWER(?)`)
          params.push(safe)
        }
        if (operator === 'eq') {
          orClauses.push(`\`${field}\` = ?`)
          params.push(raw)
        }
      }
      if (orClauses.length) clauses.push(`(${orClauses.join(' OR ')})`)
    }
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params }
}

function parseColumns(columns) {
  if (!columns || columns === '*' || columns.includes('(') || columns.includes(':') || columns.includes('*')) return '*'
  return columns
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => `\`${s}\``)
    .join(', ')
}

/* ------------------------------------------------------------------ */
/*  Supabase-style relation parsing & resolution for MySQL            */
/* ------------------------------------------------------------------ */

function parseSelectWithRelations(selectStr) {
  if (!selectStr) return { columns: ['*'], relations: [] }
  const result = { columns: [], relations: [] }
  let depth = 0, current = ''
  const parts = []
  for (const ch of selectStr) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { parts.push(current.trim()); current = '' }
    else current += ch
  }
  if (current.trim()) parts.push(current.trim())
  for (const part of parts) {
    const ci = part.indexOf(':'), pi = part.indexOf('(')
    if (pi > -1 && ci > -1 && ci < pi) {
      const alias = part.substring(0, ci).trim()
      const target = part.substring(ci + 1, pi).trim()
      const fieldsStr = part.substring(pi + 1, part.lastIndexOf(')')).trim()
      const nested = parseSelectWithRelations(fieldsStr)
      result.relations.push({ alias, target, columns: nested.columns, relations: nested.relations })
    } else {
      result.columns.push(part.trim())
    }
  }
  if (!result.columns.length) result.columns.push('*')
  return result
}

const _fkCache = {}
async function getForeignKeys(tableName) {
  if (_fkCache[tableName]) return _fkCache[tableName]
  try {
    const rows = await dbQuery(
      `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName]
    )
    _fkCache[tableName] = rows
    return rows
  } catch (_) { return (_fkCache[tableName] = []) }
}

async function resolveRelations(table, data, relations) {
  if (!data?.length || !relations?.length) return data
  for (const rel of relations) {
    const { alias, target, columns: _rc, relations: nestedRels } = rel

    // Forward FK: target is a column in current table (many-to-one)
    // OR target is a table name and we need to find the FK column that references it
    const currentFKs = await getForeignKeys(table)
    // Try to find FK by column name first (backward compat), then by referenced table
    let fwd = currentFKs.find(fk => fk.COLUMN_NAME === target)
    if (!fwd) {
      // Target is a table name - find FK that references this table
      fwd = currentFKs.find(fk => fk.REFERENCED_TABLE_NAME === target)
    }
    if (fwd) {
      const refTable = fwd.REFERENCED_TABLE_NAME
      const refCol = fwd.REFERENCED_COLUMN_NAME
      const fkCol = fwd.COLUMN_NAME
      // Use fkCol for value extraction (it's the actual column name in source table)
      const vals = [...new Set(data.map(r => r[fkCol]).filter(v => v != null))]
      if (vals.length) {
        let rows = await dbQuery(`SELECT * FROM \`${refTable}\` WHERE \`${refCol}\` IN (${vals.map(() => '?').join(',')})`, vals)
        if (nestedRels?.length) rows = await resolveRelations(refTable, rows, nestedRels)
        const map = {}; for (const r of rows) map[r[refCol]] = r
        for (const row of data) row[alias] = row[fkCol] != null ? (map[row[fkCol]] || null) : null
      } else { for (const row of data) row[alias] = null }
      continue
    }

    // Reverse FK: target is a table name (one-to-many)
    // Look for FKs in the TARGET table that reference the CURRENT table
    const targetFKs = await getForeignKeys(target)
    const rev = targetFKs.find(fk => fk.REFERENCED_TABLE_NAME === table)
    if (rev) {
      const fkCol = rev.COLUMN_NAME
      const refCol = rev.REFERENCED_COLUMN_NAME
      // refCol is the PK in current table, fkCol is the FK in target table
      const vals = [...new Set(data.map(r => r[refCol]).filter(v => v != null))]
      if (vals.length) {
        let rows = await dbQuery(`SELECT * FROM \`${target}\` WHERE \`${fkCol}\` IN (${vals.map(() => '?').join(',')})`, vals)
        if (nestedRels?.length) rows = await resolveRelations(target, rows, nestedRels)
        const groups = {}; for (const r of rows) { const k = r[fkCol]; (groups[k] = groups[k] || []).push(r) }
        for (const row of data) row[alias] = groups[row[refCol]] || []
      } else { for (const row of data) row[alias] = [] }
    } else {
      // Log warning for debugging
      console.warn(`[resolveRelations] Could not resolve relation '${alias}' on '${table}': No FK found for target '${target}'`)
      for (const row of data) row[alias] = null
    }
  }
  return data
}

/* ------------------------------------------------------------------ */

export async function executePayload(payload) {
  const { table, action, columns, values, filters, orderBy, limit, offset, count } = payload
  const where = buildWhere(filters)

  if (action === 'select') {
    const parsed = parseSelectWithRelations(columns)
    const hasRelations = parsed.relations.length > 0
    const colSql = hasRelations ? '*' : parseColumns(columns)
    const orderSql = Array.isArray(orderBy)
      ? (orderBy.length ? ` ORDER BY ${orderBy.map(o => `\`${o.column}\` ${o.ascending ? 'ASC' : 'DESC'}`).join(', ')}` : '')
      : (orderBy?.column ? ` ORDER BY \`${orderBy.column}\` ${orderBy.ascending ? 'ASC' : 'DESC'}` : '')
    const limitSql = Number.isFinite(limit) ? ` LIMIT ${Number(limit)} OFFSET ${Number(offset || 0)}` : ''
    let data = await dbQuery(`SELECT ${colSql} FROM \`${table}\`${where.sql}${orderSql}${limitSql}`, where.params)
    if (hasRelations && data?.length) {
      data = await resolveRelations(table, data, parsed.relations)
    }
    let totalCount = null
    if (count === 'exact') {
      const countRows = await dbQuery(`SELECT COUNT(*) AS c FROM \`${table}\`${where.sql}`, where.params)
      totalCount = countRows[0]?.c ?? 0
    }
    return { data, error: null, count: totalCount }
  }

  if (action === 'insert') {
    const rows = Array.isArray(values) ? values : [values]
    if (!rows.length) return { data: [], error: null }

    const wantsReturn = columns && columns !== '*'
    let pkColumn = null

    if (wantsReturn) {
      try {
        const pkInfo = await dbQuery(`SHOW KEYS FROM \`${table}\` WHERE Key_name = 'PRIMARY'`)
        pkColumn = pkInfo[0]?.Column_name
        if (pkColumn) {
          const colInfo = await dbQuery(`SHOW COLUMNS FROM \`${table}\` WHERE Field = ?`, [pkColumn])
          const isCharUuid = colInfo[0]?.Type?.toLowerCase().includes('char(36)')
          if (isCharUuid) {
            for (const row of rows) {
              if (!row[pkColumn]) row[pkColumn] = crypto.randomUUID()
            }
          }
        }
      } catch (_) { /* fall through */ }
    }

    const columnsList = Object.keys(rows[0])
    const placeholders = `(${columnsList.map(() => '?').join(',')})`
    const sql = `INSERT INTO \`${table}\` (${columnsList.map(c => `\`${c}\``).join(',')}) VALUES ${rows.map(() => placeholders).join(',')}`
    const params = rows.flatMap(row => columnsList.map(c => row[c] ?? null))
    const result = await dbQuery(sql, params)

    if (wantsReturn && pkColumn) {
      const ids = rows.map(r => r[pkColumn]).filter(Boolean)
      if (ids.length) {
        const data = await dbQuery(
          `SELECT * FROM \`${table}\` WHERE \`${pkColumn}\` IN (${ids.map(() => '?').join(',')})`,
          ids
        )
        return { data, error: null }
      }
    }

    return { data: [{ insertId: result.insertId, affectedRows: result.affectedRows }], error: null }
  }

  if (action === 'update') {
    const keys = Object.keys(values || {})
    if (!keys.length) return { data: null, error: null }
    const setSql = keys.map(k => `\`${k}\` = ?`).join(', ')
    const params = [...keys.map(k => values[k]), ...where.params]
    const result = await dbQuery(`UPDATE \`${table}\` SET ${setSql}${where.sql}`, params)
    return { data: [{ affectedRows: result.affectedRows }], error: null }
  }

  if (action === 'delete') {
    const result = await dbQuery(`DELETE FROM \`${table}\`${where.sql}`, where.params)
    return { data: [{ affectedRows: result.affectedRows }], error: null }
  }

  if (action === 'rpc' && payload.rpcName === 'increment_reserved') {
    const { p_item_id, p_qty } = payload.rpcArgs || {}
    await dbQuery(
      'UPDATE bookstore_items SET reserved_quantity = COALESCE(reserved_quantity, 0) + ?, updated_at = NOW() WHERE item_id = ?',
      [p_qty, p_item_id]
    )
    return { data: true, error: null }
  }

  return { data: null, error: { message: `Unsupported action: ${action}` } }
}

class QueryBuilder {
  constructor(table) {
    this.payload = {
      table,
      action: 'select',
      columns: '*',
      filters: [],
      limit: null,
      offset: 0,
      count: null,
      orderBy: [],
      single: false,
    }
  }
  select(columns = '*', options = {}) { this.payload.columns = columns; this.payload.count = options.count || null; return this }
  insert(values) { this.payload.action = 'insert'; this.payload.values = values; return this }
  update(values) { this.payload.action = 'update'; this.payload.values = values; return this }
  delete() { this.payload.action = 'delete'; return this }
  eq(column, value) { this.payload.filters.push({ op: 'eq', column, value }); return this }
  neq(column, value) { this.payload.filters.push({ op: 'neq', column, value }); return this }
  gt(column, value) { this.payload.filters.push({ op: 'gt', column, value }); return this }
  gte(column, value) { this.payload.filters.push({ op: 'gte', column, value }); return this }
  lt(column, value) { this.payload.filters.push({ op: 'lt', column, value }); return this }
  lte(column, value) { this.payload.filters.push({ op: 'lte', column, value }); return this }
  like(column, value) { this.payload.filters.push({ op: 'like', column, value }); return this }
  ilike(column, value) { this.payload.filters.push({ op: 'ilike', column, value }); return this }
  in(column, value) { this.payload.filters.push({ op: 'in', column, value }); return this }
  is(column, value) { this.payload.filters.push({ op: 'is', column, value }); return this }
  not(column, operator, value) { this.payload.filters.push({ op: 'not', column, operator, value }); return this }
  or(expr) { this.payload.filters.push({ op: 'or', expr }); return this }
  order(column, opts = {}) { this.payload.orderBy.push({ column, ascending: opts.ascending !== false }); return this }
  limit(n) { this.payload.limit = n; return this }
  range(from, to) { this.payload.offset = from; this.payload.limit = to - from + 1; return this }
  single() { this.payload.single = true; return this }
  maybeSingle() { this.payload.single = true; return this }
  async execute() {
    const result = await executePayload(this.payload)
    if (this.payload.single) {
      const row = Array.isArray(result.data) ? (result.data[0] || null) : result.data
      return { ...result, data: row }
    }
    return result
  }
  then(resolve, reject) { return this.execute().then(resolve, reject) }
}

async function getServerSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value
  if (!token) return null
  const payload = verifySessionToken(token)
  if (!payload?.sub) return null
  return findUserByAuthId(payload.sub)
}

export function createServerCompatClient() {
  return {
    from(table) {
      return new QueryBuilder(table)
    },
    rpc(rpcName, rpcArgs) {
      return {
        then(resolve, reject) {
          executePayload({ action: 'rpc', rpcName, rpcArgs }).then(resolve, reject)
        },
      }
    },
    auth: {
      async getUser() {
        const user = await getServerSessionUser()
        return { data: { user: user ? { id: user.auth_id, email: user.email } : null }, error: null }
      },
      async getSession() {
        const user = await getServerSessionUser()
        return { data: { session: user ? { user: { id: user.auth_id, email: user.email } } : null }, error: null }
      },
    },
  }
}
