package main

import (
	"math/rand/v2"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Function that returns the current round the game is on
// as the response to the request
func getRound(c *gin.Context) {
	id := c.Param("id")
	currentGame := loadCurrentGame(id)
	c.IndentedJSON(http.StatusOK, gin.H{
		"roundnumber": currentGame.roundNum,
	})
}

// Function that checks whether progess exists for a user,
// returns a boolean and the name which the progress was saved with.
// If there is no progress, name might return something undefined
func checkExistingProgress(c *gin.Context) {
	exists := true
	id := c.Param("id")
	progress, err := loadProgress(id)
	if err != nil {
		exists = false
	}
	c.IndentedJSON(http.StatusOK, gin.H{
		"name":   progress.Name,
		"exists": exists,
	})

}

// Start a game for given id with given name, loads existing progress
// and uses that if it exists
func startGame(c *gin.Context) {
	id := c.Param("id")
	name := c.Param("name")

	progress := InitUser(id, name)

	var parsedClickRow [15]bool
	parsedClickstrings := strings.Split(progress.Clicked, ";")
	for i := range parsedClickstrings {
		parsedClickRow[i], _ = strconv.ParseBool(parsedClickstrings[i])
	}

	var parsedScoreRow [15]int
	parsedScorestrings := strings.Split(progress.Scorerow, ";")
	for i := range parsedScorestrings {
		parsedVal, _ := strconv.ParseInt(parsedScorestrings[i], 10, 0)
		parsedScoreRow[i] = int(parsedVal)
	}

	c.IndentedJSON(http.StatusOK, gin.H{
		"name":       progress.Name,
		"id":         progress.Id,
		"scorerow":   parsedScoreRow,
		"clickedrow": parsedClickRow,
		"roundnum":   progress.Roundnum,
	})
}

// Rolls the dice for given id, returns them to the caller as JSON
func rollDice(c *gin.Context) {
	id := c.Param("id")
	currentGame := loadCurrentGame(id)
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
	updateCurrentGame(id, currentGame)
	var values [5]int
	for i := range dicearr {
		values[i] = dicearr[i].value
	}

	c.IndentedJSON(http.StatusOK, gin.H{
		"success": true,
		"values":  values,
	})
}

// Loads data of ongoing game and returns it as the http response
func getScoresByID(c *gin.Context) {
	id := c.Param("id")

	currentGame := loadCurrentGame(id)
	scoreRow := currentGame.scorearray
	total, subTotal := calculateTotal(id)

	c.IndentedJSON(http.StatusOK, gin.H{
		"success":  true,
		"scores":   scoreRow,
		"total":    total,
		"subTotal": subTotal,
	})
}
