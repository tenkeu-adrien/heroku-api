import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Message from 'App/Models/Message'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Ride from 'App/Models/Ride'
import Database from '@ioc:Adonis/Lucid/Database'
import Ws from 'App/Services/Ws'
import NotificationService from 'App/Services/NotificationService'
import Order from 'App/Models/Order'
export default class MessagesController {
  public async index({ auth, response }: HttpContextContract) {
    const user = auth.user!

    if (user.role === 'admin') {
      const messages = await Message.query().preload('sender').preload('ride')
      return messages
    }
    const messages = await Message.query()
      .where('sender_id', user.id)
      .preload('sender')
      .preload('ride')

    return  response.send({success:true , messages  ,message:"message get succefully"})
}
  

public async getRideMessages({ params, auth, response }: HttpContextContract) {
    const rideId = params.rideId
    const user = auth.user!

    const ride = await Ride.findOrFail(rideId)

    // Autorisation : seul le client ou le chauffeur de la course peuvent accéder aux messages
    if (
      user.role !== 'admin' &&
      user.id !== ride.clientId &&
      user.id !== ride.driverId
    ) {
      return response.unauthorized({    success:false,message: 'Accès non autorisé à cette course' })
    }

    const messages = await Message
      .query()
      .where('ride_id', rideId)
      .orderBy('created_at', 'asc')

    return response.send({success:true , messages  ,message:"message get succefully"})
  }

public async store({ request, auth ,response}: HttpContextContract) {
    const { rideId, content, receiverId } = request.only(['rideId', 'content', 'receiverId'])
  
    const chatMessageSchema = schema.create({
        rideId: schema.number([rules.exists({ table: 'rides', column: 'id' })]),
        content: schema.string([rules.minLength(1)]),
        receiverId: schema.number([rules.exists({ table: 'users', column: 'id' })]),
      });
      

      await request.validate({ schema: chatMessageSchema })
    const messages = await Message.create({
      rideId,
      content,
      senderId: auth.user!.id,
      receiverId,
    })
  
    // Emission WebSocket ici si tu veux : Chat.emit('message', message)
    return response.send({success:true , messages  ,message:"message add  succefully"})
  }
  

