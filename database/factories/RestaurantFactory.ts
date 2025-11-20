// factories/RestaurantFactory.ts
import Restaurant from 'App/Models/Restaurant'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { generateCameroonianPhoneNumber } from './UserFactory'

const cameroonianRestaurantNames = [
  'Chez Maman', 'Le Bon Coin', 'La Terrasse', 'Le Relais', 'Saveurs d’Afrique',
  'Le Ndolé d’Or', 'Poisson Braisé de Douala', 'Le Plantain Doré', 'Mahama Grill',
  'Le Coin des Amis', 'La Case du Pêcheur', 'Le Baobab', 'Eru Palace', 'Le 237 Grill',
  'Kribi Beach Food', 'Le Tonton', 'Soya de Yaoundé', 'Achu Palace', 'Le Mboa',
  'Nkonda Café', 'Le Wouri', 'La Braise du Centre', 'Mbap & Co', 'Folong Grill'
]

const realCameroonianCitiesAndAreas = [
  'Akwa - Douala', 'Bonapriso - Douala', 'Deido - Douala', 'Bépanda - Douala',
  'Makepe - Douala', 'Bastos - Yaoundé', 'Hippodrome - Yaoundé', 'Ngoa-Ekelle - Yaoundé',
  'Mvan - Yaoundé', 'Carrefour Emia - Yaoundé', 'Bonamoussadi - Douala',
  'Bonanjo - Douala', 'Essos - Yaoundé', 'Kribi Centre', 'Bafoussam Centre',
  'Bamenda Commercial Avenue', 'Limbe - Mile 4', 'Buea - Molyko', 'Ebolowa Centre',
  'Garoua - Marouare'
]

export const RestaurantFactory = Factory
  .define(Restaurant, ({ faker }) => {
    const name = faker.helpers.arrayElement(cameroonianRestaurantNames)
    
    return {
      name,
      cuisine: faker.helpers.arrayElement([
        'Camerounaise', 'Africaine', 'Grillades', 'Poisson Braisé', 'Chinoise', 'Libanaise', 'Française'
      ]),
      rating: parseFloat(faker.helpers.arrayElement([
        4.8, 4.7, 4.6, 4.5, 4.4, 4.3, 4.2, 4.1, 4.0, 3.9, 3.8
      ]).toFixed(1)),
      deliveryTime: faker.helpers.arrayElement([
        '25-35 min', '30-45 min', '35-50 min', '20-30 min', '40-55 min'
      ]),
      image: `https://picsum.photos/seed/resto-${faker.datatype.number({ min: 1, max: 200 })}/640/480`,
      isActive: true,
      isFavorite: faker.datatype.boolean(),
      phone: generateCameroonianPhoneNumber(faker),
      address: faker.helpers.arrayElement(realCameroonianCitiesAndAreas),
      createdBy: faker.datatype.number({ min: 1, max: 10 }),
    }
  })
  .build()