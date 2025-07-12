// import Ws from 'App/Services/Ws'
// Ws.boot()

// /**
//  * Listen for incoming socket connections
//  */
// Ws.io.on('connection', (socket) => {
//   console.log("socket connect" ,socket.id)
//   socket.emit('news', { hello: 'world' })

//   socket.on('my other event', (data) => {
//     console.log(data)
//   })
// })


import Ws from 'App/Services/Ws'

Ws.boot()

/**
 * Listen for incoming socket connections
 */
Ws.io.on('connection', (socket) => {
  console.log("socket connected", socket.id)
  socket.emit('news', { hello: 'world' })

  // Événement pour rejoindre une room utilisateur
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`)
    console.log(`User ${userId} joined their private room`)
  })

  // Événement pour quitter une room utilisateur
  socket.on('leave-user-room', (userId) => {
    socket.leave(`user_${userId}`)
    console.log(`User ${userId} left their private room`)
  })

  // Événement pour envoyer un message privé
  socket.on('send-private-message', (data) => {
    const { receiverId, message } = data
    
    // Envoyer uniquement au destinataire
    Ws.io.to(`user_${receiverId}`).emit('new-message', {
      ...message,
      timestamp: new Date()
    })
    
    console.log(`Message sent to user ${receiverId}`)
  })

  // Gestion des événements existants
  socket.on('my other event', (data) => {
    console.log(data)
  })

  // Nettoyage lors de la déconnexion
  socket.on('disconnect', () => {
    console.log("socket disconnected", socket.id)
  })
})