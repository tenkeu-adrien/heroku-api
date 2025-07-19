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
      faker.image.urlLoremFlickr({ category: 'restaurant' }),
    ]),
    restaurantId: 1, // Tu peux mettre un ID par défaut ou l’ajouter dynamiquement dans un `.with()` si nécessaire
  }
}).build()
