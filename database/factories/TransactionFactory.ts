// database/factories/TransactionFactory.ts
import Transaction from 'App/Models/Transaction'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { DateTime } from 'luxon'

export const TransactionFactory = Factory
  .define(Transaction, ({ faker }) => {
    return {
      commission: faker.datatype.number({ min: 100, max: 2000 }),
      transactionDate: DateTime.fromJSDate(faker.date.recent()),
      rideId:  1, // Ou générez un ID valide
    }
  })  
  // .relation('ride', () => RideFactory) // Supposons que vous avez une RideFactory
  // .relation('client', () => UserFactory)
  // .relation('driver', () => UserFactory)
  .build()