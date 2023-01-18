# Simple SQL ORM

#### - Install

## npm install simple-sql-orm

#### - Learn More

### 1. Create Object

## const { ORM } = require("simple-sql-orm")

## let orm = new ORM("localhost", "dbname")

### 2. Methods
### constructor
#### args
host, db, user="root", password="", port = 3306

#### example

##### let orm = new ORM("localhost", "mydb", 'root', "mypass", 3306)

### table
orm.table("users").get()

SELECT * FROM `users`

return data rows

### where
orm.table("users").where("id", '5').get()

SELECT COUNT(*) AS cnt FROM `users` WHERE `users`.`id` = 5

return count result

### select
orm.table("users").select("id", "name").get()

SELECT `users`.`id`, `users`.`name` FROM `users`

return data rows

### count
orm.table("users").select("id", "name").count()

SELECT COUNT(*) AS cnt FROM `users`

return count result

### delete
orm.table("users").where("id", 5).delete()

DELETE FROM `users` WHERE `users`.`id` = '5'

return count result