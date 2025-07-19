import Order from 'App/Models/Order'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { UserFactory } from './UserFactory'

export const OrderFactory = Factory
  .define(Order, ({ faker }) => {
    return {
      deliveryAddress: faker.location.streetAddress(),
      status: faker.helpers.arrayElement(['pending', 'preparing', 'delivering', 'delivered', 'cancelled'] as const),
      totalPrice: parseFloat(faker.commerce.price(500, 5000, 0)),
      clientId: faker.number.int({ min: 1, max: 12 }),
    }
  })
  .relation('client', () => UserFactory)
  .build()
