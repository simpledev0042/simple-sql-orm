const { Sequelize, QueryTypes } = require("sequelize")
const Lib = require("simple-libs")

class WhereCondition{
    conditions
    constructor(){
        this.conditions = []
    }
    
    where(col, value, operator = '=') {
        if( col == -1 ) console.warn(`Bad Col name!`, col)
        else {
            if(value instanceof Array){
                operator = "IN"
                value = `(${value.map(val => `'${val}'`).join(", ")})`
            } 
            this.conditions.push({
                data : {
                    col,
                    value,
                    operator
                },
                andOr : ORM.CONDITION_AND,
                type : ORM.CONDITION_CONDITION
            })
        }
        return this
    }
    
    orWhere(col, value, operator = '=') {
        if( col == -1 ) console.warn(`Bad Col name!`, col)
        else {
            if(value instanceof Array){
                operator = "IN"
                value = `(${value.map(val => `'${val}'`).join(", ")})`
            } 
            this.conditions.push({
                data : {
                    col,
                    value,
                    operator
                },
                andOr : ORM.CONDITION_AND,
                type : ORM.CONDITION_CONDITION
            })
        }
        return this
    }
}

class ORM {
    #whereConditions
    #selectedCols
    #orders
    #groupBy
    #limit
    #offset

    static CONDITION_AND        = 'CONDITION_AND'
    static CONDITION_OR         = 'CONDITION_OR'
    static CONDITION_GROUP      = 'CONDITION_GROUP'
    static CONDITION_CONDITION  = 'CONDITION_CONDITION'

    constructor(host, db, user="root", password="", port = 3306){
        this.host = host
        this.db = db
        this.user = user
        this.port = port

        this.tableName = ""
        this.#whereConditions = []
        this.#selectedCols = [] // ["tablename.col", "tablename.col"...]
        this.#orders = []
        this.#groupBy = ""
        this.queryType = QueryTypes.RAW
        this.#init()
        this.sequelize = new Sequelize(db, user, password, {
            host: host,
            port: port,
            dialect: "mysql"
        });
    }

    async test() {
        let res = await this.sequelize.query("SELECT * FROM users", QueryTypes.SELECT)
    }

