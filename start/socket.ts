import Ws from 'App/Services/Ws'

Ws.boot()

/**
 * Listen for incoming socket connections
 */

// Ws.io.on('connection', (socket) => {
//   console.log("socket connected", socket.id)

//   // Rejoindre une room utilisateur
//   socket.on('join-user-room', (userId) => {
//     socket.join(`user_${userId}`)
//   })

//   // Rejoindre une room de course
//   socket.on('join-ride-room', ({ rideId, userId }) => {
//     socket.join(`ride_${rideId}`)
//     console.log(`User ${userId} joined ride ${rideId}`)
//   })

//   // Quitter une room de course
//   socket.on('leave-ride-room', ({ rideId, userId }) => {
//     socket.leave(`ride_${rideId}`)
//     console.log(`User ${userId} left ride ${rideId}`)
//   })

//   socket.on('disconnect', () => {
//     console.log("socket disconnected", socket.id)
//   })
// })


Ws.io.on('connection', (socket) => {
  console.log("socket connected", socket.id)

  // Rejoindre une room utilisateur
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`)
  })

  // Rejoindre une room de course avec rôle
  socket.on('join-ride-room', ({ rideId, userId, role }) => {
    const roomPrefix = role === 'driver' ? 'driver' : 'client'
    socket.join(`ride_${rideId}`) // Room générale
    socket.join(`ride_${rideId}_${roomPrefix}`) // Room spécifique au rôle
    console.log(`${role} ${userId} joined ride ${rideId}`)
  })

  // Quitter une room de course
  socket.on('leave-ride-room', ({ rideId, userId, role }) => {
    const roomPrefix = role === 'driver' ? 'driver' : 'client'
    socket.leave(`ride_${rideId}`)
    socket.leave(`ride_${rideId}_${roomPrefix}`)
    console.log(`${role} ${userId} left ride ${rideId}`)
  })
})