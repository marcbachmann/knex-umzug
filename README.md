# knex-umzug

[![Greenkeeper badge](https://badges.greenkeeper.io/marcbachmann/knex-umzug.svg)](https://greenkeeper.io/)

A storage adapter for umzug, a database migration library.

It supports namespacing and custom database table names.
This storage adapter not only shows you the current state of a migration but also shows all the migration paths and tracks hostname and system user which executed a migration.

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
})

umzug.someMethod().then(function (result) {

})
```

Please check out the umzug api: https://www.npmjs.com/package/umzug#api
A cli that adds additional functionality will follow soon.
