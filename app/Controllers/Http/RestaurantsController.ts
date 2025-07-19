import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Restaurant from 'App/Models/Restaurant'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Dish from 'App/Models/Dish'

export default class RestaurantsController {
  public async store({ request, response, auth }: HttpContextContract) {
    // Vérification des permissions
    if (!['admin', 'manager'].includes(auth.user!.role)) {
      return response.unauthorized({ message: 'Unauthorized access' })
    }

    // Définition du schéma de validation
    const restaurantSchema = schema.create({
      name: schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      cuisine: schema.string({ trim: true }, [
        rules.maxLength(50)
      ]),
      deliveryTime: schema.string({ trim: true }),
      image: schema.string({ trim: true }, [
        rules.url()
      ]),
      createdBy: schema.number(),
      rating: schema.number(),
      isActive: schema.boolean(),
    })

    try {
      // Validation des données
      const payload = await request.validate({ 
        schema: restaurantSchema,
        messages: {
          'name.required': 'Le nom du restaurant est requis',
          'name.maxLength': 'Le nom ne doit pas dépasser 100 caractères',
          'cuisine.required': 'Le type de cuisine est requis',
          'image.url': 'L\'image doit être une URL valide'
        }
      })

      // Création du restaurant
      const restaurant = await Restaurant.create({
        ...payload,
        createdBy: auth.user!.id,
        rating: 0, // Valeur par défaut
        isActive: true // Valeur par défaut
      })

      return response.created({
        message: "Restaurant créé avec succès",
        data: restaurant
      })

    } catch (error) {
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error.messages
      })
    }
  }

  public async update({ params, request, response, auth }: HttpContextContract) {
    const restaurant = await Restaurant.findOrFail(params.id)

    // Vérification des permissions
    if (auth.user!.role !== 'admin' && restaurant.createdBy !== auth.user!.id) {
      return response.unauthorized({ message: 'Unauthorized access' })
    }

    // Schéma de validation pour la mise à jour (tous les champs optionnels)
    const updateSchema = schema.create({
      name: schema.string.optional({ trim: true }, [
        rules.maxLength(100)
      ]),
      cuisine: schema.string.optional({ trim: true }, [
        rules.maxLength(50)
      ]),
      deliveryTime: schema.string.optional({ trim: true }),
      image: schema.string.optional({ trim: true }, [
        rules.url()
      ]),
      rating: schema.number.optional(),
      isActive: schema.boolean.optional()
    })

    try {
      const payload = await request.validate({ 
        schema: updateSchema,
        messages: {
          'name.maxLength': 'Le nom ne doit pas dépasser 100 caractères',
          'image.url': 'L\'image doit être une URL valide',
          'rating.number': 'La note doit être un nombre'
        }
      })

      // Mise à jour du restaurant
      restaurant.merge(payload)
      await restaurant.save()

      return response.ok({
        message: "Restaurant mis à jour avec succès",
        data: restaurant
      })

    } catch (error) {
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error.messages
      })
    }
  }

  public async addDish({ params, request, response, auth }: HttpContextContract) {
    const restaurant = await Restaurant.findOrFail(params.id)

    // Vérification des permissions
    if (auth.user!.role !== 'admin' && restaurant.createdBy !== auth.user!.id) {
      return response.unauthorized({ message: 'Unauthorized access' })
    }

    // Schéma de validation pour les plats
    const dishSchema = schema.create({
      name: schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      description: schema.string({ trim: true }),
      price: schema.number([
        rules.range(0.1, 10000) // Prix entre 0.1 et 10000
      ]),
      images: schema.array().members(
        schema.string({}, [
          rules.url()
        ])
      )
    })

    try {
      const payload = await request.validate({ 
        schema: dishSchema,
        messages: {
          'name.required': 'Le nom du plat est requis',
          'description.required': 'La description est requise',
          'price.required': 'Le prix est requis',
          'price.range': 'Le prix doit être entre 0.1 et 10000',
          'images.*.url': 'Les images doivent être des URLs valides'
        }
      })

      // Création du plat
      const dish = await restaurant.related('dishes').create({
        ...payload,
        likes: 0,   
        dislikes: 0,
        restaurantId: restaurant.id,
        images: payload.images.join(',')
      })

      return response.created({
        message: "Plat ajouté avec succès",
        data: dish
      })

    } catch (error) {
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error.messages
      })
    }
  }



  public async index({ request, response }: HttpContextContract) {
    console.log("nous sommes dans indes")
    const { 
      page = 1, 
      per_page = 8, 
      search, 
      status, 
      cuisine, 
      start_date, 
      end_date,
      with_dishes = false
    } = request.qs()
console.log("nous sommes dans index")
    const query = Restaurant.query()
      .if(search, query => {
        query.where('name', 'ILIKE', `%${search}%`)
          .orWhere('cuisine', 'ILIKE', `%${search}%`)
      })
      .if(status, query => {
        query.where('is_active', status === 'active')
      })
      .if(cuisine, query => {
        query.where('cuisine', cuisine)
      })
      .if(start_date && end_date, query => {
        query.whereBetween('created_at', [start_date, end_date])
      })
      .orderBy('created_at', 'desc')

    if (with_dishes) {
      query.preload('dishes', dishesQuery => {
        dishesQuery.orderBy('created_at', 'desc')
      })
    }

    // Compter les plats pour chaque restaurant
    query.withCount('dishes')

    const restaurants = await query.paginate(page, per_page)

    return response.ok({
      data: restaurants.serialize().data,
      meta: restaurants.serialize().meta
    })
  }

  public async export({ response }: HttpContextContract) {
    const restaurants = await Restaurant.query()
      .preload('dishes')
      .orderBy('created_at', 'desc')

    // Ici vous devriez utiliser une librairie comme exceljs pour générer le fichier Excel
    // Pour cet exemple, nous retournons simplement un JSON
    return response.ok(restaurants)
  }

  public async toggleFavorite({ params, response }: HttpContextContract) {
    const restaurant = await Restaurant.findOrFail(params.id)
    
    await Database.transaction(async (trx) => {
      restaurant.useTransaction(trx)
      restaurant.isFavorite = !restaurant.isFavorite
      await restaurant.save()
    })

    return response.ok({
      message: 'Favorite status updated',
      isFavorite: restaurant.isFavorite
    })
  }

  public async destroy({ params, response }: HttpContextContract) {
    const restaurant = await Restaurant.findOrFail(params.id)
    
    await Database.transaction(async (trx) => {
      restaurant.useTransaction(trx)
      
      // Supprimer d'abord tous les plats
      await Dish.query()
        .where('restaurant_id', restaurant.id)
        .useTransaction(trx)
        .delete()

      // Puis supprimer le restaurant
      await restaurant.delete()
    })

    return response.noContent()
  }
}