    #init() {
        this.tableName = ""
        while( this.#whereConditions.length ) this.#whereConditions.pop()
        while( this.#selectedCols.length ) this.#selectedCols.pop();
        while( this.#orders.length ) this.#orders.pop();
        this.#groupBy = ""
        this.tableName = ""
        this.#limit = -1
        this.#offset = -1
    }
    /**
     * 
     * @param {Array} conditions 
     * @returns String
     */
    getWhereConditionString( conditions = [] ){
        let n = conditions.length
        let res = ''
        for (let i = 0; i < n; i++) {
            const element = conditions[i];
            if( i ) {
                if( element.andOr == ORM.CONDITION_AND ) res += " AND "
                else res += " OR "
            }
            if(element.type == ORM.CONDITION_GROUP && element.conditions.length){
                res += "("
                res += this.getWhereConditionString(element.conditions)
                res += ")"
            }
            else {
                if( element.data.operator == 'IN' ) {
                    res += this.getColFullName(element.data.col) + " " + element.data.operator + " " + element.data.value
                }
                else {
                    element.data.value = String(element.data.value).replace("'", "\\'")
                    res += this.getColFullName(element.data.col) + " " + element.data.operator + " " + "'" + element.data.value + "'"
                }
                
            }
        }
        return res
    }

    /**
     * 
     * @returns String
     */

    getWhereString(){
        let whereString = this.getWhereConditionString(this.#whereConditions)
        if( whereString.trim().length ) return " WHERE " + whereString
        return ''
    }
    /**
     * 
     * @param {Array} selects 
     */
    getSelectString(selects){
        let res = 'SELECT '
        let n = selects.length
        for (let i = 0; i < n; i++) {
            if( i ) res += ", "
            const element = selects[i];
            if( element instanceof Array ) {
                if( element.length == 2 ) {
                    res += `${this.getColFullName(element[0])} AS \`${element[1]}\``
                }
                
            }
            else res += this.getColFullName(element)
        }
        if( n == 0 ) res += this.getColFullName("*")
        return res
    }
    /**
     * 
     * @param {Object} insert 
     */
    getInsertString(insert = {}) {
        let res = ''
        let colString = ''
        let valueString = ''
        let isFirst = true
        for (const key in insert) {
            if (Object.hasOwnProperty.call(insert, key)) {
              const value = insert[key]
              if (isFirst) {
                colString += ' ('
                valueString += ' VALUES ('
              } else {
                colString += ', '
                valueString += ', '
              }
              colString += this.getColFullName(key)
              valueString += `'${String(value).replace("'", "\\'")}'`
              isFirst = false
            }
        }
        if( isFirst == false ) {
            colString += ')'
            valueString += ')'
        }
        res = colString + valueString
        return res
    }
    /**
     * 
     * @param {Object} update 
     * @returns String
     */
    getUpdateString(update){
        let res = ''
        let isFirst = true
        for (const key in update) {
            if (Object.hasOwnProperty.call(update, key)) {
                const value = update[key]
                if (isFirst) res += " SET "
                else res += ", "
                res += this.getColFullName(key) + " = " + "'"+String(value).replace("'", "\\'")+"'"
                isFirst = false
            }
        }
        return res
    }

    /**
     * 
     * @returns String
     */

    getOrderByString(){
        let res = ''
        for (let i = 0; i < this.#orders.length; i++) {
            const element = this.#orders[i];
            if(i == 0) res += " ORDER BY "
            else res += ", "
            res += this.getColFullName(element.col)
            res += " "
            res += element.dir.toUpperCase()
        }
        return res
    }

    getGroupByString(){
        if( this.#groupBy && typeof this.#groupBy == 'string' && this.#groupBy.length ) {
            return " GROUP BY " + this.getColFullName( this.#groupBy )
        }
        return ''
    }

    /**
     * 
     * @param {String} str tableName.column
     */
    getColFullName( str ) {
        let res = -1;
        str = str.trim()
        const arr = str.split(".")
        if( arr.length == 1 ) {
            let col = arr[0].trim()
            if( col != "*" ) col = '`'+Lib.String.removeSpecialChars(col).trim()+'`'
            res = '`'+this.tableName+'`.'+col
        }
        else if( arr.length == 2 ) {
            let tbName = Lib.String.removeSpecialChars(arr[0]).trim()
            let col = arr[1].trim();
            if(col != '*') col = '`'+Lib.String.removeSpecialChars(arr[1]).trim()+'`'
            res = '`'+tbName+'`.'+col
        }
        return res
    }
    /**
     * 
     * @param {String} tableName 
     * @returns ORM
     */
    table( tableName ) {
        this.#init()
        this.tableName = Lib.String.removeSpecialChars(tableName).trim()
        return this
    }
    
    /**
     * Select columns like "SELECT id, firstName"
     * @param {String[]} cols Col String array Ex. select("id", "firstName", "users.email")
     * @returns ORM
     */

    select() {
        const len = arguments.length
        this.queryType = QueryTypes.SELECT
        for (let i = 0; i < len; i++) {
            const element = arguments[i];
            if(element instanceof Array) {
                if( element.length == 2 ) this.#selectedCols.push( element )
                else console.warn(`Bad Col name!`, element)
            }
            else {
                let fullName = this.getColFullName(element)
                if( fullName == -1 ) console.warn(`Bad Col name!`, element)
                else this.#selectedCols.push( element )
            }
            
        }
        return this
    }

    /**
     * Add Where Condition like "WHERE `col` = `value`"
     * @param {String} col id
     * @param {String} operator =, >, <, >=, <=, <>, BETWEEN, LIKE, IN
     * @param {String Integer} value 14
     * @returns ORM
     */
    where(col, value, operator = '=') {
        if( col == -1 ) console.warn(`Bad Col name!`, col)
        else {
            if(value instanceof Array){
                operator = "IN"
                value = `(${value.map(val => `'${val}'`).join(", ")})`
            } 
            this.#whereConditions.push({
                data : {
                    col,
                    value,
                    operator,
                },
                type : ORM.CONDITION_CONDITION,
                andOr : ORM.CONDITION_AND
            })
        }
        return this
    }

    /**
     * Add Where Condition like "OR WHERE `col` = `value`"
     * @param {String} col id
     * @param {String} operator =, >, <, >=, <=, <>, BETWEEN, LIKE, IN
     * @param {String Integer} value 14
     * @returns ORM
     */
    orWhere(col, value, operator = '='){
        if( col == -1 ) console.warn(`Bad Col name!`, col)
        else {
            if(value instanceof Array){
                operator = "IN"
                value = `(${value.map(val => `'${val}'`).join(", ")})`
            } 
            this.#whereConditions.push({
                data : {
                    col,
                    value,
                    operator,
                },
                type : ORM.CONDITION_CONDITION,
                andOr : ORM.CONDITION_OR
            })
        }
        return this
    }
    /**
     * 
     * @param {String} col 
     * @param {String Integer} value 
     * @param {String} operator  =, >, <, >=, <=, <>, BETWEEN, LIKE, IN
     * @returns WhereCondition
     */
    static Where(col, value, operator = '=') {
        let condition = new WhereCondition()
        if( col == -1 ) console.warn(`Bad Col name!`, col)
        else {
            if(value instanceof Array){
                operator = "IN"
                value = `(${value.map(val => `'${val}'`).join(", ")})`
            } 
            condition.conditions.push({
                data : {
                    col,
                    value,
                    operator,
                },
                type : ORM.CONDITION_CONDITION,
                andOr : ORM.CONDITION_AND
            })
        }
        return condition
    }

