package main

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func getReq(c *gin.Context) (startGameRequest, error) {
	var req startGameRequest

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
	}

	return req, err
}

func startGame(c *gin.Context) {
	id := c.Param("id")
	name := c.Param("name")

	InitUser(id, name)
	progress := loadProgress(id)

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

func restartGame(c *gin.Context) {
	req, err := getReq(c)
	if err != nil {
		return
	}

	deleteCurrentGame(req.Id)
	deleteProgress(req.Id)

	c.IndentedJSON(http.StatusOK, "Game reset")
}
