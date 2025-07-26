import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Dish from 'App/Models/Dish'

export default class DishesController {
  public async like({ params, response }: HttpContextContract) {
    const dish = await Dish.findOrFail(params.id)
    dish.likes++
    await dish.save()
    console.log("dish",dish)
    return response.ok(dish)
  }

  public async dislike({ params, auth, response }: HttpContextContract) {
    const dish = await Dish.findOrFail(params.id)
    dish.dislikes++
    await dish.save()
    return response.ok(dish)
  }




  public async index({response, params }: HttpContextContract) {
    try {
      const restaurantId = params.id

    

      // Pour les autres rôles, on ne renvoie que les plats actifs
      const dishes = await Dish.query()
        .where('restaurant_id', restaurantId)
        // .where('is_active', true)
        .orderBy('created_at', 'desc')


        // console.log("dishes",dishes)
      return response.send({
        success: true,
        dishes,
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