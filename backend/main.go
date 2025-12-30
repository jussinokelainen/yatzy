package main

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
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
	ip          = os.Getenv("IP")
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

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://" + ip + ":2222",
			"http://" + ip + ":5173",
			"http://localhost:2222",
			"http://localhost:5173",
		},
		AllowMethods: []string{
			"GET", "POST",
		},
		AllowHeaders: []string{
			"Origin", "Content-Type", "Authorization",
		},
		ExposeHeaders: []string{
			"Content-Length",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.GET("/GetScores", getTopScores)
	router.GET("/GetStats", getStatsById)
	router.POST("/AddScore", addScore)

	fmt.Println("Backend Server running...")
	router.Run("0.0.0.0:3000")
}
