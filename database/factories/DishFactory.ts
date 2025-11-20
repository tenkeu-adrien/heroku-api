// factories/DishFactory.ts
import Dish from 'App/Models/Dish'
import Factory from '@ioc:Adonis/Lucid/Factory'

const realCameroonianDishes = [
  'Ndolé + Plantain', 'Poulet DG', 'Poisson Braisé + Miondo', 'Eru + Water Fufu',
  'Koki + Plantain Jaune', 'Achu + Sauce Jaune', 'Mbap + Couscous de Manioc',
  'Soya de Bœuf + Baton de Manioc', 'Taro Grillé + Sauce Pistache', 'Folong de Mouton',
  'Sangah', 'Tenue Militaire', 'Beignet-Haricot', 'Poisson Salé + Bobolo',
  'Nkui + Couscous', 'Grilled Brochettes (Soya)', 'Riz Sauce Arachide', 'Okok + Baton',
  'Miondo + Sauce Noire', 'Spaghetti Omelette', 'Puff-Puff + Haricot', 'Gateaux Foléré'
]

export const DishFactory = Factory
  .define(Dish, ({ faker }) => {
    const dishName = faker.helpers.arrayElement(realCameroonianDishes)

    return {
      name: dishName,
      description: faker.helpers.arrayElement([
        `Délicieux ${dishName.toLowerCase()} préparé à la camerounaise`,
        `Spécialité maison : ${dishName.toLowerCase()}`,
        `Plat traditionnel camerounais très apprécié`,
        `Recette authentique de grand-mère`,
        `Accompagné de miondo/bobolo/plantain selon disponibilité`,
      ]),
      price: faker.helpers.arrayElement([
        2500, 2800, 3000, 3200, 3500, 3800, 4000, 4500, 4800, 5000, 5500, 6000, 6500, 7000
      ]),
      likes: faker.datatype.number({ min: 12, max: 890 }),
      dislikes: faker.datatype.number({ min: 0, max: 45 }),
      images: JSON.stringify([
        `https://picsum.photos/seed/dish-${faker.datatype.number({ min: 1, max: 500 })}/800/600`,
        `https://picsum.photos/seed/dish-${faker.datatype.number({ min: 501, max: 1000 })}/800/600`,
        `https://picsum.photos/seed/dish-${faker.datatype.number({ min: 1001, max: 1500 })}/800/600`,
      ]),
      restaurantId: faker.datatype.number({ min: 1, max: 15 }),
    }
  })
  .build()