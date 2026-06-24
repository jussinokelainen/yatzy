package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Delete ongoing game data AND saved progress for given id
func restartGame(c *gin.Context) {
	var req startGameRequest

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	deleteCurrentGame(req.Id)
	deleteProgress(req.Id)

	c.IndentedJSON(http.StatusOK, "Game reset")
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

// Switch function used to calculate the correct value
// for a selected item, so each 15 items dont need their own
// http request functions
func itemSelector(c *gin.Context) {
	item := c.Param("what")
	itemInt := 0
	var req idStruct
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// value that will be set to the calculated value
	// in the switch case
	val := 0

	switch item {
	case "one":
		val = calculateNumbers(req.Id, 1)
		itemInt = 0
	case "two":
		val = calculateNumbers(req.Id, 2)
		itemInt = 1
	case "three":
		val = calculateNumbers(req.Id, 3)
		itemInt = 2
	case "four":
		val = calculateNumbers(req.Id, 4)
		itemInt = 3
	case "five":
		val = calculateNumbers(req.Id, 5)
		itemInt = 4
	case "six":
		val = calculateNumbers(req.Id, 6)
		itemInt = 5
	case "pair":
		val = calculatePair(req.Id)
		itemInt = 6
	case "doublepair":
		val = calculateDoublepair(req.Id)
		itemInt = 7
	case "triples":
		val = calculateTriples(req.Id)
		itemInt = 8
	case "quadruples":
		val = calculateQuadruples(req.Id)
		itemInt = 9
	case "smallstraight":
		val = calculateSmallstraight(req.Id)
		itemInt = 10
	case "bigstraight":
		val = calculateBigstraight(req.Id)
		itemInt = 11
	case "fullhouse":
		val = calculateFullhouse(req.Id)
		itemInt = 12
	case "mixed":
		val = calculateMixed(req.Id)
		itemInt = 13
	case "quintuples":
		val = calculateQuintuples(req.Id)
		itemInt = 14
	}

	currentGame := loadCurrentGame(req.Id)
	currentGame.scorearray[itemInt] = val
	currentGame.clickedarray[itemInt] = true
	currentGame.roundNum += 1
	updateCurrentGame(req.Id, currentGame)

	var progress progressData
	progress.Name = currentGame.name
	progress.Id = req.Id
	progress.Scorerow = getScoreRow(req.Id)
	progress.Clicked = getClickedRow(req.Id)
	progress.Roundnum = currentGame.roundNum
	saveProgress(progress)
	resetDice(req.Id)

	// Check if the game is over
	if currentGame.roundNum >= MAX_ROUND {
		total, _ := calculateTotal(req.Id)
		row := getScoreRow(req.Id)
		info("Saving:", currentGame.name, total, row)
		err = addScore(currentGame.name, total, req.Id, row)
		if err != nil {
			errout(err)
		}
	}
}
