// const mysql = require('mysql2');
const jwt_decode = require('jwt-decode');

/**
 * Gets a connection from the connection pool and returns it via the promise
 * @param pool
 */
function createConnection(pool) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
            } else {
                resolve(connection);
            }
        });
    });
}

function singleQuery(pool, queryString, headers) {
    //console.log(`singleQuery`);
    return new Promise((resolve, reject) => {
        // console.log(headers);

        let tenant = 'ZA';
        if (headers !== undefined) {
            //Get tenant from auth header
            //TODO: might need to be changed to 'Authorization'
            let authHeader = headers.authorization;
            let idToken = authHeader.split('Bearer ')[1];
            let decoded = jwt_decode(idToken);
            tenant = decoded['http://ablb/tenant'];

            // Override tenant to default to South Africa if it wasn't set in Auth0
            if (tenant === 'NONE') {
                tenant = 'ZA';
            }

            // console.log(decoded);
            console.log("Tenant: ", tenant);
        }
        pool.getConnection((err, conn) => {
            if(err) reject(err);
            else {
                conn.query(`USE Abalobi_${tenant};`, err => {
                    if(err) reject(err);
                    else {
                        conn.query(queryString, (err, result, fields) => {
                            if(err) reject(err);
                            else {
                                pool.releaseConnection(conn);
                                resolve(result, fields)
                            }
                        })
                    }
                });
            }
        })
    });
}

// function createSearch(queryString, success, error){
//     let conn = new jsforce.Connection();
//
//     conn.login(secrets.SF_USER, secrets.SF_PASSWORD, (err, res) => {
//         if (err) {
//             return console.error(err);
//         }
//
//         conn.search(queryString,
//             function(err, res) {
//
//                 if (err) {
//                     error(err);
//                     return console.error(err);
//                 }
//                 // console.log(res);
//                 console.log(`RESPONSES RECEIVED: ${res.searchRecords.length}`);
//                 success(res);
//             }
//         );
//     });
// }

// function searchPromise(conn, querystring) {
//
//     const removeDashes = (text) => text.split("-").join("\\-");
//
//     return new Promise((resolve, reject) => {
//         conn.search(removeDashes(querystring), (err, res) => {
//             if (err) {
//                 console.log("salesforce: search error: ", err);
//                 reject(err);
//             } else {
//                 console.log(`salesforce: search debug: RESPONSES RECEIVED: ${res.searchRecords.length}`);
//                 resolve(res);
//             }
//         });
//     })
// }

// function update(table, updateobject, success, error) {
//     let conn = new jsforce.Connection();
//     conn.login(secrets.SF_USER, secrets.SF_PASSWORD, function(err, res) {
//         if (err) {
//             error(err);
//             return console.error(err);
//         }
//
//         // Single record update
//         conn.sobject(table).update(updateobject, function(err, ret) {
//             if (err || !ret.success) {
//                 error(err);
//                 return console.error(err, ret);
//             }
//             else {
//                 success('Updated Successfully : ' + ret.id);
//                 console.log('Updated Successfully : ' + ret.id);
//             }
//         });
//     });
// }

/**
 * Update a single record in a table.
 * @param conn
 * @param table
 * @param updateobject
 * @returns {Promise}
 */
function updateSingle(conn, table, updateobject) {
    console.log(`updateSingle`);
    return new Promise((resolve, reject) => {
        let queryString = `UPDATE ${table} SET `;

        let keys = [];
        let foundId = false;
        let idKey;
        let idType;
        for (let key in updateobject) {
            console.log(`key '${key}', type '${typeof key}'`);
            console.log(`value '${updateobject[key]}', type '${typeof updateobject[key]}'`);
            if (key.toLowerCase() !== 'id') {
                keys.push({
                    key: key,
                    type: typeof updateobject[key]
                });
            } else {
                foundId = true;
                idKey = key;
                idType = typeof updateobject[key];
            }
        }

        if (!foundId) {
            reject(`No Id found to update on`)
        } else {
            for (let i = 0; i < keys.length; i++) {
                queryString += `${keys[i].key} = ${updateobject[keys[i].key]}`;
                if (i < (keys.length - 1)) {
                    queryString += `, `;
                }
            }
            queryString += ` WHERE ${idKey} = ${updateobject[idKey]}`;

            console.log("queryString: ", queryString);

            conn.query(queryString, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });

            // resolve('Method not done yet');
        }

        // // Single record update
        // conn.sobject(table).update(updateobject, function(err, ret) {
        //     if (err || !ret.success) {
        //         // error(err);
        //         console.error(err, ret);
        //         reject([err, ret]);
        //     }
        //     else {
        //         console.log('Updated Successfully : ' + ret.id);
        //         resolve(ret.id);
        //     }
        // });
    })
}

/**
 * Take a single object and create a new MySQL record in a specific table.
 * Returns a promise with error or success string.
 * @param conn
 * @param tableName
 * @param data
 * @returns {Promise}
 */
