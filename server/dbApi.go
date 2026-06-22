package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// Adds a new ongoing game to the database, or edits and existing one
// if there is one with given id
func updateCurrentGame(id string, data GameData) error {
	sqlStatement := `
		INSERT INTO usermap (
			id,
			name,
			scorearray,
			clickedarray,
			dicevalue,
			dicelocked,
			turncount
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id)
		DO UPDATE SET
			name = EXCLUDED.name,
			scorearray = EXCLUDED.scorearray,
			clickedarray = EXCLUDED.clickedarray,
			dicevalue = EXCLUDED.dicevalue,
			dicelocked = EXCLUDED.dicelocked,
			turncount = EXCLUDED.turncount;
	`

	dicevalues, dicelocked := parseDiceArrays(data.diceArray)
	_, err := db.Exec(
		sqlStatement,
		id,
		data.name,
		pq.Array(data.scorearray),
		pq.Array(data.clickedarray),
		pq.Array(dicevalues),
		pq.Array(dicelocked),
		data.turnCount,
	)
	if err != nil {
		errout("Error updating current game values")
		errout(err)
	}

	return err
}

// Load data of ongoing game with given id
func loadCurrentGame(id string) GameData {
	var data GameData
	dicevalues := pq.Int32Array{}
	dicelocked := pq.BoolArray{}
	pq_scorearray := pq.Int32Array{}
	pq_clickedarray := pq.BoolArray{}

	sqlStatement := `
		SELECT
			name,
			scorearray,
			clickedarray,
			dicevalue,
			dicelocked,
			turncount
		FROM
			usermap
		WHERE
			id = $1;
	`

	rows, err := db.Query(sqlStatement, id)
	if err != nil {
		errout("Error loading current game values")
		errout(err)
	}
	defer rows.Close()
	for rows.Next() {
		err = rows.Scan(
			&data.name,
			&pq_scorearray,
			&pq_clickedarray,
			&dicevalues,
			&dicelocked,
			&data.turnCount,
		)
		if err != nil {
			errout("Error parsing current game values")
			errout(err)
		}
	}

	err = rows.Err()
	if err != nil {
		errout("Error in loaded current game rows")
		errout(err)
	}

	tmp_scorearray := []int32(pq_scorearray)
	for i := range 15 {
		data.scorearray[i] = int(tmp_scorearray[i])
		data.clickedarray[i] = pq_clickedarray[i]
	}

	data.diceArray = formDiceArray(dicevalues, dicelocked)

	return data
}

func deleteCurrentGame(id string) error {
	sqlStatement := `DELETE FROM usermap WHERE id = $1;`

	_, err := db.Exec(sqlStatement, id)

	return err
}

func saveProgress(progress progressData) error {
	sqlStatement := `
		INSERT INTO in_progress (
			name, id, scorerow, clicked, roundnum
		)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id)
		DO UPDATE SET
			name = EXCLUDED.name,
			scorerow = EXCLUDED.scorerow,
			clicked = EXCLUDED.clicked,
			roundnum = EXCLUDED.roundnum;
	`

	_, err := db.Exec(
		sqlStatement,
		progress.Name,
		progress.Id,
		progress.Scorerow,
		progress.Clicked,
		progress.Roundnum,
	)

	return err
}

func loadProgress(id string) progressData {
	var data progressData

	sqlStatement := `
		SELECT
			name,
			id,
			scorerow,
			clicked,
			roundnum
		FROM
			in_progress
		WHERE
			id = $1;
	`

	rows, err := db.Query(sqlStatement, id)
	if err != nil {
		errout("Error loading progress data")
		errout(err)
	}
	defer rows.Close()
	for rows.Next() {
		err = rows.Scan(
			&data.Name,
			&data.Id,
			&data.Scorerow,
			&data.Clicked,
			&data.Roundnum,
		)
		if err != nil {
			errout("Error parsing progress data")
			errout(err)
		}
	}

	err = rows.Err()
	if err != nil {
		errout("Error in progress data rows")
		errout(err)
	}

	return data
}

func deleteProgress(id string) error {
	sqlStatement := `DELETE FROM in_progress WHERE id = $1;`

	_, err := db.Exec(sqlStatement, id)

	return err
}

func getStatsById(c *gin.Context) {
	type StatStruct struct {
		Name  string `json:"name"`
		Score int    `json:"score"`
		Count int    `json:"count"`
	}
	results := []StatStruct{}

	sqlStatement := `SELECT mode() WITHIN GROUP (ORDER BY name) AS name, 
					 MAX(score) AS score, 
					 COUNT(*) 
	                 FROM results GROUP BY id ORDER BY score DESC;`
	rows, err := db.Query(sqlStatement)
	if err != nil {
		errout("Error getting stats grouped by id")
		errout(err)
	}
	defer rows.Close()
	for rows.Next() {
		var row StatStruct
		err = rows.Scan(&row.Name, &row.Score, &row.Count)
		if err != nil {
			errout("Error parsing id grouped data")
			errout(err)
		}
		results = append(results, row)
	}

	err = rows.Err()
	if err != nil {
		errout("Error in id grouped rows")
		errout(err)
	}
	c.IndentedJSON(http.StatusOK, gin.H{
		"success": true,
		"result":  results,
	})
}

func getTopScores(c *gin.Context) {
	results := []UserDataStruct{}

	sqlStatement := `SELECT name, score FROM results ORDER BY score DESC LIMIT 20;`
	rows, err := db.Query(sqlStatement)
	if err != nil {
		errout("Error in getting top scores")
		errout(err)
	}
	defer rows.Close()
	for rows.Next() {
		var row UserDataStruct
		err = rows.Scan(&row.Name, &row.Score)
		if err != nil {
			errout("Error parsing top score data")
			errout(err)
		}
		results = append(results, row)
	}

	err = rows.Err()
	if err != nil {
		errout("Error in top score rows")
		errout(err)
	}
	c.IndentedJSON(http.StatusOK, gin.H{
		"success": true,
		"result":  results,
	})
}

func addScore(name string, score int, id string, row string) error {
	sqlStatement := `INSERT INTO results(name, score, id, row) VALUES($1, $2, $3, $4);`
	_, err := db.Exec(sqlStatement, name, score, id, row)
	return err
}
