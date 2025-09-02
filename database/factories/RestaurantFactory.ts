import Restaurant from 'App/Models/Restaurant'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { generateCameroonianPhoneNumber } from './UserFactory'

export const RestaurantFactory = Factory
  .define(Restaurant, ({ faker }) => {
    return {
      name: faker.company.name(),
      cuisine: faker.helpers.arrayElement(['Africaine', 'Asiatique', 'Italienne', 'Française', 'Américaine']),
      rating: parseFloat(faker.datatype.float({ min: 0, max: 5, precision: 0.1 }).toFixed(1)),
      deliveryTime: `${faker.datatype.number({ min: 20, max: 60 })} min`,
      image: `https://picsum.photos/640/480?random=${faker.datatype.number({ min: 1, max: 1000 })}`,
      isActive: true,
      isFavorite: faker.datatype.boolean(),
      phone: generateCameroonianPhoneNumber(faker),
      address: faker.location.streetAddress(),
      createdBy: faker.datatype.number({ min: 1, max: 10 }),
    }
  })
  .build()