function createSingle(conn, tableName, data) {
    // Single record creation
    return new Promise((resolve, reject) => {
        conn.query(`INSERT INTO ${tableName} SET ?`, data, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res.insertId);
            }
        });
    });
}

function pool_createSingle(pool, tableName, data) {
    // Single record creation
    return new Promise((resolve, reject) => {
        pool.query(`INSERT INTO ${tableName} SET ?`, data, (err, res, fields) => {
            if (err) {
                reject(err);
            } else {
                resolve(res.insertId);
            }
        });
    });
}

// function createSingleFake(conn, tableName, data) {
//     // Single record creation
//     return new Promise((resolve, reject) => {
//         let currentDate = new Date();
//         let dateString = currentDate.toISOString();
//         let filename = sanitize(dateString);
//         fs.writeFile("../../" + filename + ".json", JSON.stringify(data, null, 4), (err, success) => {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve("FAKE_SALESFORCE_ID");
//             }
//         })
//     });
// }

/**
 * Takes an array of objects to insert into a Salesforce table.
 * @param conn - Connection passed into this function
 * @param sfObject - Table to insert objects into
 * @param data - Array of data to insert into table
 */
// function createMultiple(conn, sfObject, data) {
//     let limiter = new RateLimiter(1, 250);
//     let splitData = splitArray(data);
//
//     for (let i = 0; i < splitData.length; i++) {
//         limiter.removeTokens(1, function() {
//             conn.sobject(sfObject).create(splitData[i], (err, rets) => {
//                 if (err) { return console.error(err); }
//                 for (let i=0; i < rets.length; i++) {
//                     if (rets[i].success) {
//                         console.log("Created record id : " + rets[i].id);
//                     }
//                 }
//             })
//         });
//     }
//
//     // Splits the array of data into chunks of 10
//     function splitArray(array) {
//         let i,j,temparray,chunk = 10;
//         let newArray = [];
//         for (i=0,j=array.length; i<j; i+=chunk) {
//             temparray = array.slice(i,i+chunk);
//             newArray.push(temparray);
//         }
//         return newArray;
//     }
// }

/**
 * Runs a query against the MySQL database
 * @param conn
 * @param queryString
 */
function createQuery(conn, queryString) {
    return new Promise((resolve, reject) => {
        conn.query(queryString, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

// function getFieldNames(conn, sfObject) {
//     return new Promise((resolve, reject) => {
//         conn.sobject(sfObject)
//             .select('*')
//             .limit(1)
//             .execute(getRecords)
//             .then(records => {
//                 let keysArr = [];
//                 // Build an array of fields in this object
//                 if (records.length > 0) {
//                     for (let i in records[0]) {
//                         if (records[0].hasOwnProperty(i)) {
//                             keysArr.push(i);
//                         }
//                     }
//                     resolve(keysArr);
//                     return;
//                 } else {
//                     reject("No records found for " + sfObject);
//                 }
//
//             }).catch(ex => {
//             console.log("Error");
//             console.log(ex);
//             reject("Error in SalesForce: " + ex);
//         });
//     });
// }

/**
 * Promisify function for sfObject execute chain method
 * @param err
 * @param records
 * @returns {Promise}
 */
// function getRecords (err, records) {
//     return new Promise((resolve, reject) => {
//         if (err) {
//             reject(err);
//         } else {
//             resolve(records);
//         }
//     })
// }



// function deleteSingle(conn, table, objectId) {
//     return new Promise((resolve, reject) => {
//         conn.sobject(table).destroy(objectId, function(err, ret) {
//             if (err || !ret.success) {
//                 reject (err);
//                 console.error(err, ret);
//             } else {
//                 resolve(ret.id);
//             }
//             console.log('Salesforce: Deleted Successfully : ' + ret.id);
//         });
//     })
// }

// function deleteMultiple(conn, table, thingsToDelete) {
//     return new Promise((resolve, reject) => {
//         let limiter = new RateLimiter(1, 250);
//         // let splitData = splitArray(data);
//
//         for (let i = 0; i < thingsToDelete.length; i++) {
//             limiter.removeTokens(1, () => {
//                 conn.sobject(table).destroy(thingsToDelete[i], (err, ret) => {
//                     if (err || !ret.success) {
//                         reject (err);
//                         console.error(err, ret);
//                     } else {
//                         resolve(ret.id);
//                     }
//                     console.log('Salesforce: Deleted Successfully : ' + ret.id);
//                 });
//
//                 if (i === thingsToDelete.length -1) {
//                     resolve("All items deleted successfully!");
//                 }
//             });
//         }
//     })
// }


module.exports = {
    query: createQuery,
    singleQuery,
    // search: createSearch,
    // update,
    updateSingle,
    createConnection,
    createSingle,
    pool_createSingle,
    // createSingleFake,
    // createSearch: searchPromise,
    // createMultiple,
    // deleteSingle,
    // deleteMultiple,
    // getFieldNames
};
