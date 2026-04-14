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
    const response = await fetch('/api/mysql/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(this.payload),
    })
    const result = await response.json()
    if (this.payload.single) {
      const row = Array.isArray(result.data) ? (result.data[0] || null) : result.data
      return { ...result, data: row }
    }
    return result
  }
  then(resolve, reject) { return this.execute().then(resolve, reject) }
}

function buildBrowserAuth() {
  const emit = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('booksmart-auth-changed')) }
  const post = async (action, body = {}) => {
    const res = await fetch(`/api/mysql/auth/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }
  return {
    async signInWithPassword({ email, password }) {
      const result = await post('login', { email, password })
      if (!result.error) emit()
      return result
    },
    async signUp({ email, password, options = {} }) {
      const result = await post('register', { email, password, ...options.data })
      if (!result.error) emit()
      return result
    },
    async signOut() {
      const result = await post('logout')
      emit()
      return result
    },
    async getSession() { return post('session') },
    async getUser() { return post('user') },
    async updateUser({ password }) { return post('update-password', { password }) },
    async resetPasswordForEmail() {
      return { data: { message: 'If the email exists, a reset flow is available from the reset page.' }, error: null }
    },
    onAuthStateChange(callback) {
      let unsubscribed = false
      const listener = async () => {
        if (unsubscribed) return
        const session = await post('session')
        callback('SIGNED_IN', session.data?.session || null)
      }
      if (typeof window !== 'undefined') window.addEventListener('booksmart-auth-changed', listener)
      listener()
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              unsubscribed = true
              if (typeof window !== 'undefined') window.removeEventListener('booksmart-auth-changed', listener)
            },
          },
        },
      }
    },
  }
}

export function createBrowserCompatClient() {
  return {
    from(table) {
      return new QueryBuilder(table)
    },
    rpc(rpcName, rpcArgs) {
      return {
        then(resolve, reject) {
          return fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'rpc', rpcName, rpcArgs }),
          }).then(r => r.json()).then(resolve, reject)
        },
      }
    },
    auth: buildBrowserAuth(),
    channel() {
      const channel = {
        on() { return channel },
        subscribe() { return channel },
        unsubscribe() {},
      }
      return channel
    },
    removeChannel() {},
  }
}
