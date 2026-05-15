const { createServer } = require("http")
const { Server } = require("socket.io")

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

io.on("connection", (socket) => {
  console.log("Novo jogador conectado")

  socket.on("joinRoom", (roomCode) => {
    socket.join(roomCode)
    console.log("Entrou na sala:", roomCode)
  })

  socket.on("rollDice", ({ roomCode, data }) => {
    console.log("Recebi rollDice:", roomCode, data)
    io.to(roomCode).emit("diceRolled", data)
  })

  socket.on("disconnect", () => {
    console.log("Jogador saiu")
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta", PORT)
})