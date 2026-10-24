package main

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUsernameTaken = errors.New("username already taken")
	ErrInvalidInput  = errors.New("invalid username or password")
)

func CreateUser(ctx context.Context, username, password string) (int64, error) {
	username = strings.TrimSpace(username)
	if len(username) < 3 || len(username) > 32 {
		return 0, ErrInvalidInput
	}

	if len(password) < 8 || len(password) > 72 {
		return 0, ErrInvalidInput
	}

	// bcrypt only uses the first 72 bytes
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}

	var id int64
	err = db.QueryRowContext(ctx,
		`INSERT INTO users (username, password_hash, allowed)
		VALUES ($1, $2, $3)
		RETURNING id`, username, string(hash), allow_new_users).Scan(&id)
	if err != nil {
		// 23505 = unique_violation
		var se interface{ SQLState() string }
		if errors.As(err, &se) && se.SQLState() == "23505" {
			return 0, ErrUsernameTaken
		}
		return 0, err
	}
	return id, nil
}

// Looks up a user by username and checks the given password
// against the stored hash. Returns ErrInvalidInput both when the
// user does not exist and when the password is wrong, so the
// caller cannot tell the two apart.
func AuthenticateUser(ctx context.Context, username, password string) (UserInfo, error) {
	var user UserInfo
	var hash string

	username = strings.TrimSpace(username)
	err := db.QueryRowContext(ctx,
		`SELECT id, username, password_hash, allowed
		FROM users
		WHERE lower(username) = lower($1)`, username).
		Scan(&user.id, &user.username, &hash, &user.allowed)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return user, ErrInvalidInput
		}
		return user, err
	}

	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return user, ErrInvalidInput
	}
	return user, nil
}

// Adds a new ongoing game for the given user, or returns the
// existing one if the user already has a game in progress
func createActiveGame(userID int64) (GameData, error) {
	var game GameData

	err := db.QueryRow(
		`INSERT INTO games (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) WHERE status = 'in_progress'
		DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING id;`,
		userID,
	).Scan(&game.id)
	if err != nil {
		errout("Error creating a game")
		errout(err)
		return game, err
	}

	game.userID = userID
	return game, nil
}

// Load the ongoing game of the given user. Returns
// sql.ErrNoRows when the user has no game in progress.
// In the scores array a NULL value means the item has not
// been selected yet, so two arrays are read: the scores with
// NULLs replaced by 0, and the selected item flags.
func loadActiveGame(userID int64) (GameData, error) {
	return loadGame(userID, `WHERE g.user_id = $1 AND g.status = 'in_progress'`)
}

// Load the most recently finished game of the given user.
// Used to answer requests that happen right after the
// ongoing game has been finished.
func loadLatestFinishedGame(userID int64) (GameData, error) {
	return loadGame(userID,
		`WHERE g.user_id = $1 AND g.status = 'finished'
		ORDER BY g.finished_at DESC LIMIT 1`)
}

func loadGame(userID int64, whereClause string) (GameData, error) {
	var game GameData
	var scores pq.Int32Array
	var selected pq.BoolArray
	var dicevalues pq.Int32Array
	var dicelocked pq.BoolArray

	// whereClause is only ever built from the constants above
	sqlStatement := `
		SELECT
			id,
			(SELECT array_agg(COALESCE(s, 0) ORDER BY o)
				FROM unnest(g.scores) WITH ORDINALITY AS t(s, o)),
			(SELECT array_agg(s IS NOT NULL ORDER BY o)
				FROM unnest(g.scores) WITH ORDINALITY AS t(s, o)),
			dice,
			dice_locked,
			turn_count
		FROM games g
		` + whereClause + `;`

	err := db.QueryRow(sqlStatement, userID).Scan(
		&game.id,
		&scores,
		&selected,
		&dicevalues,
		&dicelocked,
		&game.roundNum,
	)
	if err != nil {
		return game, err
	}

	game.userID = userID
	for i := range 15 {
		game.scorearray[i] = int(scores[i])
		game.clickedarray[i] = selected[i]
	}
	game.diceArray = formDiceArray(dicevalues, dicelocked)

	return game, nil
}

