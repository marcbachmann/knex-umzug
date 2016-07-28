# knex-umzug

A storage adapter for [umzug](npm.im/umzug), a database migration library.

It supports namespacing and custom database table names.
This storage adapter not only shows you the current state of a migration but also shows all the migration paths and tracks hostname and system user which executed a migration.

A cli wrapper will follow soon.

```js
var Umzug = require('umzug')
var db = require('knex')({
    client: 'sqlite3',
    connection: {filename: './db.sql'}
})

var umzug = new Umzug({
    storage: 'knex-umzug',
    storageOptions: {
      context: 'default',
      connection: db,
      tableName: 'migrations'
    }

// check out the umzug api: https://www.npmjs.com/package/umzug#api
umzug.someMethod().then(function (result) {

})
```
