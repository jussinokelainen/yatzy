package main

import (
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Rolls the dice for given id, returns them to the caller as JSON
func rollDice(c *gin.Context) {
	info("Rolling dice")
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

	info("Rolled dice to", values)
	c.IndentedJSON(http.StatusOK, gin.H{
		"success": true,
		"values":  values,
	})
}

// Locks dice given as c.Param for id given in request context
func lockDice(c *gin.Context) {
	diceStr := c.Param("dice")
	dice, err := strconv.Atoi(diceStr)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var req idStruct
	err = c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	currentGame := loadCurrentGame(req.Id)
	dicearr := &currentGame.diceArray[dice]
	dicearr.locked = !dicearr.locked
	updateCurrentGame(req.Id, currentGame)

	c.IndentedJSON(http.StatusOK, "Lock status updated")
}

// Reset dice to unlocked and 0 for given id
func resetDice(id string) {
	currentGame := loadCurrentGame(id)
	dicearr := &currentGame.diceArray

	for i := range dicearr {
		dicearr[i].value = 0
		dicearr[i].locked = false
	}
	updateCurrentGame(id, currentGame)
}
