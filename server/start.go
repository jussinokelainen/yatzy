package main

import (
	"net/http"

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
	req, err := getReq(c)
	if err != nil {
		return
	}

	InitUser(req.Id, req.Name)

	c.IndentedJSON(http.StatusOK, "Game started")
}

func endGame(c *gin.Context) {
	req, err := getReq(c)
	if err != nil {
		return
	}

	total, _ := calculateTotal(req.Id)
	row := getScoreRow(req.Id)
	err = addScore(req.Name, total, req.Id, row)
	if err != nil {
		c.IndentedJSON(500, gin.H{"error": "failed to add score"})
		panic(err)
	}

	c.IndentedJSON(http.StatusOK, "Score saved")
}

func restartGame(c *gin.Context) {
	req, err := getReq(c)
	if err != nil {
		return
	}

	delete(UserMap, req.Id)

	c.IndentedJSON(http.StatusOK, "Game reset")
}
