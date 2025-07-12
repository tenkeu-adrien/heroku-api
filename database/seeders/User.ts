import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Pricing from 'App/Models/Pricing'
import PromoCode from 'App/Models/PromoCode'
import User from 'App/Models/User'
// import User from 'App/Models/User'
import { DriverPayoutFactory } from 'Database/factories/DriverPayoutFactory'
import { RatingFactory } from 'Database/factories/RatingFactory'
import { RideFactory } from 'Database/factories/RideFactory'
import { TransactionFactory } from 'Database/factories/TransactionFactory'

import { UserFactory } from 'Database/factories/UserFactory'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  public async run () {
  //   // Write your database queries inside the run method
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

await UserFactory.createMany(12)
await RideFactory.createMany(60)
await RatingFactory.createMany(20)
await TransactionFactory.createMany(15)
await  DriverPayoutFactory.createMany(15)
await RatingFactory.createMany(15)


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

  console.log(`Code promo créé pour l'utilisateur ${user.id}: ${promoInfo.code}${user.id}`)
}
}




 }

  // public async run() {
  //   await User.createMany([
  //     {
  //       phone: '+237 699 999 999',
  //       password: 'AdminPassword123!',
  //       role: 'admin',
  //       isVerified: true,
  //     },
  //     {
  //       phone: '+237 677 777 777',
  //       password: 'DriverPassword123!',
  //       role: 'driver',
  //       isVerified: true,
  //     },
  //     {
  //       phone: '+237 655 555 555',
  //       password: 'ClientPassword123!',
  //       role: 'client',
  //       isVerified: true,
  //     }
  //   ])
  // }



// database/seeders/UserSeeder.ts
