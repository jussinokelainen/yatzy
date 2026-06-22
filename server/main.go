package main

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	_ "github.com/lib/pq"
)

const MAX_ROUND = 15

var db *sql.DB
var (
	port     = 5432
	user     = os.Getenv("DATABASE_USER")
	password = os.Getenv("DATABASE_PASSWORD")
	dbname   = os.Getenv("DATABASE_NAME")
)

// Print helper functions
func ok(msg any)     { fmt.Println("[\033[32m OK \033[0m] ", fmt.Sprint(msg)) }
func info(msg any)   { fmt.Println("[\033[35m INFO \033[0m] ", fmt.Sprint(msg)) }
func errout(msg any) { fmt.Println("[\033[31m ERROR \033[0m] ", fmt.Sprint(msg)) }

// Function to open a connection to the database
func openDatabase() *sql.DB {
	psqlInfo := fmt.Sprintf("host=db port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		port, user, password, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		errout("Error opening database")
		errout(err)
	}

	return db
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	// Force color to get nicer looking log messages
	gin.ForceConsoleColor()
	db = openDatabase()
	defer db.Close()

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
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

	// This might be useless or idk,
	// maybe make all requests be part of some group
	api := router.Group("/api")
	{
		api.GET("/getscores", getTopScores)
		api.GET("/getstats", getStatsById)
	}

	// POST requests
	router.POST("/restart", restartGame)
	router.POST("/lockDice/:dice", lockDice)
	router.POST("/selectItem/:what", itemSelector)

	// GET requests
	router.GET("/start/:id/:name", startGame)
	router.GET("/rollDice/:id", rollDice)
	router.GET("/getScoresByID/:id", sendScoresByID)

	router.Use(static.Serve("/", static.LocalFile("web/dist", true)))

	info("Server running...")
	router.Run("0.0.0.0:2222")
}
