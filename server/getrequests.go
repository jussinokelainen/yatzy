package main

import (
	"database/sql"
	"errors"
	"math/rand/v2"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Function that returns the current round the game is on
// as the response to the request
func getRound(c *gin.Context) {
	user, _ := getUserInfo(c)
	currentGame, err := loadActiveGame(user.id)
	if errors.Is(err, sql.ErrNoRows) {
		// The game may have just been finished
		currentGame, err = loadLatestFinishedGame(user.id)
	}
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no game in progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"roundnumber": currentGame.roundNum,
	})
}

// Function that checks whether the user of the request has
// an ongoing game they have already played at least one round of
func checkExistingProgress(c *gin.Context) {
	user, _ := getUserInfo(c)
	currentGame, err := loadActiveGame(user.id)
	exists := err == nil && currentGame.roundNum > 0

	c.JSON(http.StatusOK, gin.H{
		"exists": exists,
	})
}

// Start a game for the user of the request, loads their ongoing
// game if they have one, otherwise a new empty game is created.
// The response contains the whole state of the game.
func startGame(c *gin.Context) {
	user, _ := getUserInfo(c)

	currentGame, err := loadActiveGame(user.id)
	if err != nil {
		// No game in progress, start a new one
		currentGame, err = createActiveGame(user.id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not start a game"})
			return
		}
	}

	var values [5]int
	var locked [5]bool
	for i := range currentGame.diceArray {
		values[i] = currentGame.diceArray[i].value
		locked[i] = currentGame.diceArray[i].locked
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"scorerow":   currentGame.scorearray,
		"clickedrow": currentGame.clickedarray,
		"roundnum":   currentGame.roundNum,
		"dice":       values,
		"locked":     locked,
	})
}

// Rolls the dice for the user of the request, returns them to the caller as JSON
func rollDice(c *gin.Context) {
	user, _ := getUserInfo(c)
	currentGame, err := loadActiveGame(user.id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no game in progress"})
		return
	}

	dicearr := &currentGame.diceArray

	// Generate new values for all dice
	for i := range dicearr {
		newVal := rand.IntN(6) + 1
		if !dicearr[i].locked {
			dicearr[i].value = newVal
		}
	}

	// Update database to have current dice values,
	// and return them as the response to the http request
	if err := saveGame(currentGame); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save game"})
		return
	}

	var values [5]int
	for i := range dicearr {
		values[i] = dicearr[i].value
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"values":  values,
	})
}

// Loads data of the ongoing game and returns it as the http response.
// Falls back to the most recently finished game, so the final score
// can still be read after the game has ended.
func getScoresByID(c *gin.Context) {
	user, _ := getUserInfo(c)
	currentGame, err := loadActiveGame(user.id)
	if errors.Is(err, sql.ErrNoRows) {
		currentGame, err = loadLatestFinishedGame(user.id)
	}
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no game found"})
		return
	}

	total, subTotal := calculateTotal(currentGame)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"scores":   currentGame.scorearray,
		"total":    total,
		"subTotal": subTotal,
	})
}
