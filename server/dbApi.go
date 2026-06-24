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
		data.roundNum,
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

	err := db.QueryRow(sqlStatement, id).Scan(
		&data.name,
		&pq_scorearray,
		&pq_clickedarray,
		&dicevalues,
		&dicelocked,
		&data.roundNum,
	)

	if err != nil {
		errout("Error loading current game values")
		errout(err)
		return data
	}

	tmp_scorearray := []int32(pq_scorearray)
	for i := range 15 {
		data.scorearray[i] = int(tmp_scorearray[i])
		data.clickedarray[i] = pq_clickedarray[i]
	}

	data.diceArray = formDiceArray(dicevalues, dicelocked)

	return data
}

// Delete ongoing game for given id from the database
func deleteCurrentGame(id string) error {
	sqlStatement := `DELETE FROM usermap WHERE id = $1;`

	_, err := db.Exec(sqlStatement, id)

	return err
}

// Save progress of a game for given player
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

// Load progress of player with given id
// returns an error if no progress exists or there was an
// error retrieving it
func loadProgress(id string) (progressData, error) {
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

	err := db.QueryRow(sqlStatement, id).Scan(
		&data.Name,
		&data.Id,
		&data.Scorerow,
		&data.Clicked,
		&data.Roundnum,
	)

	if err != nil {
		errout("Error loading progress data")
		errout(err)
	}

	return data, err
}

// Delete progress of player with given id
func deleteProgress(id string) error {
	sqlStatement := `DELETE FROM in_progress WHERE id = $1;`

	_, err := db.Exec(sqlStatement, id)

	return err
}

// Get the name, max score and games played
// of each id in the results database table
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

// Get the top 20 scores in the results database table
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

// Add a new score to the results
func addScore(name string, score int, id string, row string) error {
	sqlStatement := `INSERT INTO results(name, score, id, row) VALUES($1, $2, $3, $4);`
	_, err := db.Exec(sqlStatement, name, score, id, row)
	return err
}
