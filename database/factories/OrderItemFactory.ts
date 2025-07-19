import OrderItem from 'App/Models/OrderItem'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { DishFactory } from './DishFactory'
import { OrderFactory } from './OrderFactory'

export const OrderItemFactory = Factory
  .define(OrderItem, ({ faker }) => {
    const unitPrice = parseFloat(faker.commerce.price(500, 3000, 0))
    const quantity = faker.datatype.number({ min: 1, max: 5 })

    return {
      quantity,
      unitPrice,
    }
  })
  .relation('order', () => OrderFactory)
  .relation('dish', () => DishFactory)
  .build()
