import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Order from 'App/Models/Order'
import OrderItem from 'App/Models/OrderItem'
import Database from '@ioc:Adonis/Lucid/Database'
import Dish from 'App/Models/Dish'

export default class OrdersController {
  public async store({ request, auth, response }: HttpContextContract) {
    const { items, deliveryAddress } = request.only(['items', 'deliveryAddress'])

    const trx = await Database.transaction()

    try {
      const order = await Order.create({
        clientId: auth.user!.id,
        deliveryAddress,
        status: 'pending',
        totalPrice: 0,
      }, { client: trx })

      let totalPrice = 0
      for (const item of items) {
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

      return response.created(order)
    } catch (error) {
      await trx.rollback()
      return response.internalServerError({ message: 'Failed to create order' })
    }
  }

  public async index({ auth, response }: HttpContextContract) {
    const orders = await Order.query()
      .where('client_id', auth.user!.id)
      .preload('items')
      .orderBy('created_at', 'desc')

    return response.ok(orders)
  }
}