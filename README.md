# knex-umzug

[![Greenkeeper badge](https://badges.greenkeeper.io/marcbachmann/knex-umzug.svg)](https://greenkeeper.io/)

A storage adapter for umzug, a database migration library.

It supports namespacing and custom database table names.
This storage adapter not only shows you the current state of a migration but also shows all the migration paths and tracks hostname and system user which executed a migration.

This library only makes `knex` work with `umzug`.
Please check out the umzug api for more details: https://www.npmjs.com/package/umzug#api

Umzug v3:
```js
const {Umzug} = require('umzug')
const knex = require('knex')
const KnexUmzug = require('knex-umzug')

const db = require('knex')({
  client: 'sqlite3',
  connection: {filename: './db.sql'}
})

const umzug = new Umzug({
  storage: new KnexUmzug({
    // The context allows you to reuse the same migrations table
    // to maintain the state for multiple isolated migration setups.
    // e.g. 'upstream', 'downstream'
    context: 'default',
    connection: db,
    tableName: 'migrations'
  })
})

umzug.up().then(function (result) {

})
```

Umzug v2:
```js
const Umzug = require('umzug')
const db = require('knex')({
    client: 'sqlite3',
    connection: {filename: './db.sql'}
})

const umzug = new Umzug({
    storage: 'knex-umzug',
    storageOptions: {
      // The context allows you to reuse the same migrations table
      // to maintain the state for multiple isolated migration setups.
      // e.g. 'upstream', 'downstream'
      context: 'default',
      connection: db,
      tableName: 'migrations'
    }
})

umzug.up().then(function (result) {

})
```
