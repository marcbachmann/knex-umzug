var os = require('os')
var assert = require('assert')

module.exports = KnexStorage

function KnexStorage (options) {
  this.context = options.storageOptions.context
  assert(this.context, new Error("The option 'options.storageOptions.context' is required."))

  this.knex = options.storageOptions.connection
  assert(typeof this.knex === 'function', new Error("The option 'options.storageOptions.connection' is required."))
}

KnexStorage.prototype.logMigration = function (migrationName) {
  return _event(this, 'up', migrationName)
}

KnexStorage.prototype.unlogMigration = function (migrationName) {
  return _event(this, 'down', migrationName)
}

KnexStorage.prototype.executed = function () {
  var self = this
  return self.knex('migrations')
    .where('context', self.context)
    .orderBy('time', 'asc')
    .catch(function (err) {
      if (tableDoesNotExist(err, 'migrations')) return createMigrationTable(self)
      throw err
    })
    .then(function (events) {
      return toMigrationState(self.context, events)
    })
}

function _event (storage, type, name) {
  return storage.knex('migrations').insert(createEvent(storage.context, type, name))
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
    .createTable('migrations', function (table) {
      table.dateTime('time')
      table.string('context')
      table.string('type')
      table.string('name')
      table.string('host')
      table.string('user')
    })
    .then(ensureBackwardsCompatibility(storage))
}

// Sorry for that custom logic, it's needed for
// a migration of our legacy migration table.
// I'll remove that in one of the next minor releases
function ensureBackwardsCompatibility (storage) {
  return function () {
    return storage.knex('system')
    .where('key', 'migration')
    .first()
    .then(function (row) {
      if (!row) return []
      return JSON.parse(row.value).migrations
    })
    .then(function (migrations) {
      migrations = (migrations || []).map(function (m, i) {
        var evt = createEvent(storage.context, 'up', m.title)
        evt.time.setMilliseconds(i) // events get ordered by insert date
        return evt
      })
      return storage.knex('migrations').insert(migrations).return(migrations)
    })
    .catch(function (err) {
      if (tableDoesNotExist(err, 'system')) return []
      throw err
    })
  }
}

function toMigrationState (context, events) {
  if (!events) events = []

  function reducer (executed, event) {
    if (event.context !== context) return
    if (event.type === 'up') executed.push(event)
    else if (event.type === 'down') executed = executed.filter(function (e) { return e.name !== event.name })
    return executed
  }

  return events.reduce(reducer, []).map(function (e) { return e.name })
}

function tableDoesNotExist (err, table) {
  if (new RegExp(`relation "${table}" does not exist`).test(err.message)) return true
  else if (new RegExp(`no such table: ${table}`).test(err.message)) return true
  return false
}
