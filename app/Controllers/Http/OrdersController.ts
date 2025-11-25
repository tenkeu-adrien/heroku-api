import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Order from 'App/Models/Order'
import OrderItem from 'App/Models/OrderItem'
import Database from '@ioc:Adonis/Lucid/Database'
import Dish from 'App/Models/Dish'
import Ws from 'App/Services/Ws'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import NotificationService from 'App/Services/NotificationService'

export default class OrdersController {
  public async store({ request, auth, response }: HttpContextContract) {
    console.log("ok le store" ,request.body())
    const orderSchema = schema.create({
      deliveryAddress: schema.string({ trim: true }, [
        rules.maxLength(255)
      ]),
      paymentMethod: schema.enum(['cash', 'orange_money', 'mobile_money'] as const),
      restaurantId: schema.number(),
      items: schema.array().members(
        schema.object().members({
          dishId: schema.number(),
          quantity: schema.number()
        })
      )
    })

    const payload = await request.validate({ schema: orderSchema })
    // console.log("ok le payload" ,payload)
    const trx = await Database.transaction()

    try {
      const order = await Order.create({
        clientId: auth.user!.id,
        deliveryAddress: payload.deliveryAddress,
        paymentMethod: payload.paymentMethod,
        status: 'pending',
        totalPrice: 0,  
        restaurantId: payload.restaurantId,
        
            }, { client: trx })

      let totalPrice = 0

      for (const item of payload.items) {
        const dish = await Dish.findOrFail(item.dishId, { client: trx })
        const itemTotal = dish.price * item.quantity

        await OrderItem.create({
          orderId: order.id,
          dishId: dish.id,
          quantity: item.quantity,
          unitPrice: dish.price,
        }, { client: trx })

        totalPrice += itemTotal
      }

      order.totalPrice = totalPrice
      await order.save()

      await trx.commit()
      await order.load('items')

      const io = Ws.io
      io.emit('order:store', order)

      return response.created(order)

    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.internalServerError({ message: 'Échec de la création de la commande' })
    }
  }

  public async index({ request, response }) {
  const page = request.input('page', 1)
  const limit = request.input('limit', 10)
  
  const orders = await Order.query()
    // .whereNotNull('restaurant_id') // Filtre les commandes sans restaurant
    .preload('restaurant')
    .preload('client')
    .preload("driver")
    .orderBy('created_at', 'desc')
    
    .preload('items', (query) => {
      query.preload('dish')
    })
    .paginate(page, limit)

  return response.json(orders)
}



  public async show({ params, response }) {
    const order = await Order.query()
      .where('id', params.id)
      .preload('client')
      .preload('restaurant')
      .preload('items', (query) => {
        query.preload('dish')
      })
      .firstOrFail()

    return response.json(order)
  }


  // Dans votre contrôleur OrderController.ts

public async showw({ params, response }: HttpContextContract) {
  try {
    const order = await Order.query()
      .where('id', params.id)
      .preload('restaurant')
      .preload('orderItems', (query) => {
        query.preload('dish')
      })
      .firstOrFail()

    return response.ok(order)
  } catch (error) {
    return response.notFound({ message: 'Commande non trouvée' })
  }
}

  public async indexx({ request, auth, response }: HttpContextContract) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const status = request.input('status')
      const userRole = request.input('user_role') // client | driver | restaurant



      // console.log("je suis dans index"  ,userRole ,status ,limit)
      let query = Order.query()
        .preload('client')
        .preload('driver')
        .preload('restaurant')
        .orderBy('created_at', 'desc')



     
      // 🔹 Filtrage par status (supporte plusieurs valeurs séparées par virgule)
      if (status) {
       
        const statuses = status.split(',')
        query = query.whereIn('status', statuses)
      }
      // console.log("query   page  limit status  ,userRole ",query) 
      // 🔹 Filtrage par rôle utilisateur
      if (userRole === 'client') {
        query = query.where('client_id', auth.user!.id)
      } else if (userRole === 'driver') {
        query = query.where('driver_id', auth.user!.id)
      } else if (userRole === 'restaurant') {
        query = query.where('restaurant_id', auth.user!.id)
      }

