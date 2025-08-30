import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Restaurant from 'App/Models/Restaurant'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Dish from 'App/Models/Dish'

export default class RestaurantsController {
  public async store({ request, response}: HttpContextContract) {
    // Vérification des permissions (décommenter si nécessaire)
    // if (!['admin', 'manager'].includes(auth.user!.role)) {
    //   return response.unauthorized({ message: 'Unauthorized access' })
    // }
    // Schéma de validation pour le restaurant
    const restaurantSchema = schema.create({
      name: schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      cuisine: schema.string({ trim: true }, [
        rules.maxLength(50)
      ]),
      delivery_time: schema.string({ trim: true }), // Note: correspond au champ frontend
      image: schema.string({ trim: true }),
      userId:schema.number(), // On accepte aussi les URLs locales
      is_active: schema.boolean(),
      phone:schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      address:schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      // dishes: schema.array().members(
      //   schema.object().members({
      //     name: schema.string({ trim: true }, [rules.maxLength(100)]),
      //     price: schema.number(),
      //     description: schema.string({ trim: true }, [rules.maxLength(500)]),
      //     images: schema.array().members(schema.string())
      //   })
      // )
    })

    try {
      // Validation des données
      const payload = await request.validate({ 
        schema: restaurantSchema,
        messages: {
          'name.required': 'Le nom du restaurant est requis',
          'name.maxLength': 'Le nom ne doit pas dépasser 100 caractères',
          'cuisine.required': 'Le type de cuisine est requis',
          'deliveryTime.required': 'Le temps de livraison est requis',
          'dishes.*.name.required': 'Le nom du plat est requis',
          'dishes.*.price.required': 'Le prix du plat est requis',
          'dishes.*.price.number': 'Le prix doit être un nombre valide'
        }
      })

      // Création du restaurant
      const restaurant = await Restaurant.create({
        name: payload.name,
        cuisine: payload.cuisine,
        deliveryTime: payload.delivery_time,
        phone:payload.phone,
        address:payload.address,
        image: payload.image || undefined,
        isActive: payload.is_active !== undefined ? payload.is_active : true,
        createdBy: payload.userId || 1, // Utiliser l'ID de l'utilisateur connecté ou une valeur par défaut
        rating: 0, // Valeur par défaut
        isFavorite: false // Valeur par défaut
      })

      // Création des plats associés
      // if (payload.dishes && payload.dishes.length > 0) {
      //   await Promise.all(
      //     payload.dishes.map(async (dishData) => {
      //       await Dish.create({
      //         name: dishData.name,
      //         description: dishData.description || '',
      //         price: dishData.price,
      //         images: JSON.stringify(dishData.images || []),
      //         restaurantId: restaurant.id,
      //         likes: 0, // Valeurs par défaut
      //         dislikes: 0
      //       })
      //     })
      //   )
      // }

      // // Recharger le restaurant avec les relations
      // await restaurant.load('dishes')

      return response.created({
        message: "Restaurant créé avec succès",
        data: restaurant
      })

    } catch (error) {
      console.error('Erreur création restaurant:', error)
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error.messages || error.message
      })
    }
  }

  public async update({ params, request, response}: HttpContextContract) {
    const restaurant = await Restaurant.findOrFail(params.id)

    // Vérification des permissions
    // if (auth.user!.role !== 'admin' && restaurant.createdBy !== auth.user!.id) {
    //   return response.unauthorized({ message: 'Unauthorized access' })
    // }

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
      address:schema.string.optional({trim:true},[rules.maxLength(100)]),
      phone:schema.string.optional({trim:true},[rules.maxLength(100)]),
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

  public async updated({ params, request, response}: HttpContextContract) {
    // Vérification des permissions
    // if (!['admin', 'manager'].includes(auth.user!.role)) {
    //   return response.unauthorized({ message: 'Unauthorized access' })
    // }

    // Schéma de validation (identique à store mais avec champs optionnels)
    const restaurantSchema = schema.create({
      name: schema.string.optional({ trim: true }, [
        rules.maxLength(100)
      ]),
      cuisine: schema.string.optional({ trim: true }, [
        rules.maxLength(50)
      ]),
      delivery_time: schema.string.optional({ trim: true }),
      image: schema.string.optional({ trim: true }),
      is_active: schema.boolean.optional(),
      dishes: schema.array.optional().members(
        schema.object().members({
          id: schema.number.optional(), // Pour les plats existants
          name: schema.string({ trim: true }, [rules.maxLength(100)]),
          price: schema.number(),
          description: schema.string.optional({ trim: true }, [rules.maxLength(500)]),
          images: schema.array.optional().members(schema.string()),
          _deleted: schema.boolean.optional() // Pour marquer les plats à supprimer
        })
      )
    })

    try {
      // Validation des données
      const payload = await request.validate({ 
        schema: restaurantSchema,
        messages: {
          'name.maxLength': 'Le nom ne doit pas dépasser 100 caractères',
          'cuisine.maxLength': 'Le type de cuisine ne doit pas dépasser 50 caractères',
          'dishes.*.name.required': 'Le nom du plat est requis',
          'dishes.*.price.required': 'Le prix du plat est requis',
          'dishes.*.price.number': 'Le prix doit être un nombre valide'
        }
      })

      // Récupération du restaurant
      const restaurant = await Restaurant.findOrFail(params.id)

      // Mise à jour des infos du restaurant
      restaurant.merge({
        name: payload.name ?? restaurant.name,
        cuisine: payload.cuisine ?? restaurant.cuisine,
        delivery_time: payload.delivery_time ?? restaurant.delivery_time,
        image: payload.image ?? restaurant.image,
        is_active: payload.is_active ?? restaurant.is_active
      })
      await restaurant.save()

      // Gestion des plats (seulement si payload.dishes existe)
      if (payload.dishes) {
        const existingDishes = await Dish.query().where('restaurant_id', restaurant.id)
        
        await Promise.all(
          payload.dishes.map(async (dishData) => {
            // Suppression des plats marqués _deleted
            if (dishData._deleted && dishData.id) {
              await Dish.query().where('id', dishData.id).delete()
              return
            }

            // Mise à jour des plats existants
            if (dishData.id) {
              const dish = existingDishes.find(d => d.id === dishData.id)
              if (dish) {
                dish.merge({
                  name: dishData.name,
                  price: dishData.price,
                  description: dishData.description ?? dish.description,
                  images: dishData.images ? JSON.stringify(dishData.images) : dish.images
                })
                await dish.save()
                return
              }
            }

            // Création des nouveaux plats
            await Dish.create({
              name: dishData.name,
              price: dishData.price,
              description: dishData.description ?? '',
              images: JSON.stringify(dishData.images || []),
              restaurant_id: restaurant.id,
              likes: 0,
              dislikes: 0
            })
          })
        )
      }

      // Recharger le restaurant avec les relations
      await restaurant.load('dishes')

      return response.ok({
        message: "Restaurant mis à jour avec succès",
        data: restaurant
      })

    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: "Restaurant non trouvé" })
      }
      
      console.error('Erreur mise à jour restaurant:', error)
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error.messages || error.message
      })
    }
  }


  public async deleteDish({ params, response }: HttpContextContract) {
    const dish = await Dish.findOrFail(params.id)
    await dish.delete()
    return response.noContent()
  }

  public async updateDish({  request, response }: HttpContextContract) {
    // Trouver le plat à mettre à jour
    const {id} = request.params()
    const dish = await Dish.findOrFail(id)
  
    // Valider les données entrantes avec le même schéma que pour l'ajout
    const dishSchema = schema.create({
      name: schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      description: schema.string({ trim: true }),
      price: schema.number(),
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
  
      // Convertir le tableau d'images en JSON
      const imagesJson = JSON.stringify(payload.images)
      console.log("Image  ",imagesJson)
  
      // Mettre à jour le plat
      dish.merge({
        ...payload,
        images: imagesJson
      })
  
      await dish.save()
  
      return response.ok({
        message: "Plat mis à jour avec succès",
        data: dish
      })
  
    } catch (error) {
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error.messages
      })
    }
  }

  public async addDish({ params, request, response}: HttpContextContract) {
    const restaurant = await Restaurant.findOrFail(params.id)

 
    const dishSchema = schema.create({
      name: schema.string({ trim: true }, [
        rules.maxLength(100)
      ]),
      description: schema.string({ trim: true }),
      price: schema.number(),
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
      console.log("payload",payload)
      const imagesJson = JSON.stringify(payload.images)
      const dish = await restaurant.related('dishes').create({
        ...payload,
        likes: 0,   
        dislikes: 0,
        restaurantId: restaurant.id,
        images: imagesJson 
      })

      console.log("dish" ,dish)
      return response.created({
        message: "Plat ajouté avec succès",
        data: dish
      })

    } catch (error) {
      return response.status(422).send({
        message: "Erreur de validation",
        errors: error
      })
    }
  }

  public async index({ request, response }: HttpContextContract) {
    // console.log("nous sommes dans indes")
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
    const query = Restaurant.query()
    .if(search, query => {
      query.where('name', 'LIKE', `%${search}%`)
        .orWhere('cuisine', 'LIKE', `%${search}%`)
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


    // console.log("restaurants" ,restaurants)
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

public async toggleActive({ params, response }: HttpContextContract) {
  const restaurant = await Restaurant.findOrFail(params.id)
  restaurant.isActive = !restaurant.isActive
  await restaurant.save()
  return response.ok({ message: 'Restaurant desactivé' })
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