  public async show({ params, auth, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.ride_id

    if (user.role === 'admin') {
      return await Message.query().where('ride_id', rideId).preload('sender')
    }

    const messages = await Message.query()
      .where('ride_id', rideId)
      .andWhere('sender_id', user.id)
      .preload('sender')

    return   response.send({success:true , messages  ,message:"message get succefully"})
}


public async markMessagesAsRead({ auth, params, response }: HttpContextContract) {
  console.log("je suis dans markMessagesAsRead")
  const user = auth.user!
  const rideId = params.rideId

  try {
    // Vérifier l'accès dans les deux tables (Ride et Order)
    const [ride, order] = await Promise.all([
      Database.from('rides')
        .where('id', rideId)
        .andWhere((query) => {
          query.where('client_id', user.id)
            .orWhere('driver_id', user.id)
        })
        .andWhereIn('status', ['accepted', 'in_progress', 'completed'])
        .first(),
      
      Database.from('orders')
        .where('id', rideId)
        .andWhere((query) => {
          query.where('client_id', user.id)
            .orWhere('driver_id', user.id)
        })
        .andWhereIn('status', ['preparing', 'delivering', 'delivered'])
        .first()
    ])

    const conversation = ride || order

    if (!conversation) {
      return response.notFound({ 
        message: 'Conversation non trouvée ou vous n\'y avez pas accès' 
      })
    }

    // Marquer les messages comme lus
    const updatedCount = await Message
      .query()
      .where('ride_id', rideId)
      .where('receiver_id', user.id)
      .where('is_read', false)
      .update({ isRead: true })

    // Émettre un événement WebSocket pour informer de la lecture
    const io = Ws.io
    io.to(`ride_${rideId}`).emit('ride:messages_read', {
      rideId,
      readerId: user.id,
      readAt: new Date().toISOString()
    })

    return response.ok({
      message: 'Messages marqués comme lus',
      updatedCount,
    })

  } catch (error) {
    console.error('Erreur dans markMessagesAsRead:', error)
    return response.internalServerError({ 
      message: 'Erreur lors du marquage des messages' 
    })
  }
}
  

  public async indexx({ auth, params, request, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.rideId
    const page = request.input('page', 1)
    const limit = 20
  
    // Vérifier que l'utilisateur a accès à cette conversation
    // On vérifie dans les deux tables (Ride et Order)
    const rideAccess = await Database.from('rides')
      .select('id')
      .where('id', rideId)
      .andWhere(q => {
        q.where('client_id', user.id)
         .orWhere('driver_id', user.id)
      })
      .first()
  
    const orderAccess = await Database.from('orders')
      .select('id')
      .where('id', rideId)
      .andWhere(q => {
        q.where('client_id', user.id)
         .orWhere('driver_id', user.id)
      })
      .first()
  
    if (!rideAccess && !orderAccess) {
      return response.unauthorized({
        success: false,
        message: 'Accès non autorisé à cette conversation'
      })
    }
  
    // Récupérer les messages paginés
    const messages = await Database.from('messages')
      .where('ride_id', rideId)
      .orderBy('created_at', 'asc') // Changé pour avoir l'ordre chronologique
      .paginate(page, limit)
  
    // Formater la réponse
    const formattedMessages = messages.all().map(msg => ({
      id: msg.id,
      text: msg.content,
      sender: msg.sender_id === user.id ? 'user' : 'contact',
      time: msg.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: msg.is_read,
      createdAt: msg.created_at
    }))
  
    return response.json({
      success: true,
      data: {
        messages: formattedMessages, // Plus besoin de reverse() car on trie par 'asc'
        meta: messages.getMeta()
      }
    })
  }


  public async storee({ auth, params, request, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.rideId
    const content = request.input('content')
  
    if (!content || content.trim().length === 0) {
      return response.badRequest({
        success: false,
        message: 'Le contenu du message ne peut pas être vide'
      })
    }
  
    // Vérifier l'accès dans les deux tables (Ride et Order)
    const [ride, order] = await Promise.all([
      Database.from('rides')
        .where('id', rideId)
        .andWhereIn('status', ['accepted', 'in_progress', 'completed'])
        .first(),
      
      Database.from('orders')
        .where('id', rideId)
        .andWhereIn('status', ['preparing', 'delivering', 'delivered'])
        .first()
    ])
  
    const conversation = ride || order
  
    if (!conversation) {
      return response.badRequest({
        success: false,
        message: 'Conversation non trouvée ou statut invalide'
      })
    }
  
    // Déterminer le type de conversation et le destinataire
    const isRide = !!ride
    const clientField = isRide ? 'client_id' : 'client_id'
    const driverField = isRide ? 'driver_id' : 'driver_id'
  
    // Vérification supplémentaire pour s'assurer qu'on a un receiverId valide
    const receiverId = user.role === 'client' 
      ? conversation[driverField] 
      : conversation[clientField]
  
    if (!receiverId) {
      return response.badRequest({
        success: false,
        message: 'Destinataire non disponible'
      })
    }
  
    // Créer le message
    const message = await Message.create({
      rideId,
      senderId: user.id,
      receiverId,
      content: content.trim()
    })
  
    // Diffuser via WebSocket
    const io = Ws.io
  
    const messageData = {
      id: message.id,
      rideId,
      senderId: user.id,
      receiverId,
      content: message.content,
      createdAt: message.createdAt,
      isRead: false,
      sender: user.id == message.senderId ? 'user' : 'contact'
    }
  
    // Émettre les événements WebSocket
    io.to(`ride_${rideId}`).emit('ride:message', messageData)
    io.to(`user_${receiverId}`).emit('notification:new_message', messageData)
  
    // Envoyer la notification
    // await NotificationService.sendToUser(
    //   receiverId,
    //   'Nouveau message',
    //   `${user.first_name} : ${content}`,
    //   {
    //     rideId: conversation.id,
    //     vehicleType: conversation.vehicleType,
    //     pickupLocation: conversation.pickupLocation,
    //     price: conversation.price,
    //     redirectTo: 'chat',
    //   }
    // )
  
    return response.json({
      success: true,
      message: 'Message envoyé',
      data: messageData
    })
  }
  
  public async createMessageOrder({ auth, params, request, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.rideId
    const content = request.input('content')
    // Vérifier l'accès à la conversation et le statut
    const ride = await Order.query()
      .where('id', rideId)
      .whereIn('status', ['preparing' , 'delivering' , 'delivered' ])
      .first()
  
    if (!ride) {
      return response.badRequest({
        success: false,
        message: 'Course non trouvée ou non acceptée'
      })
    }
    // Vérification supplémentaire pour s'assurer qu'on a un receiverId valide
    const receiverId = user.role === 'client' 
      ? ride.driverId 
      : ride.clientId

    if (!receiverId) {
      return response.badRequest({
        success: false,
        message: 'Destinataire non disponible'
      })
    }
  
    // Créer le message
    const message = await Message.create({
      rideId,
      senderId: user.id,
      receiverId,
      content
    })
  
    // Diffuser via WebSocket
    const io = Ws.io
  
    const messageData = {
      id: message.id,
      rideId,
      senderId: user.id,
      receiverId,
      content,
      createdAt: message.createdAt,
      isRead: false,
      sender: user.id === message.senderId ? 'user' : 'contact'
    }
  
    io.to(`ride_${rideId}`).emit('ride:message', messageData)
    io.to(`user_${receiverId}`).emit('notification:new_message', messageData)

     await NotificationService.sendToUser(
            receiverId,
            'Nouveau message',
            `${user.first_name}  : ${content}`,
            {
              rideId: ride.id,
              redirectTo: 'chat', 
            },
            // ride.vehicleType
          );
  
    return response.json({
      success: true,
      message: 'Message envoyé',
      data: messageData
    })
  }
  
  
  public async getContacts({ auth, response }: HttpContextContract) {
    const user = auth.user!
    const userId = user.id
  
    try {
      const messages = await Message.query()
        .where('sender_id', userId)
        .orWhere('receiver_id', userId)
        .orderBy('created_at', 'desc')
  
      const seenRideIds = new Set()
      const contacts = []
  
      for (const message of messages) {
        if (seenRideIds.has(message.rideId)) continue
        seenRideIds.add(message.rideId)
  
        // Chercher d'abord dans rides, puis dans orders
        let ride = await Ride.query()
          .where('id', message.rideId)
          .preload('client')
          .preload('driver')
          .first()
  
        let isOrder = false
        if (!ride) {
          ride = await Order.query()
            .where('id', message.rideId)
            .preload('client')
            .preload('driver')
            .first()
          isOrder = true
        }
  
        if (!ride) continue
  
        // Déterminer le contact selon le rôle
        let contactUser = null
        let contactName = ''
        
        if (user.role === 'client') {
          contactUser = ride.driver
          contactName = ride.driver ? 
            `${ride.driver.firstName}` : 
            (isOrder ? 'Livreur' : 'Chauffeur')
        } else {
          contactUser = ride.client
          contactName = ride.client ? 
            `${ride.client.firstName}` : 
            'Client'
        }
  
        if (!contactUser) continue
        const unreadCount = await Message.query()
          .where('ride_id', ride.id)
          .where('receiver_id', userId)
          .where('is_read', false)
          .count('* as total')
          .first()
  
        contacts.push({
          rideId: ride.id,
          contactId: contactUser.id,
          name: contactName,
          avatar: contactUser.avatar,
          lastMessage: message.content,
          redirectTo: 'chat',
          unreadCount: Number(unreadCount?.$extras.total) || 0,
          createdAt: message.createdAt.toISO(),
          type: isOrder ? 'order' : 'ride' // Pour info frontend
        })
      }
  
      return response.ok({
        status: 'success',
        contacts
      })
  
    } catch (error) {
      console.error('Error in getContacts:', error)
      return response.internalServerError({
        status: 'error',
        message: 'Erreur lors de la récupération des contacts'
      })
    }
  }


public async getMessages({ auth, response }: HttpContextContract) {
 

  try {
    const messages = await Message.query()
      .orderBy('created_at', 'desc')

    return response.ok({
      status: 'success',
      messages
    })
  } catch (error) {
    console.error('Error in getMessages:', error)
    return response.internalServerError({
      status: 'error',
      message: 'Une erreur est survenue lors de la récupération des messages'
    })
  }
}


  }