      const orders = await query.paginate(page, limit)

// console.log("orders" ,)

      return response.json(
        orders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      return response.status(500).json({
        message: 'Failed to fetch orders',
      })
    }
  }



  public async update({ params, request, response }) {
    const order = await Order.findOrFail(params.id)
    const io = Ws.io
    const { status, driver_id } = request.only(['status', 'driver_id'])
  
    // Sauvegarder le statut précédent pour comparaison
    const previousStatus = order.status
    order.status = status
  
    // 👉 Si on passe en "delivering", on affecte aussi le livreur
    if (status === 'delivering' && driver_id) {
      order.driverId = driver_id 
      await order.load("driver")
    }
  
    await order.save()
  
    // Émettre l'événement socket global
    io.emit('order:status', order)
  
    // Gestion spécifique par statut avec switch case
    switch (status) {
      case 'delivering':
        await this.handleDeliveringStatus(order, io, previousStatus)
        break
  
      case 'delivered':
        await this.handleDeliveredStatus(order, io)
        break
  
      case 'preparing':
        await this.handlePreparingStatus(order)
        break
  
      case 'cancelled':
        await this.handleCancelledStatus(order)
        break
  
      case 'pending':
        await this.handlePendingStatus(order)
        break
  
      default:
        // Pour les autres statuts, émettre une notification générique
        await NotificationService.sendToUser(
          order.clientId,
          'Statut de commande mis à jour',
          `Votre commande est maintenant ${status}`,
          {
            orderId: order.id,
            status: order.status,
            type: 'status_update'
          }
        )
        break
    }
  
    return response.json(order)
  }
  
  // ==================== MÉTHODES HELPER POUR CHAQUE STATUT ====================
  
  private async handleDeliveringStatus(order: Order, io: any, previousStatus: string) {
    // Éviter les notifications doubles si le statut était déjà "delivering"
    if (previousStatus !== 'delivering') {
      // Émettre l'événement socket pour nouvelle commande
      io.emit('order:new', order)
  
      // Notification au CLIENT
      await NotificationService.sendToUser(
        order.clientId,
        '🎉 Votre commande est en route !',
        `Notre livreur est en chemin avec votre commande. Préparation de ${order.totalPrice} FCFA.`,
        {
          orderId: order.id,
          status: 'delivering',
          driverId: order.driverId,
          amount: order.totalPrice,
          type: 'order_delivering',
          redirectTo: 'orders', // ou 'rides', 'orders', etc.
        }
      )
  
      // Notification au DRIVER (si un driver est assigné)
      if (order.driverId) {
        await NotificationService.sendToUser(
          order.driverId,
          '📦 Nouvelle livraison assignée',
          `Vous avez une nouvelle livraison à ${order.deliveryAddress}.`,
          {
            orderId: order.id,
            status: 'delivering',
            deliveryAddress: order.deliveryAddress,
            type: 'driver_assignment',
            redirectTo: 'orders', // ou 'rides', 'orders', etc.

          }
        )
      }
  
      // Notification au RESTAURANT (charger la relation si nécessaire)
      await order.load('restaurant')
      await order.load('client')
      await order.load('driver')
      // if (order.restaurant) {
      //   await NotificationService.sendToUser(
      //     order.restaurant.userId, // Supposant que restaurant a un userId
      //     '✅ Commande en livraison',
      //     `La commande #${order.id} a été prise en charge par le livreur.`,
      //     {
      //       orderId: order.id,
      //       status: 'delivering',
      //       type: 'restaurant_notification'
      //     }
      //   )
      // }
    }
  }
  
  private async handleDeliveredStatus(order: Order, io: any) {
    // Charger toutes les relations nécessaires
    await order.load("client")
    await order.load("driver")
    await order.load("restaurant")
    await order.load("items")
  
    // Émettre l'événement socket
    io.emit('order:delivered', order)
  
    // Notification au CLIENT
    await NotificationService.sendToUser(
      order.clientId,
      '✅ Livraison réussie !',
      `Votre commande a été livrée avec succès. Merci pour votre confiance !`,
      {
        orderId: order.id,
        status: 'delivered',
        amount: order.totalPrice,
        type: 'order_delivered',
        redirectTo: 'orders', // ou 'rides', 'orders', etc.

      }
    )
  
    // Notification au DRIVER
    if (order.driverId) {
      await NotificationService.sendToUser(
        order.driverId,
        '🎯 Livraison complétée',
        `Vous avez livré la commande  de ${order.deliveryAddress} avec succès.`,
        {
          orderId: order.id,
          status: 'delivered',
          deliveryAddress: order.deliveryAddress,
          type: 'delivery_completed',
          redirectTo: 'orders', // ou 'rides', 'orders', etc.

        }
      )
    }
  
    // Notification au RESTAURANT
    // if (order.restaurant) {
      // await NotificationService.sendToUser(
      //   order.restaurant.userId,
      //   '🏁 Commande livrée',
      //   `La commande #${order.id} a été livrée au client.`,
      //   {
      //     orderId: order.id,
      //     status: 'delivered',
      //     type: 'restaurant_delivery_complete'
      //   }
      // )
    // }
  }



  public async getDriverLocation({ params, response}: HttpContextContract) {
console.log("je suis dans getDriverLocation" ,params.id)

  // Si tu stockes la dernière position connue dans la table Order ou DriverLocation
  const lastLocation = await Database.from('driver_positions')
    .where('order_id', params.id)
    .orderBy('created_at', 'desc')
    .first();

  if (!lastLocation) {
    return response.notFound({ message: 'Position non disponible' });
  }
console.log("lastLocation" ,lastLocation)
  return  response.json(  { 
    lat: lastLocation.latitude,
    lng: lastLocation.longitude,
    updated_at: lastLocation.created_at,
  });
}


  public async storeDriver({ params, request , response ,auth}: HttpContextContract) {
    const user = auth.user!
    // const { lat, lng } = request.input("lat")
const io = Ws.io
    const order = await Order.findOrFail(params.id)

    order.load("driver")
    order.load("client")
    order.load("restaurant")
    if (order.driverId !== user.id) {
      return response.status(403).json({ message: 'Accès refusé : Vous n\'êtes pas le livreur de cette commande.' });
    }
     const { lat, lng } = request.only(['lat', 'lng']);

 const lastLocation =await Database.insertQuery().table('driver_positions').insert({
  order_id: params.id,
  driver_id: user.id,
  latitude: lat,
  longitude: lng,
});

  if (!lastLocation) {
    return response.notFound({ message: 'Position non disponible' });
  }
  io.emit('order:position', {
   order ,
    lat,
    lng,
  });
  return {
    lat: lastLocation.latitude,
    lng: lastLocation.longitude,
    updated_at: lastLocation.created_at,
  };
}
  
  private async handlePreparingStatus(order: Order) {
    // Notification au CLIENT
    await NotificationService.sendToUser(
      order.clientId,
      '👨‍🍳 Commande en préparation',
      `Votre commande est en cours de préparation. Livraison prévue bientôt !`,
      {
        orderId: order.id,
        status: 'preparing',
        type: 'order_preparing',
        redirectTo: 'orders', // ou 'rides', 'orders', etc.

      }
    )
  
    // Notification au RESTAURANT
    await order.load('restaurant')
    // if (order.restaurant) {
    //   await NotificationService.sendToUser(
    //     order.restaurant.userId,
    //     '🛒 Nouvelle commande à préparer',
    //     `Nouvelle commande #${order.id} à préparer.`,
    //     {
    //       orderId: order.id,
    //       status: 'preparing',
    //       type: 'new_order_restaurant'
    //     }
    //   )
    // }
  }
  
  private async handleCancelledStatus(order: Order) {
    // Notification au CLIENT
    await NotificationService.sendToUser(
      order.clientId,
      '❌ Commande annulée',
      `Votre commande #${order.id} a été annulée.`,
      {
        orderId: order.id,
        status: 'cancelled',
        type: 'order_cancelled',
        redirectTo: 'orders', // ou 'rides', 'orders', etc.

      }
    )
  
    // Notifications aux autres parties concernées
    await order.load('restaurant')
    // if (order.restaurant) {
    //   await NotificationService.sendToUser(
    //     order.restaurant.userId,
    //     '⚠️ Commande annulée',
    //     `La commande #${order.id} a été annulée.`,
    //     {
    //       orderId: order.id,
    //       status: 'cancelled',
    //       type: 'order_cancelled_restaurant'
    //     }
    //   )
    // }
  
    if (order.driverId) {
      await NotificationService.sendToUser(
        order.driverId,
        '🚫 Livraison annulée',
        `La livraison #${order.id} a été annulée.`,
        {
          orderId: order.id,
          status: 'cancelled',
          type: 'delivery_cancelled',
          redirectTo: 'orders', // ou 'rides', 'orders', etc.

        }
      )
    }
  }
  
  private async handlePendingStatus(order: Order) {
    // Notification au CLIENT
    await NotificationService.sendToUser(
      order.clientId,
      '⏳ Commande en attente',
      `Votre commande #${order.id} est en attente de traitement.`,
      {
        orderId: order.id,
        status: 'pending',
        type: 'order_pending',
        redirectTo: 'orders', // ou 'rides', 'orders', etc.

      }
    )
  }


  public async markAsDelivered({ params, response }) {
    const order = await Order.findOrFail(params.id)
    
    order.status = 'delivered'
    order.isPaid=true
    await order.save()
    await order.load("client")
    await order.load("driver")
    await order.load("restaurant")
    await order.load("items")
    

    // Émettre un événement socket
     const io = Ws.io
    io.emit('order:delivered', order)
    io.emit('order:status', order)

    await NotificationService.sendToUser(
      order.clientId,
      ' Nouvelle commande  ',
      `Une commande est terminée`,
      {
        rideId: order.id,
        // vehicleType: order.vehicleType,
        pickupLocation: order.deliveryAddress,
        price: order.totalPrice,
      },
      // ride.vehicleType
    );
    return response.json(order)
  }


  public async export({ response }: HttpContextContract) {


    const orders = await Order.query()
      .preload('client')
      .preload('restaurant')
      .preload('items', (query) => {
        query.preload('dish')
      })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Commandes')

    // En-têtes
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Client', key: 'client', width: 25 },
      { header: 'Restaurant', key: 'restaurant', width: 25 },
      { header: 'Adresse', key: 'address', width: 30 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Plats', key: 'items', width: 40 },
      { header: 'Total', key: 'total', width: 15 },
    ]

    // Données
    orders.forEach(order => {
      const itemsText = order.items.map(item => 
        `${item.quantity}x ${item.dish.name} (${item.unitPrice} FCFA)`
      ).join('\n')

      worksheet.addRow({
        id: order.id,
        date: DateTime.fromJSDate(order.createdAt.toJSDate()).toFormat('yyyy-MM-dd HH:mm'),
        client: order.client?.firstName || 'Inconnu',
        restaurant: order.restaurant?.name || 'Inconnu',
        address: order.deliveryAddress,
        status: this.getStatusLabel(order.status),
        items: itemsText,
        total: `${order.totalPrice} FCFA`,
      })
    })

    // Style des cellules
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      })
    })

    response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.header('Content-Disposition', 'attachment; filename="commandes_export.xlsx"')

    const buffer = await workbook.xlsx.writeBuffer()
    return response.send(buffer)
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'En attente'
      case 'preparing': return 'En préparation'
      case 'delivering': return 'En livraison'
      case 'delivered': return 'Livrée'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

 public async cancel({params, response }: HttpContextContract) {


     const io = Ws.io
     
    const ride = await Order.findOrFail(params.id)
      if (ride.status === 'cancelled') {
        return response.badRequest({ success:false, message: 'Cette course est déjà annulée.' })
      }
     
      // Peut annuler si pending ou accepted
      ride.status = 'cancelled'
     

      io.emit('order:cancel',ride)
      await ride.load("client")
      await ride.load("driver")
      await ride.load("restaurant")
      await ride.load("items")
      await ride.save()
      return response.ok({ success:true, message: 'order annulée.', ride })
    }

    // Chauffeur ne peut pas annuler (selon vos nouvelles exigences)
  

    // return response.badRequest({ success:false, message: 'Annulation non autorisée pour ce rôle.' })
  // }


}