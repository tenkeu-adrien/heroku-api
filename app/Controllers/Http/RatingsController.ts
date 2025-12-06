// app/Controllers/Http/RatingsController.ts
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Rating from 'App/Models/Rating'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Ride from 'App/Models/Ride'
import User from 'App/Models/User'
import Order from 'App/Models/Order'

export default class RatingsController {
  // Créer une évaluation
  public async store({ request, response, auth }: HttpContextContract) {
    const user = auth.user!
    const validationSchema = schema.create({
      ride_id: schema.number([
        rules.exists({ table: 'rides', column: 'id' })
      ]),
      rating: schema.number([
        rules.range(0, 5)
      ]),
      comment: schema.string.optional({ trim: true }),
    })

    const data = await request.validate({
      schema: validationSchema,
      messages: {
        'rating.range': 'La note doit être entre 0 et 5'
      }
    })

    const ride = await Ride.findOrFail(data.ride_id)
    // const user = auth.user!

    const rating = await Rating.create({
      userId: ride.driverId,
      rating: data.rating,
      comment: data.comment,
    })

    return response.created(rating)
  }


  public async storee({ request, response, auth }: HttpContextContract) {
    const user = auth.user!

    console.log("request" ,request.body())
    const validationSchema = schema.create({
      ride_id: schema.number([
        rules.exists({ table: 'orders', column: 'id' })
      ]),
      rating: schema.number([
        rules.range(0, 5)
      ]),
      comment: schema.string.optional({ trim: true }),
    })

    const data = await request.validate({
      schema: validationSchema,
      messages: {
        'rating.range': 'La note doit être entre 0 et 5'
      }
    })

    console.log("data dans ratings" ,data)
    const order = await Order.findOrFail(data.ride_id)
    // const user = auth.user!

    const rating = await Rating.create({
      userId: order.clientId,
      rating: data.rating,
      comment: data.comment,
    })

    return response.created(rating)
  }
  // Lister les évaluations d'un utilisateur
  public async index({ request, response }: HttpContextContract) {
    const { user_id} = request.qs()

  

    const ratings = await Rating.query()
      .where('user_id', user_id)
      .preload('ride')
      .preload('user')
      .orderBy('created_at', 'desc')

    return response.ok(ratings)
  }

  // Obtenir une évaluation spécifique
  public async show({ params, response }: HttpContextContract) {
    const rating = await Rating.query()
      .where('id', params.id)
      .preload('ride')
      .preload('user')
     
      .firstOrFail()

    return response.ok(rating)
  }


 public async getUserRatings({ auth, response }: HttpContextContract) {
    // Récupérer l'utilisateur complet depuis la base de données
    const user = await User.query()
      .where('id', auth.user!.id)
      .preload('givenRatings', (query) => {
        query.preload('user')
          .orderBy('created_at', 'desc')
      })
      .preload('receivedRatings', (query) => {
        query.preload('user')
          .orderBy('created_at', 'desc')
      })
      .firstOrFail()

    return response.ok({
      givenRatings: user.givenRatings,
      receivedRatings: user.receivedRatings
    })
  }

}