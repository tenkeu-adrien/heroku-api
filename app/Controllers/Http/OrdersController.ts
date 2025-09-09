import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Order from 'App/Models/Order'
import OrderItem from 'App/Models/OrderItem'
import Database from '@ioc:Adonis/Lucid/Database'
import Dish from 'App/Models/Dish'
import Ws from 'App/Services/Ws'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import { schema, rules } from '@ioc:Adonis/Core/Validator'

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
    console.log("ok le payload" ,payload)
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

  order.status = status

  // 👉 Si on passe en "delivering", on affecte aussi le livreur
  if (status === 'delivering' && driver_id) {
    order.driverId = driver_id 
    await order.load("driver")    
    await order.save()
    const orderData = {
      id: order.id,
      driver_id: order.driverId, // L'ID du chauffeur attribué
      // total_amount: order.totalPrice,
      // restaurant_name: order.restaurant.name,
      // payment_method: order.paymentMethod,
      // delivery_address: order.deliveryAddress,
      // status: order.status,
      
    };
  
    io.emit('order:new', orderData);  
  }


  if(status === 'delivered'){
    await order.load("client")
    await order.load("driver")
    await order.load("restaurant")
    await order.load("items")
    io.emit('order:delivered', order);  
  }
 


  
  // Émettre à tous les chauffeurs (broadcast)
  
  // Émettre un événement socket pour la mise à jour
  

  return response.json(order)
}


  public async markAsDelivered({ params, response }) {
    const order = await Order.findOrFail(params.id)
    
    order.status = 'delivered'
    await order.save()
    await order.load("client")
    await order.load("driver")
    await order.load("restaurant")
    await order.load("items")
    

    // Émettre un événement socket
     const io = Ws.io
    io.emit('order:delivered', order)

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



}