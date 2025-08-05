import Order from 'App/Models/Order'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { UserFactory } from './UserFactory'

export const OrderFactory = Factory
  .define(Order, ({ faker }) => {
    return {
      deliveryAddress: faker.location.streetAddress(),
      status: faker.helpers.arrayElement(['pending' ,'delivered'] as const),
      totalPrice: parseFloat(faker.commerce.price({ min: 500, max: 5000, dec: 0 })),
      clientId: faker.number.int({ min: 1, max: 12 }),
      restaurantId: faker.number.int({ min: 1, max: 12 }),
    }
  })
  .relation('client', () => UserFactory)
  .build()
