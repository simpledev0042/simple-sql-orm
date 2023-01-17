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

export default class ORM {
    #whereConditions
    #selectedCols

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
        this.queryType = QueryTypes.RAW

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
                element.data.value = String(element.data.value).replace("'", "\\'")
                res += this.getColFullName(element.data.col) + " " + element.data.operator + " " + "'" + element.data.value + "'"
            }
        }
        return res
    }
    /**
     * 
     * @param {Array} selects 
     */
    getSelectString(selects){
        let res = ''
        let n = selects.length
        for (let i = 0; i < n; i++) {
            if( i ) res += ", "
            const element = selects[i];
            res += this.getColFullName(element)
        }
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
     * @param {String} str tableName.column
     */
    getColFullName( str ) {
        let res = -1;
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
            let fullName = this.getColFullName(element)
            if( fullName == -1 ) console.warn(`Bad Col name!`, element)
            else this.#selectedCols.push( element )
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
        let whereString = this.getWhereConditionString(this.#whereConditions)
        let selectString = this.getSelectString(this.#selectedCols)
        let query = "SELECT "
        if( selectString.trim().length ) query += selectString
        else query += "`"+this.tableName+"`.*"
        query += " FROM " + "`"+this.tableName+"`"
        if( whereString.trim().length ) query += " WHERE " + whereString
        let res = await this.sequelize.query(query, QueryTypes.SELECT);
        return res[0]
    }
    /**
     * 
     * @returns Integer Deleted row count
     */
    async delete(){
        let whereString = this.getWhereConditionString(this.#whereConditions)
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
        let whereString = this.getWhereConditionString(this.#whereConditions)
        let query = "SELECT COUNT(*) "
        query += " FROM " + "`"+this.tableName+"`"
        if( whereString.trim().length ) query += " WHERE " + whereString
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
        let whereString = this.getWhereConditionString(this.#whereConditions)
        if( whereString.trim().length ) query += " WHERE " + whereString
        // return query
        let res = await this.sequelize.query(query, QueryTypes.UPDATE);
        return res[0].changedRows
    }
}