var os = require('os')
var assert = require('assert')
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

KnexStorage.prototype.logMigration = function (migrationName) {
  return insertEvent(this, 'up', migrationName)
}

KnexStorage.prototype.unlogMigration = function (migrationName) {
  return insertEvent(this, 'down', migrationName)
}

KnexStorage.prototype.executed = function () {
  return this
    .history()
    .then(toMigrationState(this.context))
}

KnexStorage.prototype.history = function () {
  var self = this
  return self.knex(self.tableName)
    .where('context', self.context)
    .orderBy('time', 'asc')
    .catch(function (err) {
      if (tableDoesNotExist(err, self.tableName)) return createMigrationTable(self)
      throw err
    })
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
    .createTable(storage.tableName, function (table) {
      table.dateTime('time')
      table.string('context')
      table.string('type')
      table.string('name')
      table.string('host')
      table.string('user')
    })
}

function toMigrationState (context) {
  return function (events) {
    if (!events) events = []

    function reducer (executed, event) {
      if (event.context !== context) return
      if (event.type === 'up') executed.push(event)
      else if (event.type === 'down') executed = executed.filter(function (e) { return e.name !== event.name })
      return executed
    }

    return events.reduce(reducer, []).map(function (e) { return e.name })
  }
}

function tableDoesNotExist (err, table) {
  // relation does not exist
  if (err.code === '42P01') return true
  if (new RegExp(`no such table: ${table}`).test(err.message)) return true
  return false
}
