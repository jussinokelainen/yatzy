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


export const addResult = (name, score) => {
  return new Promise(function(resolve, reject) {
    pool.query(
      "INSERT INTO results(name, score) VALUES($1, $2);",
      [name, score],
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

export const showResults = () => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM results ORDER BY score DESC LIMIT 10;", (error, results) => {
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