    /**
     * 
     * @param {WhereCondition} whereCondition 
     */

    and( whereCondition = new WhereCondition() ){
        if(whereCondition.conditions.length){
            this.#whereConditions.push({
                conditions : whereCondition.conditions,
                type : ORM.CONDITION_GROUP,
                andOr : ORM.CONDITION_AND
            })
        }    
        return this
    }

    /**
     * 
     * @param {WhereCondition} whereCondition 
     */

    or( whereCondition = new WhereCondition() ){
        if(whereCondition.conditions.length){
            this.#whereConditions.push({
                conditions : whereCondition.conditions,
                type : ORM.CONDITION_GROUP,
                andOr : ORM.CONDITION_OR
            })
        }    
        return this
    }
    /**
     * 
     * @returns Array Records
     */
    async get() {
        let query = this.getSelectString(this.#selectedCols)
        query += " FROM " + "`"+this.tableName+"`"
        query += this.getWhereString(this.#whereConditions)
        query += this.getGroupByString()
        query += this.getOrderByString()
        query += this.getLimitString()
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0]
    }
    /**
     * 
     * @returns Integer Deleted row count
     */
    async delete(){
        let whereString = this.getWhereString()
        let query = "DELETE "
        query += " FROM " + "`"+this.tableName+"`"
        if( whereString.trim().length ) query += " WHERE " + whereString
        let res = await this.sequelize.query(query, QueryTypes.DELETE);
        return res[0].affectedRows
    }

    /**
     * 
     * @returns Integer row count
     */
    async count(){
        let query = "SELECT COUNT(*) "
        query += " FROM " + "`"+this.tableName+"`"
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0].affectedRows
    }
    /**
     * Update recods
     * @param {Array} insert 
     * @returns updated row count
     */
    async insert(insert){
        let query = "INSERT INTO " + "`"+this.tableName+"`"
        let insertstring = " " + this.getInsertString(insert)
        query += insertstring
        let res = await this.sequelize.query(query, QueryTypes.INSERT);
        return {
            totalRow: res[0],
            inserted: res[1]
        }
    }
    /**
     * update matching rows and return updated row count
     * @param {Object} update {first_name : "black"}
     * @returns Integer changedRow count
     */
    async update(update) {
        let query = "UPDATE " + "`"+this.tableName+"`"
        let updateString = this.getUpdateString(update)
        query += updateString
        query += this.getWhereString()
        // return query
        let res = await this.sequelize.query(query, QueryTypes.UPDATE);
        return res[0].changedRows
    }

    /**
     * 
     * @param {String} col Ex. 'id'
     * @param {String} dir Ex. 'asc' | 'desc'
     * @returns ORM
     */
    orderBy(col = 'id', dir = 'asc'){
        this.#orders.push({
            col,
            dir
        })
        return this
    }

    /**
     * 
     * @param {String} col Ex. 'first_name'
     * @returns ORM
     */

    groupBy(col) {
        this.#groupBy = col
        return this
    }

    /**
     * limit select records
     * @param {Number} n number of record
     */
    take(n = 10) {
        this.#limit = n
        return this
    }

    /**
     * skip n of rows
     * @param {Number} n number of skip
     */
    skip(n = 0) {
        this.#offset = n
        return this
    }

    getLimitString() {
        if( this.#limit >= 0 && this.#offset >= 0 ) {
            return ` LIMIT ${this.#offset}, ${this.#limit} `
        }
        else if( this.#limit >= 0 ) {
            return ` LIMIT ${this.#offset} `
        }
        else return ''
    }
    
    async max(col) {
        let query = `SELECT MAX(${this.getColFullName(col)}) AS RES `
        query += " FROM " + "`"+this.tableName+"`"
        query += this.getWhereString()
        query += this.getGroupByString()
        query += this.getOrderByString()
        query += this.getLimitString()
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0][0]["RES"]
    }
    
    async min(col) {
        let query = `SELECT MIN(${this.getColFullName(col)}) AS RES `
        query += " FROM " + "`"+this.tableName+"`"
        query += this.getWhereString()
        query += this.getGroupByString()
        query += this.getOrderByString()
        query += this.getLimitString()
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0][0]["RES"]
    }
    
    async avg(col) {
        let query = `SELECT AVG(${this.getColFullName(col)}) AS RES `
        query += " FROM " + "`"+this.tableName+"`"
        query += this.getWhereString()
        query += this.getGroupByString()
        query += this.getOrderByString()
        query += this.getLimitString()
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0][0]["RES"]
    }
    
    async sum(col) {
        let query = `SELECT SUM(${this.getColFullName(col)}) AS RES `
        query += " FROM " + "`"+this.tableName+"`"
        query += this.getWhereString()
        query += this.getGroupByString()
        query += this.getOrderByString()
        query += this.getLimitString()
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0][0]["RES"]
    }
}

module.exports = { ORM }