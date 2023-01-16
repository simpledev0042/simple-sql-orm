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

class ORM {
    #whereConditions
    #selectedCols

    static CONDITION_AND        = 'CONDITION_AND'
    static CONDITION_OR         = 'CONDITION_OR'
    static CONDITION_GROUP      = 'CONDITION_GROUP'
    static CONDITION_CONDITION  = 'CONDITION_CONDITION'

    constructor(host, db, user="root", port = 3306, password=""){
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
     * @param {String} str tableName.column
     */
    getColFullName( str ) {
        let res = -1;
        const arr = str.split(".")
        if( arr.length == 1 ) {
            let col = arr[0]
            col = Lib.String.removeSpecialChars(col)
            col = col.trim()
            res = '`'+this.tableName+'`.`'+col+'`'
        }
        else if( arr.length == 2 ) {
            let tbName = Lib.String.removeSpecialChars(arr[0]).trim()
            let col = Lib.String.removeSpecialChars(arr[1]).trim()
            res = '`'+tbName+'`.`'+col+'`'
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
     * @param {String[]} cols Col String array
     * @returns ORM
     */

    select( cols = [] ) {
        const len = cols.length
        this.queryType = QueryTypes.SELECT
        for (let i = 0; i < len; i++) {
            const element = cols[i];
            let fullName = ORM.getColFullName(element)
            if( fullName == -1 ) console.warn(`Bad Col name!`, cols)
            else this.#selectedCols.push( fullName )
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

    get(){
        console.log(this.getWhereConditionString(this.#whereConditions))
    }
}

const orm = new ORM("127.0.0.1", "devteam")
orm.table("users").where("'`team`'.id", "5").get()