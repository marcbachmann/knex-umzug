const os = require('os')
const assert = require('assert')
function isString (s) { return typeof s === 'string' }

module.exports = KnexStorage

function KnexStorage (options) {
  this.tableName = options.tableName || 'migrations'
  this.context = options.context || 'default'
  this.knex = options.connection
  assert(isString(this.tableName), "The option 'options.tableName' is required.")
  assert(isString(this.context), "The option 'options.context' is required.")
  assert(this.knex, "The option 'options.connection' is required.")
}

KnexStorage.prototype.logMigration = async function (opts) {
  const name = typeof opts === 'object' ? opts.name : opts
  assert(typeof name === 'string', 'The parameter \'name\' must be a string.')
  return insertEvent(this, 'up', name)
}

KnexStorage.prototype.unlogMigration = async function (opts) {
  const name = typeof opts === 'object' ? opts.name : opts
  assert(typeof name === 'string', 'The parameter \'name\' must be a string.')
  return insertEvent(this, 'down', name)
}

KnexStorage.prototype.executed = async function () {
  return toMigrationState(this.context, await this.history())
}

KnexStorage.prototype.history = async function () {
  try {
    const events = await this.knex(this.tableName)
      .where('context', this.context)
      .orderBy('time', 'asc')

    // Add the missing primary key for older setups
    if (events.length && events[0].id === undefined) {
      await this.knex.raw('ALTER TABLE migrations ADD COLUMN id SERIAL PRIMARY KEY;')
    }

    return events
  } catch (err) {
    if (!tableDoesNotExist(err, this.tableName)) throw err
    await createMigrationTable(this)
    return []
  }
}

function insertEvent (storage, type, name) {
  return storage.knex(storage.tableName).insert(createEvent(storage.context, type, name))
}

function createEvent (context, type, name) {
  return {
    time: new Date(),
    context: context,
    type: type,
    name: name,
    host: os.hostname(),
    user: process.env.USER
  }
}

function createMigrationTable (storage) {
  return storage
    .knex
    .schema
    .createTable(storage.tableName, function (t) {
      t.increments('id').primary()
      t.dateTime('time')
      t.string('context')
      t.string('type')
      t.string('name')
      t.string('host')
      t.string('user')
    })
}

function toMigrationState (context, events) {
  if (!events) events = []

  const state = new Set()
  for (const event of events) {
    if (event.context !== context) continue
    if (event.type === 'up') state.add(event.name)
    else state.delete(event.name)
  }

  return Array.from(state)
}

function tableDoesNotExist (err, table) {
  // relation does not exist
  if (err.code === '42P01') return true
  if (new RegExp(`no such table: ${table}`).test(err.message)) return true
  return false
}
