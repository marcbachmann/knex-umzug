'use strict'
const test = require('tape')
const Storage = require('./storage')
const knex = require('knex')
const dbPath = './test.sqlite'
const knexConnection = knex({ client: 'sqlite3', connection: { filename: dbPath }, useNullAsDefault: true })
const storageOpts = { connection: knexConnection, context: 'foo' }
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
    t.throws(() => new Storage({ context: undefined }), /The option 'options.connection' is required./)
    t.doesNotThrow(() => new Storage({ context: 'foo', connection: knexConnection }))
  })

  t.test('sets a default context', function (t) {
    t.plan(1)
    const storage = new Storage({ connection: knexConnection })
    t.equal(storage.context, 'default')
  })

  t.test('allows a custom context', function (t) {
    t.plan(1)
    const storage = new Storage({ connection: knexConnection, context: 'foo' })
    t.equal(storage.context, 'foo')
  })

  t.test('sets the tableName to "migrations"', function (t) {
    t.plan(1)
    const storage = new Storage({ connection: knexConnection, context: 'foo' })
    t.equal(storage.tableName, 'migrations')
  })

  t.test('allows a custom tableName', function (t) {
    t.plan(1)
    const storage = new Storage({ connection: knexConnection, tableName: 'foo' })
    t.equal(storage.tableName, 'foo')
  })
})

test('executed', function (t) {
  t.plan(1)
  t.test('returns an empty array on first run', function (t) {
    t.plan(2)

    const storage = new Storage(storageOpts)
    storage.executed()
      .then(function (migrations) {
        t.ok(Array.isArray(migrations))
        t.equal(migrations.length, 0)
      })
      .catch(t.notOk)
  })
})

test('logMigration', function (t) {
  t.plan(6)

  t.test('is a function', function (t) {
    t.plan(1)
    const storage = new Storage(storageOpts)
    t.equal(typeof storage.logMigration, 'function')
  })

  t.test('throws on invalid parameter', function (t) {
    t.plan(1)

    const storage = new Storage(storageOpts)
    storage.executed()
      .then(logMigration(storage, { foo: '1-first' }))
      .then(t.notOk)
      .catch(t.ok)
  })

  t.test('accepts the legacy logMigration call', function (t) {
    t.plan(1)

    const storage = new Storage(storageOpts)
    storage.executed()
      .then(logMigration(storage, '1-first'))
      .then(t.ok)
      .catch(t.notOk)
  })

  t.test('accepts the logMigration call', function (t) {
    t.plan(1)

    const storage = new Storage(storageOpts)
    storage.executed()
      .then(logMigration(storage, { name: '1-first' }))
      .then(t.ok)
      .catch(t.notOk)
  })

  t.test('lists logged migrations using .executed', function (t) {
    t.plan(1)

    const storage = new Storage(storageOpts)
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

    const storage = new Storage(storageOpts)
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

    const storage = new Storage(storageOpts)
    storage.executed()
      .then(logMigration(storage, { name: 'unlogTest' }))
      .then(function () {
        return storage.executed().then(function (migrations) {
          t.equal(migrations[migrations.length - 1], 'unlogTest')
        })
      })
      .then(unlogMigration(storage, { name: 'unlogTest' }))
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

    const storage = new Storage(storageOpts)
    let totalMigrations = 0

    storage.executed()
      .then(function (migrations) {
        totalMigrations = migrations.length
      })
      .then(logMigration(storage, { name: 'unlog-first' }))
      .then(logMigration(storage, { name: 'unlog-second' }))
      .then(unlogMigration(storage, { name: 'unlog-second' }))
      .then(storage.executed.bind(storage))
      .then(function (migrations) {
        t.equal(migrations.length, totalMigrations + 1)
        t.equal(migrations[migrations.length - 1], 'unlog-first')
      })
      .catch(t.notOk)
  })
})

test('history', function (t) {
  t.plan(11)
  const opts = Object.assign({}, storageOpts, { context: 'history-test' })

  const storage = new Storage(opts)
  storage.logMigration({ name: 'first' })
    .then(logMigration(storage, { name: 'second' }))
    .then(logMigration(storage, { name: 'third' }))
    .then(unlogMigration(storage, { name: 'third' }))
    .then(logMigration(storage, { name: 'fourth' }))

    .then(storage.history.bind(storage))
    .then(function (history) {
      t.ok(Array.isArray(history), 'history must be an array')
      t.equals(history[0].name, 'first')
      t.equals(history[0].type, 'up')

      t.equals(history[1].name, 'second')
      t.equals(history[1].type, 'up')

      t.equals(history[2].name, 'third')
      t.equals(history[2].type, 'up')

      t.equals(history[3].name, 'third')
      t.equals(history[3].type, 'down')

      t.equals(history[4].name, 'fourth')
      t.equals(history[4].type, 'up')
    })
})

function deleteDatabase () {
  try {
    require('fs').unlinkSync(dbPath)
  } catch (err) {}
}

function logMigration (storage, opts) {
  return function () {
    return storage.logMigration(opts)
  }
}

function unlogMigration (storage, opts) {
  return function () {
    return storage.unlogMigration(opts)
  }
}
