import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Pricing from 'App/Models/Pricing'
import PromoCode from 'App/Models/PromoCode'
import User from 'App/Models/User'
import { DishFactory } from 'Database/factories/DishFactory'
import { DriverPayoutFactory } from 'Database/factories/DriverPayoutFactory'
import { OrderFactory } from 'Database/factories/OrderFactory'
import { OrderItemFactory } from 'Database/factories/OrderItemFactory'
import { RatingFactory } from 'Database/factories/RatingFactory'
import { RestaurantFactory } from 'Database/factories/RestaurantFactory'
import { RideFactory } from 'Database/factories/RideFactory'
import { TransactionFactory } from 'Database/factories/TransactionFactory'
import { UserFactory } from 'Database/factories/UserFactory'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  public async run() {
    // Création des prix
    await Pricing.createMany([
      { 
        vehicle_id: 1,
        base_price: 20,
        price_per_km: 500,
        peak_hours_multiplier: 1.5,
        delivery_fee: 2000,
        commission_rate: 10
      },
      {
        vehicle_id: 2,
        base_price: 3000,
        price_per_km: 500,
        peak_hours_multiplier: 1.8,
        delivery_fee: 2500,
        commission_rate: 12
      }
    ])

    // Création des données de test
    await UserFactory.createMany(15)
await User.create({
      firstName: 'Jean',
      phone: '+237651503914',
      password: 'oiseaux2k2',
      role: "client",
      isVerified: true,
    })

    await User.create({
      firstName: 'Pierre',
      phone: '+237651503916',
      password: 'oiseaux2k2',
      role: "driver",
      matricule: 'AB12345',
      vehiculeType: "moto-taxi",
      isVerified: true,
    })

    await User.create({
  firstName: 'John Doe',
  phone: '+237651503917',
  password: 'oiseaux2k2',
  role: "driver",
  matricule: 'CD67890',
  vehiculeType: "moto-taxi",
  isVerified: true,
})

    await User.create({
  firstName: 'Jeanne Doe',
  phone: '+237651503918',
  password: 'oiseaux2k2',
  role: "client",
  isVerified: true,
})
    await RideFactory.createMany(10)
    await RatingFactory.createMany(10)
    await TransactionFactory.createMany(10)
    await DriverPayoutFactory.createMany(10)
    await RatingFactory.createMany(15)
    await UserFactory.createMany(15)
    await RestaurantFactory.createMany(15)
    await DishFactory.createMany(10)
    await OrderFactory.createMany(10)
    await OrderItemFactory.createMany(10)

    // Création des codes promo
    const users = await User.query().limit(10)

    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé, veuillez d\'abord créer des utilisateurs')
      return
    }

    // Données des codes promo à créer
    const promoData = [
      {
        code: 'WELCOME10',
        discount: 10.0,
        rides_count: 5,
        start_date: DateTime.now().toISO(),
        end_date: DateTime.now().plus({ months: 1 }).toISO(),
        is_active: true,
      },
      {
        code: 'SUMMER20',
        discount: 20.0,
        rides_count: 10,
        start_date: DateTime.now().toISO(),
        end_date: DateTime.now().plus({ months: 2 }).toISO(),
        is_active: true,
      },
      {
        code: 'FREERIDE',
        discount: 100.0,
        rides_count: 1,
        start_date: DateTime.now().toISO(),
        end_date: DateTime.now().plus({ weeks: 2 }).toISO(),
        is_active: true,
      },
      {
        code: 'LOYALTY15',
        discount: 15.0,
        rides_count: 15,
        start_date: DateTime.now().toISO(),
        end_date: DateTime.now().plus({ months: 3 }).toISO(),
        is_active: true,
      },
    ]

    // Créer un code promo pour chaque utilisateur
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const promoInfo = promoData[i % promoData.length] // Pour répartir les codes

      await PromoCode.create({
        userId: user.id,
        code: `${promoInfo.code}${user.id}`, // Ajout de l'ID user pour l'unicité
        discount: promoInfo.discount,
        ridesCount: promoInfo.rides_count,
        startDate: DateTime.fromISO(promoInfo.start_date),
        endDate: DateTime.fromISO(promoInfo.end_date),
        isActive: promoInfo.is_active,
        usedCount: 0,
      })

    //   console.log(`Code promo créé pour l'utilisateur ${user.id}: ${promoInfo.code}${user.id}`)
    }
  }


}