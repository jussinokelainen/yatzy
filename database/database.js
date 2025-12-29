import { Pool } from 'pg';
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  user: process.env.REACT_APP_USER,
  host: process.env.REACT_APP_HOST,
  database: process.env.REACT_APP_DATABASE,
  password: process.env.REACT_APP_PASSWORD,
  port: Number(process.env.REACT_APP_PORT),
});


export const addResult = (name, score, id, perfect) => {
  return new Promise(function(resolve, reject) {
    pool.query(
      "INSERT INTO results(name, score, id, perfect) VALUES($1, $2, $3, $4);",
      [name, score, id, perfect],
      (error, results) => {
        if (error) {
          reject(error);
        }
        if (results && results.rows) {
          resolve(
            `New score added: ${JSON.stringify(results.rows[0])}`
          );
        } else {
          reject(new Error("No results found"));
        }
      }
    );
  });
};

export const showResults = (type) => {
  let query = ""
  if (type === 'name') {
    query = `SELECT * FROM results ORDER BY score DESC LIMIT 20;`
  }
  if (type === 'id') {
    query = `SELECT mode() WITHIN GROUP (ORDER BY name) AS name, 
             MAX(score) AS score,
             COUNT(*)
             FROM results 
             GROUP BY id ORDER BY score DESC;`

  }
  return new Promise((resolve, reject) => {
    pool.query(query,
      (error, results) => {
        if (error) {
          return reject(error);
        }

        if (results && results.rows) {
          // Return the full array of rows
          resolve(results.rows);
        } else {
          reject(new Error("No results found"));
        }
      });
  });
};
