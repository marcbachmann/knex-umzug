'use strict'
var test = require('tape')
var Storage = require('./storage')
var knex = require('knex')
var dbPath = './test.sqlite'
var knexConnection = knex({client: 'sqlite3', connection: {filename: dbPath}, useNullAsDefault: true})
var storageOpts = {storageOptions: {connection: knexConnection, context: 'foo'}}
deleteDatabase()

test.onFinish(function () {
  knexConnection.destroy()
  deleteDatabase()
})

test('constructor', function (t) {
  t.plan(5)

  t.test('needs a context and knex connection', function (t) {
    t.plan(3)
    t.throws(() => new Storage())
    t.throws(() => new Storage({storageOptions: {context: undefined}}), /The option 'options.storageOptions.connection' is required./)
    t.doesNotThrow(() => new Storage({storageOptions: {context: 'foo', connection: knexConnection}}))
  })

  t.test('sets a default context', function (t) {
    t.plan(1)
    var storage = new Storage({storageOptions: {connection: knexConnection}})
    t.equal(storage.context, 'default')
  })

  t.test('allows a custom context', function (t) {
    t.plan(1)
    var storage = new Storage({storageOptions: {connection: knexConnection, context: 'foo'}})
    t.equal(storage.context, 'foo')
  })

  t.test('sets the tableName to "migrations"', function (t) {
    t.plan(1)
    var storage = new Storage({storageOptions: {connection: knexConnection, context: 'foo'}})
    t.equal(storage.tableName, 'migrations')
  })

  t.test('allows a custom tableName', function (t) {
    t.plan(1)
    var storage = new Storage({storageOptions: {connection: knexConnection, tableName: 'foo'}})
    t.equal(storage.tableName, 'foo')
  })
})

test('executed', function (t) {
  t.plan(1)
  t.test('returns an empty array on first run', function (t) {
    t.plan(2)

    var storage = new Storage(storageOpts)
    storage.executed()
    .then(function (migrations) {
      t.ok(Array.isArray(migrations))
      t.equal(migrations.length, 0)
    })
    .catch(t.notOk)
  })
})

test('logMigration', function (t) {
  t.plan(4)

  t.test('is a function', function (t) {
    t.plan(1)
    var storage = new Storage(storageOpts)
    t.equal(typeof storage.logMigration, 'function')
  })

  t.test('accepts the logMigration call', function (t) {
    t.plan(1)

    var storage = new Storage(storageOpts)
    storage.executed()
    .then(logMigration(storage, '1-first'))
    .then(t.ok)
    .catch(t.notOk)
  })

  t.test('lists logged migrations using .executed', function (t) {
    t.plan(1)

    var storage = new Storage(storageOpts)
    storage.executed()
    .then(logMigration(storage, '2-second'))
    .then(function () {
      return storage.executed().then(function (migrations) {
        t.equal(migrations[migrations.length - 1], '2-second')
      })
    })
    .catch(t.notOk)
  })

  t.test('respects the log order', function (t) {
    t.plan(2)

    var storage = new Storage(storageOpts)
    storage.executed()
    .then(logMigration(storage, 'b'))
    .then(logMigration(storage, 'a'))
    .then(function () {
      return storage.executed().then(function (migrations) {
        t.equal(migrations[migrations.length - 2], 'b')
        t.equal(migrations[migrations.length - 1], 'a')
      })
    })
    .catch(t.notOk)
  })
})

test('unlogMigration', function (t) {
  t.plan(2)

  t.test('removes a logged migration from the executed ones', function (t) {
    t.plan(3)

    var storage = new Storage(storageOpts)
    storage.executed()
    .then(logMigration(storage, 'unlogTest'))
    .then(function () {
      return storage.executed().then(function (migrations) {
        t.equal(migrations[migrations.length - 1], 'unlogTest')
      })
    })
    .then(unlogMigration(storage, 'unlogTest'))
    .then(function () {
      return storage.executed().then(function (migrations) {
        t.notEqual(migrations[migrations.length - 1], 'unlogTest')
        t.notEqual(migrations[migrations.length - 2], 'unlogTest')
      })
    })
    .catch(t.notOk)
  })

  t.test('deletes only the unlogged migration', function (t) {
    t.plan(2)

    var storage = new Storage(storageOpts)
    var totalMigrations = 0

    storage.executed()
    .then(function (migrations) {
      totalMigrations = migrations.length
    })
    .then(logMigration(storage, 'unlog-first'))
    .then(logMigration(storage, 'unlog-second'))
    .then(unlogMigration(storage, 'unlog-second'))
    .then(storage.executed.bind(storage))
    .then(function (migrations) {
      t.equal(migrations.length, totalMigrations + 1)
      t.equal(migrations[migrations.length - 1], 'unlog-first')
    })
    .catch(t.notOk)
  })
})

function deleteDatabase () {
  try {
    require('fs').unlinkSync(dbPath)
  } catch (err) {}
}

function logMigration (storage, name) {
  return function () {
    return storage.logMigration(name)
  }
}

function unlogMigration (storage, name) {
  return function () {
    return storage.unlogMigration(name)
  }
}
