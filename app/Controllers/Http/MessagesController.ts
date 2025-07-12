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



    /**
 * Marquer tous les messages reçus par l'utilisateur sur une course comme lus
 */
public async markMessagesAsRead({ auth, params, response }: HttpContextContract) {
    const user = auth.user!
    const rideId = params.rideId
  
    // On vérifie que le user est bien impliqué dans la course
    const ride = await Ride.findOrFail(rideId)
  
    if (
      user.role !== 'admin' &&
      user.id !== ride.clientId &&
      user.id !== ride.driverId
    ) {
      return response.unauthorized({ message: 'Accès interdit à cette course' })
    }
  
    const updatedCount = await Message
      .query()
      .where('ride_id', rideId)
      .where('receiver_id', user.id)
      .where('is_read', false)
      .update({ isRead: true })
  
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
    const ride = await Ride.query()
      .where('id', rideId)
      .andWhere(q => {
        q.where('client_id', user.id)
         .orWhere('driver_id', user.id)
      })
      .firstOrFail()

    // Récupérer les messages paginés
    const messages = await Database.from('messages')
      .where('ride_id', rideId)
      .orderBy('created_at', 'desc')
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
    console.log("user " ,user)
    const content = request.input('content')
console.log("content rideid user " ,user?.id ,content ,rideId)
    // Vérifier l'accès à la conversation
  const ride=   await Ride.query()
      .where('id', rideId)
      .andWhere(q => {
        q.where('client_id', user?.id)
         .orWhere('driver_id', user?.id)
      })
      .firstOrFail()
console.log("ride dans store " ,ride)
    // Créer le message
    const message = await Message.create({
      rideId,
      senderId: user.id,
      receiverId: user.role === 'client' 
        ? (await Ride.findOrFail(rideId)).driverId 
        : (await Ride.findOrFail(rideId)).clientId,
      content
    })

    // Diffuser via WebSocket
     const io = Ws.io
     const receiverId = user.role === 'client' 
     ? (await Ride.findOrFail(rideId)).driverId 
     : (await Ride.findOrFail(rideId)).clientId
   
   // Émettre uniquement au destinataire
   io.to(`user_${receiverId}`).emit('new-message', {
     id: message.id,
     rideId,
     senderId: user.id,
     receiverId,
     text: content,
     time: message.createdAt.toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
     isRead: false,
     createdAt: message.createdAt
   })
   
   // Émettre aussi à l'expéditeur pour synchronisation (optionnel)
   io.to(`user_${user.id}`).emit('new-message-sent', {
     id: message.id,
     rideId,
     receiverId,
     text: content,
     time: message.createdAt.toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
     isRead: true // Marqué comme lu pour l'expéditeur
   })

    return response.json({
      success: true,
      message: 'Message envoyé'
    })
  }





  public async getContact({ auth, response }: HttpContextContract) {
    const user = auth.user!

    try {
      // Récupérer toutes les courses où l'utilisateur est impliqué
      const rides = await Ride.query()
        .where(q => {
          q.where('client_id', user.id)
            .orWhere('driver_id', user.id)
        })
        .whereNotNull('driver_id') // Uniquement les courses avec chauffeur assigné
        .preload('client')
        .preload('driver')
        .orderBy('updated_at', 'desc')

      // Pour chaque course, préparer les données du contact
      const contacts = await Promise.all(
        rides.map(async (ride) => {
          // Déterminer qui est le contact (client ou chauffeur)
          const contact = user.role === 'client' ? ride.driver : ride.client
          
          // Récupérer le dernier message
          const lastMessage = await Message.query()
            .where('ride_id', ride.id)
            .orderBy('created_at', 'desc')
            .first()

          // Compter les messages non lus
          const unreadCount = await Message.query()
            .where('ride_id', ride.id)
            .where('receiver_id', user.id)
            .where('is_read', false)
            .count('* as total')
            .first()

          return {
            id: ride.id, // Utilise ride.id comme identifiant unique
            contactId: contact.id,
            name: contact.firstName || `${contact.firstName} ${contact.phone}`,
            avatar: contact.avatar || 'https://i.pravatar.cc/150',
            lastMessage: lastMessage?.content || 'Aucun message',
            unreadCount: Number(unreadCount?.$extras.total) || 0,
            rideId: ride.id
          }
        })
      )

      // Si aucun contact, retourner un tableau vide avec un message
      if (contacts.length === 0) {
        return response.status(200).json({
          success: true,
          message: "Vous n'avez aucune conversation pour le moment",
          contacts: []
        })
      }

      return response.json({
        success: true,
        contacts
      })

    } catch (error) {
      return response.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des contacts"
      })
    }
  }

  }
