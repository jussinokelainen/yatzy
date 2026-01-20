package main

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

var UserMap = map[string]*GameData{}

func InitUser(id string, name string) {
	var newUser GameData
	newUser.name = name
	for i := range newUser.diceArray {
		newUser.diceArray[i].value = 0
		newUser.diceArray[i].locked = false
	}

	UserMap[id] = &newUser
}

func itemSelector(c *gin.Context) {
	what := c.Param("what")
	whatInt := 0
	var req idStruct
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	val := 0

	switch what {
	case "one":
		val = calculateNumbers(req.Id, 1)
		whatInt = 0

	case "two":
		val = calculateNumbers(req.Id, 2)
		whatInt = 1

	case "three":
		val = calculateNumbers(req.Id, 3)
		whatInt = 2

	case "four":
		val = calculateNumbers(req.Id, 4)
		whatInt = 3

	case "five":
		val = calculateNumbers(req.Id, 5)
		whatInt = 4

	case "six":
		val = calculateNumbers(req.Id, 6)
		whatInt = 5

	case "pair":
		val = calculatePair(req.Id)
		whatInt = 6

	case "doublepair":
		val = calculateDoublepair(req.Id)
		whatInt = 7

	case "triples":
		val = calculateTriples(req.Id)
		whatInt = 8

	case "quadruples":
		val = calculateQuadruples(req.Id)
		whatInt = 9

	case "smallstraight":
		val = calculateSmallstraight(req.Id)
		whatInt = 10

	case "bigstraight":
		val = calculateBigstraight(req.Id)
		whatInt = 11

	case "fullhouse":
		val = calculateFullhouse(req.Id)
		whatInt = 12

	case "mixed":
		val = calculateMixed(req.Id)
		whatInt = 13

	case "quintuples":
		val = calculateQuintuples(req.Id)
		whatInt = 14

	}

	UserMap[req.Id].scorearray[whatInt] = val
	resetDice(req.Id)
	info(fmt.Sprint(UserMap[req.Id].scorearray))
}

func calculateTotal(id string) int {
	scoreRow := UserMap[id].scorearray
	total := 0
	for i := range 6 {
		total += scoreRow[i]
	}

	// Check if bonus is given
	if total >= 63 {
		total += 50
	}

	for i := 6; i < 15; i++ {
		total += scoreRow[i]
	}

	return total
}

func getScoreRow(id string) string {
	scoreRow := UserMap[id].scorearray
	var stringarr [15]string

	for i := range scoreRow {
		stringarr[i] = strconv.Itoa(scoreRow[i])
	}
	row := strings.Join(stringarr[:], ";")

	return row
}
