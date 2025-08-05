import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Message from 'App/Models/Message'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Ride from 'App/Models/Ride'
import Database from '@ioc:Adonis/Lucid/Database'
import Ws from 'App/Services/Ws'
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
    const user = auth.user!
    const rideId = params.rideId
  
    console.log("rideId",rideId)
    // On vérifie que le user est bien impliqué dans la course
    const ride = await Ride.findBy('id', rideId)
    console.log("ok je suis arriver 1")
    console.log("ride",ride)
    if (!ride) {
      return response.notFound({ message: 'Course non trouvée' })
    }
    if (
      user.id != ride.clientId &&
      user.id != ride.driverId
    ) {
      return response.unauthorized({ message: 'Accès interdit à cette course' })
    }
  

    const updatedCount = await Message
      .query()
      .where('ride_id', rideId)
      .where('receiver_id', user.id)
      .where('is_read', false)
      .update({ isRead: true })
    console.log("updatedCount",updatedCount)
    return response.ok({
      message: 'Messages marqués comme lus',
      updatedCount,
    })
  }
  

  public async indexx({ auth, params, request, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.rideId
    const page = request.input('page', 1)
    const limit = 20

    // Vérifier que l'utilisateur a accès à cette conversation
     await Ride.query()
      .where('id', rideId)
      .andWhere(q => {
        q.where('client_id', user.id)
         .orWhere('driver_id', user.id)
      })
      .first

    // Récupérer les messages paginés
    const messages = await Database.from('messages')
      .where('ride_id', rideId)
      // .orderBy('created_at', 'desc')
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
        messages: formattedMessages.reverse(), // Pour avoir les plus anciens en premier
        meta: messages.getMeta()
      }
    })
  }



  public async storee({ auth, params, request, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.rideId
    const content = request.input('content')
  console.log("user" ,user)
    // Vérifier l'accès à la conversation et le statut
    const ride = await Ride.query()
      .where('id', rideId)
      .whereIn('status', ['accepted', 'in_progress', 'completed'])
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
  
      console.log("receiverId" ,receiverId)

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
  
    return response.json({
      success: true,
      message: 'Message envoyé',
      data: messageData
    })
  }
  



public async getContacts({ auth, response }: HttpContextContract) {
  const user = auth.user!
  const userId = user.id
// console.log("nous sommes dans getContacts")
  try {
    // 1. Récupérer tous les messages où l'utilisateur est impliqué
    const messages = await Message.query()
      .where('sender_id', userId)
      .orWhere('receiver_id', userId)
      .orderBy('created_at', 'desc')

    // 2. Grouper par ride_id pour avoir les dernières conversations
    const seenRideIds = new Set()
    const contacts = []

    // console.log("messages",messages)
    for (const message of messages) {
      if (seenRideIds.has(message.rideId)) continue
      seenRideIds.add(message.rideId)

      // Charger le ride avec les relations
      const ride = await Ride.query()
        .where('id', message.rideId)
        .preload('client')
        .preload('driver')
        .first()

      if (!ride) continue

      // console.log("ride " ,ride)
      // Déterminer le contact (l'autre utilisateur)
      const contactId = message.senderId === userId ? message.receiverId : message.senderId
      const contactUser = contactId === ride.clientId ? ride.client : ride.driver

      if (!contactUser) continue

      // Compter les messages non lus
      const unreadCount = await Message.query()
        .where('ride_id', ride.id)
        .where('receiver_id', userId)
        .where('is_read', false)
        .count('* as total')
        .first()

      contacts.push({
        rideId: ride.id,
        contactId: contactUser.id, // Ajouté pour le debug
        name: contactUser.firstName,
        avatar: contactUser.avatar,
        lastMessage: message.content,
        unreadCount: Number(unreadCount?.$extras.total) || 0,
        createdAt: message.createdAt.toISO()

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
