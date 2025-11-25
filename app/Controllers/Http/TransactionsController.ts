import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Transaction from 'App/Models/Transaction'
import Ride from 'App/Models/Ride'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'

export default class TransactionsController {
  public async index({ response ,request }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 5)
    const transactions = await Transaction.query()
      .preload('ride')
    .paginate(page, limit)
    return response.ok(transactions)
  }

  public async getUserTransactions({ request, response, params }: HttpContextContract) {
  try {
    const userId = params.id
    const page = request.input('page', 1)
    const limit = request.input('limit', 15)

    // Vérifier que l'utilisateur existe
    const user = await User.find(userId)
    if (!user) {
      return response.notFound({ message: 'Utilisateur non trouvé' })
    }
// console.log("user dans getUserTransactions",user)


    // Récupérer les transactions via la relation avec rides
    const transactions = await Transaction.query()
      .whereHas('ride', (rideQuery) => {
        rideQuery.where('client_id', userId).orWhere('driver_id', userId)
      })
      .orderBy('transaction_date', 'desc')
      .preload('ride', (rideQuery) => {
        rideQuery
          .select([
            'id',
            'vehicle_type',
            'status',
            'distance',
            'price', // ← C'EST ICI QU'EST LE MONTANT !
            'client_id',
            'driver_id',
            'payment_method',
            'is_paid',
            'started_at',
            'completed_at',
            'reason',
            'recipient',
            'duration',
          ])
          .preload('driver', (driverQuery) => {
            driverQuery.select(['id', 'firstName', 'phone'])
          })
          .preload('client', (clientQuery) => {
            clientQuery.select(['id', 'firstName', 'phone'])
          })
      })
      .paginate(page, limit)

      // console.log("transactions dans getUserTransactions",transactions)
    // Formatter la réponse
    const formattedTransactions = transactions.toJSON()
    formattedTransactions.data = formattedTransactions.data.map((transaction) => {

      // console.log("transaction dans getUserTransactions",transaction)
      return {
        id: transaction.id,
        ride_id: transaction.rideId,
        amount: transaction.ride?.price || 0, // ← UTILISATION CORRECTE DU PRIX
        commission: transaction.commission,
        transaction_date: transaction.transactionDate,

        // Infos ride
        ride: transaction.ride
          ? {
              id: transaction.ride.id,
              vehicle_type: transaction.ride.vehicle_type,
              status: transaction.ride.status,
              distance: transaction.ride.distance,
              price: transaction.ride.price, // ← MONTANT DE LA COURSE
              payment_method: transaction.ride.payment_method,
              is_paid: transaction.ride.is_paid,
              started_at: transaction.ride.started_at,
              completed_at: transaction.ride.completed_at,
              reason: transaction.ride.reason,
              recipient: transaction.ride.recipient,
              duration: transaction.ride.duration,
              driver: transaction.ride.driver,
              client: transaction.ride.client,
            }
          : null,

        // Redondance utile côté frontend
        client: transaction.ride?.client,
        driver: transaction.ride?.driver,
      }
    })

    return response.ok(formattedTransactions)
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error)
    return response.internalServerError({
      message: 'Une erreur est survenue lors de la récupération des transactions',
      error,
    })
  }
}

public async getUserTransactionss({ request, response, params }: HttpContextContract) {
  const userId = Number(params.id)
  const page = request.input('page', 1)
  const limit = request.input('limit', 15)

  try {
    const transactions = await Transaction.query()
      .select(
        'transactions.*',
        'rides.vehicle_type',
        'rides.status',
        'rides.distance',
        'rides.price',
        'rides.payment_method',
        'rides.is_paid',
        'rides.started_at',
        'rides.completed_at',
        'rides.reason',
        'rides.recipient',
        'rides.duration',
        'driver.firstName as driver_name',
        'driver.phone as driver_phone',
        'client.firstName as client_name',
        'client.phone as client_phone'
      )
      .leftJoin('rides', 'rides.id', 'transactions.ride_id')
      .leftJoin('users as driver', 'driver.id', 'rides.driver_id')
      .leftJoin('users as client', 'client.id', 'rides.client_id')
      .where((query) => {
        query.where('rides.client_id', userId).orWhere('rides.driver_id', userId)
      })
      .orderBy('transactions.transaction_date', 'desc')
      .paginate(page, limit)

    const formatted = transactions.toJSON()
    formatted.data = formatted.data.map(t => ({
      id: t.id,
      ride_id: t.ride_id,
      amount: t.price || 0,
      commission: t.commission,
      transaction_date: t.transaction_date,
      ride: {
        id: t.ride_id,
        vehicle_type: t.vehicle_type,
        status: t.status,
        distance: t.distance,
        price: t.price,
        payment_method: t.payment_method,
        is_paid: t.is_paid,
        started_at: t.started_at,
        completed_at: t.completed_at,
        reason: t.reason,
        recipient: t.recipient,
        duration: t.duration,
        driver: t.driver_id ? { id: t.driver_id, firstName: t.driver_name, phone: t.driver_phone } : null,
        client: t.client_id ? { id: t.client_id, firstName: t.client_name, phone: t.client_phone } : null,
      },
      client: t.client_id ? { id: t.client_id, firstName: t.client_name, phone: t.client_phone } : null,
      driver: t.driver_id ? { id: t.driver_id, firstName: t.driver_name, phone: t.driver_phone } : null,
    }))

    return response.ok(formatted)
  } catch (error) {
    console.error('Transaction error:', error.message)
    return response.internalServerError({ message: 'Erreur serveur' })
  }
}



  public async store({ request, response }: HttpContextContract) {
    const transactionSchema = schema.create({
      rideId: schema.number([rules.exists({ table: 'rides', column: 'id' })]),
      paymentMethod: schema.enum(['cash', 'orange_money', 'mobile_money'] as const),
      amount: schema.number(),
      commission: schema.number(),
      transactionDate: schema.date(),
    })

    const payload = await request.validate({ schema: transactionSchema })
    const ride = await Ride.findOrFail(payload.rideId)

    const transaction = await Transaction.create({
      rideId: ride.id,
      commission: payload.commission,
      transactionDate: payload.transactionDate,
    })

    return response.created(transaction)
  }

  public async show({ params, response }: HttpContextContract) {
    const transaction = await Transaction.query()
      .where('id', params.id)
      .preload('ride')
      .firstOrFail()
    return response.ok(transaction)
  }
}