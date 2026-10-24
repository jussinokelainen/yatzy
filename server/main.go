package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	_ "github.com/lib/pq"
)

const MAX_ROUND = 15

var db *sql.DB
var (
	port            = 5432
	user            = ""
	password        = ""
	dbname          = ""
	allow_new_users = false
)

func load_env() {
	user = os.Getenv("DATABASE_USER")
	password = os.Getenv("DATABASE_PASSWORD")
	dbname = os.Getenv("DATABASE_NAME")

	allow, err := strconv.ParseBool(os.Getenv("ALLOW_NEW_USERS"))
	if err != nil {
		allow = false
	}
	allow_new_users = allow
}

// Print helper functions
func ok(msg ...any)     { log.Println(append([]any{"[\033[32m OK \033[0m]"}, msg...)...) }
func info(msg ...any)   { log.Println(append([]any{"[\033[35m INFO \033[0m]"}, msg...)...) }
func errout(msg ...any) { log.Println(append([]any{"[\033[31m ERROR \033[0m]"}, msg...)...) }

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
	load_env()
	// Setup logging
	timeNow := time.Now().Format("2006-01-02_15-04-05")
	logFileName := "/logs/" + timeNow + ".log"
	logFile, err := os.OpenFile(logFileName, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		panic(err)
	}
	defer logFile.Close()
	mw := io.MultiWriter(os.Stdout, logFile)

	log.SetOutput(mw)

	gin.DefaultWriter = mw
	gin.DefaultErrorWriter = mw
	gin.SetMode(gin.ReleaseMode)
	// Force color to get nicer looking log messages
	gin.ForceConsoleColor()
	db = openDatabase()
	defer db.Close()

	router := gin.Default()

	// router.Use(func(c *gin.Context) {
	// 	c.Next()
	//
	// 	if c.Writer.Written() {
	// 		info("STATUS WRITTEN:", c.Writer.Status(), c.FullPath())
	// 	}
	// })

	// This might be useless or idk,
	// maybe make all requests be part of some group
	api := router.Group("/api")
	{
		// Account routes
		api.POST("/register", register)
		api.POST("/login", login)
		api.POST("/logout", logout)
		api.GET("/me", getMe)

		// Leaderboards, public
		api.GET("/getscores", getTopScores)
		api.GET("/getstats", getStatsById)
	}

	// Routes that belong to a single player. The player is identified by
	// their session cookie instead of the id being part of the url.
	game := router.Group("/")
	{
		game.Use(requireSession)
		// Accounts that have not been allowed yet can not play
		game.Use(requireAllowed)

		// POST requests
		game.POST("/restart", restartGame)
		game.POST("/lockDice/:dice", lockDice)
		game.POST("/selectItem/:what", itemSelector)

		// GET requests
		game.GET("/getRoundNumber", getRound)
		game.GET("/checkExistingProgress", checkExistingProgress)
		game.GET("/start", startGame)
		game.GET("/rollDice", rollDice)
		game.GET("/getScoresByID", getScoresByID)
	}

	router.Use(static.Serve("/", static.LocalFile("web/dist", true)))

	// Everything that is not an api route or a file in web/dist is
	// handled by the frontend itself, which reads the url and shows
	// the matching screen (for example /login or /game). Without this
	// opening those urls directly would answer with a 404.
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		isAPI := path == "/api" || strings.HasPrefix(path, "/api/")
		isPage := c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead

		// Requests that were meant for the api stay plain 404s,
		// and other methods than GET have no page to serve
		if isAPI || !isPage {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// index.html names the hashed files of this exact build, so a
		// cached copy would keep pointing at files a later build removed
		c.Header("Cache-Control", "no-cache")
		c.File("web/dist/index.html")
	})

	info("Server running...")
	router.Run("0.0.0.0:2222")
}
