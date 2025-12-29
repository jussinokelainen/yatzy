package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func addScore(c *gin.Context) {
	var req UserDataStruct

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	sqlStatement := `INSERT INTO results(name, score, id, perfect) VALUES($1, $2, $3, $4);`
	_, err = db.Exec(sqlStatement, req.Name, req.Score, req.Id, req.Perfect)
	if err != nil {
		c.IndentedJSON(500, gin.H{"error": "failed to add score"})
		panic(err)
	}

	c.IndentedJSON(http.StatusOK, "Score saved")
}
