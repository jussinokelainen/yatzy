package main

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	_ "github.com/lib/pq"
)

var db *sql.DB
var (
	host        = os.Getenv("HOST")
	port, error = strconv.Atoi(os.Getenv("PORT"))
	user        = os.Getenv("USER")
	password    = os.Getenv("PASSWORD")
	dbname      = os.Getenv("DATABASE")
)

// Struct for data in the database
type UserDataStruct struct {
	Name    string `json:"name"`
	Score   int    `json:"score"`
	Id      string `json:"id"`
	Perfect bool   `json:"perfect"`
}

// Function to open a connection to the database
func openDatabase() *sql.DB {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}

	return db
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	db = openDatabase()
	defer db.Close()

	fmt.Println("Server running...")

	router := gin.Default()
	router.GET("/GetScores", getTopScores)
	router.GET("/GetStats", getStatsById)
	router.POST("/AddScore", addScore)

	router.Run("localhost:3000")
}
