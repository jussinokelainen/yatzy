package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Delete ongoing game data for the user of the request
func restartGame(c *gin.Context) {
	user, _ := getUserInfo(c)

	if err := deleteActiveGame(user.id); err != nil {
		errout("Error deleting game")
		errout(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not reset game"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Locks dice given as c.Param for the user of the request
func lockDice(c *gin.Context) {
	diceStr := c.Param("dice")
	dice, err := strconv.Atoi(diceStr)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if dice < 0 || dice > 4 {
		c.JSON(400, gin.H{"error": "No dice with that index"})
		return
	}

	user, _ := getUserInfo(c)
	currentGame, err := loadActiveGame(user.id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no game in progress"})
		return
	}

	dicearr := &currentGame.diceArray[dice]
	dicearr.locked = !dicearr.locked
	if err := saveGame(currentGame); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save game"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Saves the selected scoreboard item for the user of the request.
// The value of the item is calculated from the dice of their
// ongoing game. Selecting the last item also finishes the game.
func itemSelector(c *gin.Context) {
	item := c.Param("what")
	user, _ := getUserInfo(c)

	currentGame, err := loadActiveGame(user.id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no game in progress"})
		return
	}

	// value that will be set to the calculated value
	val, itemInt, found := calculateItem(item, currentGame)
	if !found {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no such scoreboard item"})
		return
	}

	// The item can only be selected once
	if currentGame.clickedarray[itemInt] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "item already selected"})
		return
	}

	currentGame.scorearray[itemInt] = val
	currentGame.clickedarray[itemInt] = true
	currentGame.roundNum += 1
	currentGame.roll_count = 0
	resetDice(&currentGame)

	if err := saveGame(currentGame); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save game"})
		return
	}

	total, _ := calculateTotal(currentGame)

	// Check if the game is over
	gameOver := currentGame.roundNum >= MAX_ROUND
	if gameOver {
		if err := finishGame(user.id, total); err != nil {
			errout("Error finishing game")
			errout(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not finish game"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		// scores
		// round number
		"score":    val,
		"total":    total,
		"gameover": gameOver,
	})
}
