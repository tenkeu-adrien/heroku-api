import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Dish from 'App/Models/Dish'

export default class DishesController {
  public async like({ params, auth, response }: HttpContextContract) {
    const dish = await Dish.findOrFail(params.id)
    dish.likes++
    await dish.save()
    return response.ok(dish)
  }

  public async dislike({ params, auth, response }: HttpContextContract) {
    const dish = await Dish.findOrFail(params.id)
    dish.dislikes++
    await dish.save()
    return response.ok(dish)
  }
}