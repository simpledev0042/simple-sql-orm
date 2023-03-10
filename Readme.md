# Simple SQL ORM

## let use ORM with node.js

### - Install
```
npm install simple-sql-orm
```

### - Learn More

#### 1. Create Object

```
const { ORM } = require("simple-sql-orm")
let orm = new ORM("localhost", "dbname")
```

#### 2. Methods
##### constructor
```
ORM(host, db, user="root", password="", port = 3306)
```
```
let orm = new ORM("localhost", "mydb", 'root', "mypass", 3306)
```
##### table
```
orm.table("users").get()
```
```
SELECT * FROM `users`
```
return data rows

##### where
```
orm.table("users").where("id", '5').get()
```
```
SELECT * FROM `users` WHERE `users`.`id` = 5
```
```
orm.table("users").where("id", ['5', '6']).get()
```
```
SELECT * FROM `users` WHERE `users`.`id` IN ('5', '6')
```

return data rows

##### select
```
orm.table("users").select("id", "name", ["username", "um"]).get()
```
```
SELECT `users`.`id`, `users`.`name`, `users`.`username` AS `um` FROM `users`
```
return data rows

##### count
```
orm.table("users").select("id", "name").count()
```
```
SELECT COUNT(*) AS cnt FROM `users`
```
return count result

##### delete
```
orm.table("users").where("id", 5).delete()
```
```
DELETE FROM `users` WHERE `users`.`id` = '5'
```
return count deleted

##### orderBy
```
orm.table("users").where("id", 5).orderBy('id', 'asc').get()
```
```
SELECT * FROM `users` WHERE `users`.`id` = '5' ORDER BY `users`.`id` ASC
```
return data rows

##### groupBy
```
orm.table("users").where("id", 5).groupBy('first_name').get()
```
```
SELECT * FROM `users` WHERE `users`.`id` = '5' GROUP BY `users`.`id`
```
return data rows

##### skip take
```
orm.table("users").skip(10).take(10).get()
```
```
SELECT * FROM `users` LIMIT 10, 10
```
return data rows from 11th to 20th
##### min, max, avg, sum
```
orm.table("users").max('id')
```
```
orm.table("users").min('id')
```
```
orm.table("users").avg('id')
```
```
orm.table("users").sum('id')
```
```
SELECT MAX(`users`.`id`) AS RES FROM `users`
```

return value of RES

#### raw query
```
{ ORM, QueryTypes } = require("simple-sql-orm")
let orm = new ORM("localhost", "simply")
const result = orm.query("SELECT * FROM `users`");
const result = orm.query("SELECT * FROM `users`", QueryTypes.SELECT);

```

## Examples

### Seprated query
````
let orm = new ORM("localhost", "simply")
orm.table("users");
const userids = ['simple', "orm"];
const len = userids.length;
for(let i = 0; i < len; i ++) {
    orm.orWhere("userid", userids[i]);
} 
const res = orm.get();
````
```
SELECT `users`.* FROM `users` WHERE `users`.`userid` = 'simple' OR `users`.`userid` = 'orm'
```

### Where
```
orm.table("users").where("firstname", "simple").and(ORM.where("id", 1, ">").where("id", 5, "<")).get()
```
```
SELECT `users`.* FROM `users` WHERE `users`.`firstname` = 'simple' AND (`users`.`id` > '1' AND `users`.`id` < '5')
```