// Saves the state of the given user's ongoing game,
// or edits the existing one if there is one
func saveGame(game GameData) error {
	// Items that have not been selected yet are stored as NULLs
	sqlStatement := `
		INSERT INTO games (
			user_id,
			scores,
			dice,
			dice_locked,
			turn_count
		)
		VALUES (
			$1,
			ARRAY(
				SELECT CASE WHEN clicked THEN score ELSE NULL END
				FROM unnest($2::integer[], $3::boolean[]) AS t(score, clicked)
			),
			$4,
			$5,
			$6
		)
		ON CONFLICT (user_id) WHERE status = 'in_progress'
		DO UPDATE SET
			scores = EXCLUDED.scores,
			dice = EXCLUDED.dice,
			dice_locked = EXCLUDED.dice_locked,
			turn_count = EXCLUDED.turn_count
		RETURNING id;
	`

	dicevalues, dicelocked := parseDiceArrays(game.diceArray)
	err := db.QueryRow(
		sqlStatement,
		game.userID,
		pq.Array(game.scorearray[:]),
		pq.Array(game.clickedarray[:]),
		pq.Array(dicevalues[:]),
		pq.Array(dicelocked[:]),
		game.roundNum,
	).Scan(&game.id)
	if err != nil {
		errout("Error updating current game values")
		errout(err)
	}

	return err
}

// Delete the ongoing game of the given user
func deleteActiveGame(userID int64) error {
	sqlStatement := `DELETE FROM games WHERE user_id = $1 AND status = 'in_progress';`

	_, err := db.Exec(sqlStatement, userID)

	return err
}

// Marks the ongoing game of the given user as finished
// and stores its total score
func finishGame(userID int64, totalScore int) error {
	sqlStatement := `
		UPDATE games
		SET status = 'finished', total_score = $2, finished_at = now()
		WHERE user_id = $1 AND status = 'in_progress';
	`

	_, err := db.Exec(sqlStatement, userID, totalScore)

	return err
}

// Get the username, best score and games played
// of every user that has finished games
func getStatsById(c *gin.Context) {
	type StatStruct struct {
		Name  string `json:"name"`
		Score int    `json:"score"`
		Count int    `json:"count"`
	}
	results := []StatStruct{}

	sqlStatement := `
		SELECT u.username, MAX(g.total_score), COUNT(*)
		FROM games g
		JOIN users u ON u.id = g.user_id
		WHERE g.status = 'finished'
		GROUP BY u.id, u.username
		ORDER BY MAX(g.total_score) DESC;
	`
	rows, err := db.Query(sqlStatement)
	if err != nil {
		errout("Error getting stats grouped by user")
		errout(err)
	}
	defer rows.Close()
	for rows.Next() {
		var row StatStruct
		err = rows.Scan(&row.Name, &row.Score, &row.Count)
		if err != nil {
			errout("Error parsing user grouped data")
			errout(err)
		}
		results = append(results, row)
	}

	err = rows.Err()
	if err != nil {
		errout("Error in user grouped rows")
		errout(err)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  results,
	})
}

// Get the 20 best finished games with the username of their player
func getTopScores(c *gin.Context) {
	type ScoreStruct struct {
		Name  string `json:"name"`
		Score int    `json:"score"`
	}
	results := []ScoreStruct{}

	sqlStatement := `
		SELECT u.username, g.total_score
		FROM games g
		JOIN users u ON u.id = g.user_id
		WHERE g.status = 'finished'
		ORDER BY g.total_score DESC
		LIMIT 20;
	`
	rows, err := db.Query(sqlStatement)
	if err != nil {
		errout("Error in getting top scores")
		errout(err)
	}
	defer rows.Close()
	for rows.Next() {
		var row ScoreStruct
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
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  results,
	})
}
