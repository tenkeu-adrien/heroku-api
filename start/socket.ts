import Ws from 'App/Services/Ws'

Ws.boot()

/**
 * Listen for incoming socket connections
 */




Ws.io.on('connection', (socket) => {
  console.log("socket connected", socket.id)

  // Rejoindre une room utilisateur
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`)
  })



    // Rejoindre une room de commande avec rôle
    socket.on('join-order-room', ({ orderId, role }) => {
      socket.join(`order_${orderId}`) // Room générale
      socket.join(`order_${orderId}_${role}`) // Room spécifique au rôle
    })

    // Quitter une room de commande
    socket.on('leave-order-room', ({ orderId, userId, role }) => {
      const roomPrefix = role === 'driver' ? 'driver' : 'client'
      socket.leave(`order_${orderId}`)
      socket.leave(`order_${orderId}_${roomPrefix}`)
    })
  // Rejoindre une room de course avec rôle
  socket.on('join-ride-room', ({ rideId,role }) => {
    socket.join(`ride_${rideId}`) // Room générale
    socket.join(`ride_${rideId}_${role}`) // Room spécifique au rôle
  })

  // Quitter une room de course
  socket.on('leave-ride-room', ({ rideId, userId, role }) => {
    const roomPrefix = role === 'driver' ? 'driver' : 'client'
    socket.leave(`ride_${rideId}`)
    socket.leave(`ride_${rideId}_${roomPrefix}`)
  })
})