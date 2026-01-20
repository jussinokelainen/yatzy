package main

import (
	"fmt"
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func rollDice(c *gin.Context) {
	id := c.Param("id")
	dicearr := &UserMap[id].diceArray

	for i := range dicearr {
		newVal := rand.IntN(6) + 1
		if !dicearr[i].locked {
			dicearr[i].value = newVal
		}
	}

	var values [5]int
	for i := range dicearr {
		values[i] = dicearr[i].value
	}

	info(fmt.Sprint(values))
	c.IndentedJSON(http.StatusOK, gin.H{
		"success": true,
		"values":  values,
	})
}

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
	dicearr := &UserMap[req.Id].diceArray[dice]
	dicearr.locked = !dicearr.locked

	c.IndentedJSON(http.StatusOK, "Lock status updated")
}

func resetDice(id string) {
	dicearr := &UserMap[id].diceArray

	for i := range dicearr {
		dicearr[i].value = 0
		dicearr[i].locked = false
	}
}
