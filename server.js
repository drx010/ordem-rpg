const { createServer } = require("http")
const { Server } = require("socket.io")

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

io.on("connection", (socket) => {

  socket.on("joinRoom", (roomCode) => {
    socket.join(roomCode)
    console.log("Entrou na sala:", roomCode)
  })

  socket.on("rollDice", ({ roomCode, data }) => {
    console.log("Recebi rollDice:", roomCode, data)
    io.to(roomCode).emit("diceRolled", data)
  })

})

  socket.on("disconnect", () => {
    console.log("Jogador saiu")
  })

httpServer.listen(3001, () => {
  console.log("Servidor rodando na porta 3001")
})