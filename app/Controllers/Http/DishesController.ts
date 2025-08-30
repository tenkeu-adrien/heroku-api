import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Dish from 'App/Models/Dish'

export default class DishesController {
  public async like({ params, response }: HttpContextContract) {
    console.log("nous sommes dans like")
    const dish = await Dish.findOrFail(params.id)
    dish.likes++
    await dish.save()
    return response.ok(dish)
  }

  public async dislike({ params, response }: HttpContextContract) {
    const dish = await Dish.findOrFail(params.id)
    console.log("nous sommes dans dislike")
    dish.dislikes++
    await dish.save()
    console.log("ok le dislike" ,dish)
    return response.ok(dish)
  }




  public async index({ response, params, request }: HttpContextContract) {
    try {
      const restaurantId = params.id
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
  
      const dishesQuery = Dish.query()
        .where('restaurant_id', restaurantId)
        .orderBy('created_at', 'desc')
  
      const dishes = await dishesQuery.paginate(page, limit)
  
      return response.send({
        success: true,
        data: dishes.all(),          // Les données
        meta: dishes.getMeta(),      // Les métadonnées de pagination
        message: "Plats récupérés avec succès"
      })
  
    } catch (error) {
      return response.status(500).send({
        success: false,
        message: "Erreur lors de la récupération des plats",
        error: error.message
      })
    }
  }
}