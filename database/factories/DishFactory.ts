import Dish from 'App/Models/Dish'
import Factory from '@ioc:Adonis/Lucid/Factory'

export const DishFactory = Factory.define(Dish, ({ faker }) => {
  return {
    name: faker.commerce.productName(), // Exemple : "Spaghetti Bolognese"
    description: faker.lorem.paragraph(), // Description réaliste
    price: parseFloat(faker.commerce.price(1000, 10000, 0)), // Prix aléatoire entre 1000 et 10000 FCFA
    likes: faker.datatype.number({ min: 0, max: 1000 }),
    dislikes: faker.datatype.number({ min: 0, max: 100 }),
    images: JSON.stringify([
      faker.image.urlLoremFlickr({ category: 'food' }),
      `https://picsum.photos/640/480?random=${faker.datatype.number({ min: 1, max: 1000 })}`,
      `https://picsum.photos/640/480?random=${faker.datatype.number({ min: 1, max: 1000 })}`,
    ]),
    restaurantId: faker.datatype.number({ min: 1, max: 10 }), // Random restaurantId between 1 and 10
  }
}).build()