package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Delete ongoing game data AND saved progress for the player of the request
func restartGame(c *gin.Context) {
	id := getUserKey(c)

	deleteCurrentGame(id)
	deleteProgress(id)

	c.IndentedJSON(http.StatusOK, "Game reset")
}

// Locks dice given as c.Param for the player of the request
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

	id := getUserKey(c)
	currentGame := loadCurrentGame(id)
	dicearr := &currentGame.diceArray[dice]
	dicearr.locked = !dicearr.locked
	updateCurrentGame(id, currentGame)

	c.IndentedJSON(http.StatusOK, "Lock status updated")
}

// Switch function used to calculate the correct value
// for a selected item, so each 15 items dont need their own
// http request functions
func itemSelector(c *gin.Context) {
	item := c.Param("what")
	itemInt := 0
	id := getUserKey(c)

	// value that will be set to the calculated value
	// in the switch case
	val := 0

	switch item {
	case "one":
		val = calculateNumbers(id, 1)
		itemInt = 0
	case "two":
		val = calculateNumbers(id, 2)
		itemInt = 1
	case "three":
		val = calculateNumbers(id, 3)
		itemInt = 2
	case "four":
		val = calculateNumbers(id, 4)
		itemInt = 3
	case "five":
		val = calculateNumbers(id, 5)
		itemInt = 4
	case "six":
		val = calculateNumbers(id, 6)
		itemInt = 5
	case "pair":
		val = calculatePair(id)
		itemInt = 6
	case "doublepair":
		val = calculateDoublepair(id)
		itemInt = 7
	case "triples":
		val = calculateTriples(id)
		itemInt = 8
	case "quadruples":
		val = calculateQuadruples(id)
		itemInt = 9
	case "smallstraight":
		val = calculateSmallstraight(id)
		itemInt = 10
	case "bigstraight":
		val = calculateBigstraight(id)
		itemInt = 11
	case "fullhouse":
		val = calculateFullhouse(id)
		itemInt = 12
	case "mixed":
		val = calculateMixed(id)
		itemInt = 13
	case "quintuples":
		val = calculateQuintuples(id)
		itemInt = 14
	}

	currentGame := loadCurrentGame(id)
	currentGame.scorearray[itemInt] = val
	currentGame.clickedarray[itemInt] = true
	currentGame.roundNum += 1
	updateCurrentGame(id, currentGame)

	var progress progressData
	progress.Name = currentGame.name
	progress.Id = id
	progress.Scorerow = getScoreRow(id)
	progress.Clicked = getClickedRow(id)
	progress.Roundnum = currentGame.roundNum
	saveProgress(progress)

	info(item, "value calculated as", val, "from", currentGame.diceArray)

	resetDice(id)
	// Check if the game is over
	if currentGame.roundNum >= MAX_ROUND {
		total, _ := calculateTotal(id)
		row := getScoreRow(id)
		err := addScore(currentGame.name, total, id, row)
		if err != nil {
			errout(err)
		}
	}
}
