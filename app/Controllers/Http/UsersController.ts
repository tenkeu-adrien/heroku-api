import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
// app/Controllers/Http/UsersController.ts
import User from 'App/Models/User'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Ride from 'App/Models/Ride'
import PromoCode from 'App/Models/PromoCode'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'
import PushToken from 'App/Models/PushToken'
// import S3 from '@aws-sdk/client-S3'
import { v4 as uuidv4 } from 'uuid'
import Env from '@ioc:Adonis/Core/Env'

// const s3 = new S3({
//   accessKeyId: Env.get('S3_KEY'),
//   secretAccessKey: Env.get('S3_SECRET'),
//   region: Env.get('S3_REGION'),
//   signatureVersion: 'v4',
// })

export default class UsersController {
  public async indexx({ request, response }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 5)
    const searchTerm = request.input('search', '')
    const roleFilter = request.input('role', 'all')
    const regionFilter = request.input('region', 'all')
  console.log("ici je vais le get des users")
    // Construction de la requête de base avec les relations
    let query = User.query()
      .select('users.*')
      .withCount('clientRides', (query) => {
        query.as('client_rides_count')
      })
      .withCount('driverRides', (query) => {
        query.as('driver_rides_count')
      })
      .withAggregate('clientRides', (query) => {
        query.sum('distance').as('client_distance_total')
      })
      .withAggregate('driverRides', (query) => {
        query.sum('distance').as('driver_distance_total')
      })
      .withAggregate('clientRides', (query) => {
        query.sum('duration').as('client_duration_total')
      })
      .withAggregate('driverRides', (query) => {
        query.sum('duration').as('driver_duration_total')
      })
      .withAggregate('driverRides', (query) => {
        query.sum('price').as('driver_revenue')
          .where('status', 'completed')
      })
      .orderBy('created_at', 'desc')
  
    // Application des filtres
    if (searchTerm) {
      query.where((builder) => {
        builder
          .where('first_name', 'like', `%${searchTerm}%`)
          .orWhere('phone', 'like', `%${searchTerm}%`)
      })
    }
  
    if (roleFilter !== 'all') {
      query.where('role', roleFilter)
    }
  
    if (regionFilter !== 'all') {
      query.where('ville', regionFilter)
    }
  
    // Exécution de la requête paginée
    const users = await query.paginate(page, limit)
  
    // Formatage de la réponse (identique à la version précédente)
    return response.json({
      success: true,
      data: {
        meta: users.getMeta(),
        users: users.all().map(user => ({
          ...user.toJSON(),
          revenue: Number(user.$extras.driver_revenue || 0),
          rides_stats: {
            count: {
              total: Number(user.$extras.client_rides_count) + Number(user.$extras.driver_rides_count),
              as_client: Number(user.$extras.client_rides_count),
              as_driver: Number(user.$extras.driver_rides_count)
            },
            distance: {
              total: Number(user.$extras.client_distance_total) + Number(user.$extras.driver_distance_total),
              as_client: Number(user.$extras.client_distance_total),
              as_driver: Number(user.$extras.driver_distance_total)
            },
            duration: {
              total: Number(user.$extras.client_duration_total) + Number(user.$extras.driver_duration_total),
              as_client: Number(user.$extras.client_duration_total),
              as_driver: Number(user.$extras.driver_duration_total)
            }
          }
        }))
      },
      message: "Users retrieved successfully"
    })
  }
  public async index({ request, response }: HttpContextContract) {
  const page = request.input('page', 1)
  const limit = request.input('limit', 10)
  const searchTerm = request.input('search', '')
  const roleFilter = request.input('role', 'all')
  const regionFilter = request.input('region', 'all')

  // Construction de la requête de base
  let query = User.query()
    .select('users.*')
    .withCount('clientRides', (q) => q.as('client_rides_count'))
    .withCount('driverRides', (q) => q.as('driver_rides_count'))
    .withAggregate('clientRides', (q) => q.sum('distance').as('client_distance_total'))
    .withAggregate('driverRides', (q) => q.sum('distance').as('driver_distance_total'))
    .withAggregate('clientRides', (q) => q.sum('duration').as('client_duration_total'))
    .withAggregate('driverRides', (q) => q.sum('duration').as('driver_duration_total'))
    .withAggregate('driverRides', (q) => {
      q.sum('price').as('driver_revenue').where('status', 'completed')
    })
    .orderBy('created_at', 'desc')

  // Filtres classiques
  if (searchTerm) {
    query.where((builder) => {
      builder
        .where('first_name', 'like', `%${searchTerm}%`)
        .orWhere('phone', 'like', `%${searchTerm}%`)
    })
  }

  if (roleFilter !== 'all') {
    query.where('role', roleFilter)
  }

  if (regionFilter !== 'all') {
    query.where('ville', regionFilter)
  }

  // === AJOUT CRUCIAL : Charger les ratings avec commentaires pour les chauffeurs ===
  query.preload('receivedRatings', (ratingsQuery) => {
    ratingsQuery
      .select('rating', 'comment', 'created_at', 'user_id')
      .whereNotNull('comment') // Optionnel : seulement les avis avec commentaire
      .orderBy('created_at', 'desc')
      .limit(limit) // Tu peux augmenter si besoin
  })

  // Calcul de la moyenne des notes (directement en DB, ultra rapide)
  query.withAggregate('receivedRatings', (agg) => {
    agg.avg('rating').as('average_rating')
  })

  // Exécution
  const users = await query.paginate(page, limit)

  // Formatage de la réponse (identique à avant + ratings)
  return response.json({
    success: true,
    data: {
      meta: users.getMeta(),
      users: users.all().map((user) => {
        const json = user.toJSON()

        // Si c'est un chauffeur, on ajoute les ratings
        const isDriver = ['driver', 'deliverer'].includes(user.role)
        const ratings = isDriver ? (user.receivedRatings || []) : []
        const averageRating = isDriver 
          ? parseFloat(user.$extras.average_rating || '0').toFixed(1)
          : null

        return {
          ...json,
          revenue: Number(user.$extras.driver_revenue || 0),
          average_rating: averageRating, // ← nouveau champ
          ratings_count: ratings.length, // ← nombre d'avis
          ratings: ratings.map(r => ({
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
          })),
          rides_stats: {
            count: {
              total: Number(user.$extras.client_rides_count) + Number(user.$extras.driver_rides_count),
              as_client: Number(user.$extras.client_rides_count),
              as_driver: Number(user.$extras.driver_rides_count),
            },
            distance: {
              total: Number(user.$extras.client_distance_total) + Number(user.$extras.driver_distance_total),
              as_client: Number(user.$extras.client_distance_total),
              as_driver: Number(user.$extras.driver_distance_total),
            },
            duration: {
              total: Number(user.$extras.client_duration_total) + Number(user.$extras.driver_duration_total),
              as_client: Number(user.$extras.client_duration_total),
              as_driver: Number(user.$extras.driver_duration_total),
            },
          },
        }
      }),
    },
    message: 'Users retrieved successfully',
  })
}


// public async getPresignedUrl({ request, params, auth }: HttpContextContract) {
//     const user = auth.user!
//     const conversationId = params.id
//     const { fileType } = request.only(['fileType']) // ex: image/jpeg

//     const extension = fileType === 'image/png' ? 'png' : 'jpg'
//     const key = `chat/${conversationId}/${uuidv4()}.${extension}`

//     const uploadUrl = s3.getSignedUrl('putObject', {
//       Bucket: Env.get('S3_BUCKET'),
//       Key: key,
//       ContentType: fileType,
//       ACL: 'public-read',
//       Expires: 300, // 5 minutes
//     })

//     const publicUrl = `https://${Env.get('S3_BUCKET')}.s3.amazonaws.com/${key}`

//     return   Response.json({ uploadUrl, key, publicUrl })


//   } 
  
  public async show({ params ,response }: HttpContextContract) {
     let user = await User.findOrFail(params.id)
      
   return   response.send({success:true , user  ,message:"user get succefully"})
  }

 public async updated({ params, request, response }: HttpContextContract) {
    const user = await User.findOrFail(params.id)
    const userSchema = schema.create({

        avatar: schema.string.optional(),
        is_deleted: schema.boolean.optional()
    })

    const data = await request.validate({ schema: userSchema })

    // Mettre à jour les champs de base
   
    // Gérer le avatar si fourni
    if (data.avatar) {
        user.avatar = data.avatar
    } 
    // Si aucun avatar n'est fourni, mettre is_deleted à true
    else if (data.is_deleted !== undefined) {
        user.isDeleted = data.is_deleted
    } else {
        // Si aucun des deux n'est fourni, par défaut on met is_deleted à true
        user.isDeleted = true
    }

    await user.save()

    return response.ok(user)
}

  public async destroy({ params, response }: HttpContextContract) {
    let user = await User.findOrFail(params.id)
    user.isDeleted =true 
    let userDelete = await user.save()
console.log(userDelete ,"userDelete")
    // return response.noContent()
    return   response.send({success:true , userDelete  ,message:"user delete succefully"})
  }

  public async availableDrivers({ request, response }: HttpContextContract) {
    try {
      const vehicleType = request.input('vehicleType')

      if (!vehicleType) {
        return response.badRequest({ success: false, message: 'Le type de véhicule est requis.' })
      }

      const drivers = await User.query()
        .where('role', 'driver')
        .andWhere('vehicule_type', vehicleType)
        .andWhere('is_verified', true)
        .andWhere('is_deleted', false)

      return response.ok({
        success: true,
        drivers,
        message: 'Liste des chauffeurs disponibles récupérée avec succès.',
      })
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des chauffeurs disponibles :', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur serveur lors de la récupération des chauffeurs disponibles.',
      })
    }
  }

    public async updateFcmToken({ request, params, response }: HttpContextContract) {
    try {
      const userId = params.id
      const token = request.input('token')

      if (!token) {
        return response.badRequest({ success: false, message: 'Token FCM manquant.' })
      }

      const user = await User.findOrFail(userId)
      user.fcmToken = token
      await user.save()

      return response.ok({
        success: true,
        message: 'Token FCM enregistré avec succès.',
      })
    } catch (error) {
      console.error('❌ Erreur enregistrement FCM token:', error)
      return response.internalServerError({
        success: false,
        message: 'Erreur serveur lors de l’enregistrement du token.',
      })
    }
  }


  public async promo({ request, params, response  }: HttpContextContract) {


    // console.log("userIds code apis" ,params.user_id)

    const validationSchema = schema.create({
      code: schema.string({ trim: true }, [
        rules.maxLength(20),
        rules.unique({ table: 'promo_codes', column: 'code' }),
      ]),
      discount: schema.number([rules.range(1, 100)]),
      rides_count: schema.number(),
      start_date: schema.date(),
      end_date: schema.date(),
    })

    const data = await request.validate({ schema: validationSchema })


    const promoCode = await PromoCode.create({
      userId: params.user_id , 
      ...data,
    })

    return response.created(promoCode)
  }

    public async completedRides({ params, response}: HttpContextContract) {
    try {
      const userId = params.user_id
      // Récupérer les courses complétées où l'utilisateur est soit client soit driver
      const rides = await Ride.query()
        .where((query) => {
          query
            .where('client_id', userId)
            .orWhere('driver_id', userId)
        })
        .andWhere('status', 'completed')
        .orderBy('completed_at', 'desc')
        
        .exec()

      // Formater la réponse
   

      return response.json({
        data:rides
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Une erreur est survenue lors de la récupération des courses',
        error: error.message
      })
    }
  }

  // Dans votre controller d'API

// Pour vérifier les promos actives par batch
 async checkActivePromos({ auth, request, response }) {
  try {
    // ✅ Validation du payload
    const promoSchema = schema.create({
      code: schema.string({ trim: true }),
    })

    const { code } = await request.validate({ schema: promoSchema })
    const user = auth.user!

    // ✅ Vérifier si le code promo est actif et valide
    const promo = await PromoCode.query()
      .where('code', code)
      .where('user_id', user.id)
      .where('is_active', true)
      .where('rides_count', '>', 'used_count')
      .where('start_date', '<=', DateTime.now().toSQL())
      .where('end_date', '>=', DateTime.now().toSQL())
      .first()

    if (!promo) {
      return response.ok({
        valid: false,
        promo: null,
        message: 'Le code promo est invalide ou expiré',
      })
    }

    // Vérifier rides_count vs used_count
    if (promo.usedCount >= promo.ridesCount) {
      return response.ok({
        valid: false,
        promo: null,
        message: 'Le code promo a déjà été utilisé au maximum',
      })
    }

    // ✅ Réponse attendue par ton frontend
    return response.ok({
      valid: true,
      promo: promo.toJSON(),
      message: 'Code promo appliqué avec succès 🎉',
    })
  } catch (error) {
    console.error('Erreur checkActivePromos:', error)
    return response.internalServerError({
      valid: false,
      promo: null,
      message: 'Erreur lors de la vérification du code promo',
    })
  }
}


 async checkActivePromosUser({request,params, response }) {
  try {
    // ✅ Validation du payload
    // const promoSchema = schema.create({
    //   code: schema.string({ trim: true }),
    // })
    // const { code } = await request.validate({ schema: promoSchema })
    const user = params.id
// console.log("user dans user ",user)
    // ✅ Vérifier si le code promo est actif et valide
    const promo = await PromoCode.query()
      // .where('code', code)
      .where('user_id', user)
      .where('is_active', true)
      .where('rides_count', '>', 'used_count')
      .where('start_date', '<=', DateTime.now().toSQL())
      .where('end_date', '>=', DateTime.now().toSQL())
      .first()

    if (!promo) {
      return response.ok({
        valid: false,
        promo: null,
        message: 'Le code promo est invalide ou expiré',
      })
    }

    // Vérifier rides_count vs used_count
    if (promo.usedCount >= promo.ridesCount) {
      return response.ok({
        valid: false,
        promo: null,
        message: 'Le code promo a déjà été utilisé au maximum',
      })
    }

    // ✅ Réponse attendue par ton frontend
    return response.ok({
      valid: true,
      promo: promo.toJSON(),
      message: 'Code promo appliqué avec succès 🎉',
    })
  } catch (error) {
    console.error('Erreur checkActivePromos:', error)
    return response.internalServerError({
      valid: false,
      promo: null,
      message: 'Erreur lors de la vérification du code promo',
    })
  }
}
// Pour obtenir la promo active d'un utilisateur
async getActivePromo({ params, response }) {
  const promo = await PromoCode.query()
    .where('user_id', params.id)
    .where('is_active', true)
    .where('rides_count', '>', 'used_count')
    .where('start_date', '<=', DateTime.now().toSQL())
    .where('end_date', '>=', DateTime.now().toSQL())
    .first()
  
  return response.ok({ data: promo || null })
}

// public async store({ auth, request }: HttpContextContract) {
//   const token = request.input('token');
//   const user = auth.user!;

//   try {
//     const existingToken = await PushToken.query()
//       .where('userId', user.id)
//       .first();

//     if (existingToken) {
//       existingToken.token = token;
//       await existingToken.save();
//     } else {
//       await PushToken.create({
//         userId: user.id,
//         token: token
//       });
//     }

//     return { success: true };
//   } catch (error) {
//   //   if (error.code === 'ER_LOCK_DEADLOCK') {
//   //     // Relancer une fois après un délai
//   //     await new Promise(resolve => setTimeout(resolve, 100));
//   //     return this.store({ auth, request }:HttpContextContract);
//   //   }
//   //   throw error;
//   return error
//   }
// }




public async store({ auth, request }: HttpContextContract) {
  const token = request.input('token')
  const user = auth.user!

  // console.log("user in push token" , user.id , token)
  try {
    // Utilise la vraie colonne de la BDD : user_id (pas userId)
    const existingToken = await PushToken.query()
      .where('user_id', user.id)    // ← ici : user_id
      .first()

    if (existingToken) {
      existingToken.token = token
      await existingToken.save()
      console.log("existingToken" , existingToken)
      return { success: true, message: 'Token updated' }
    }

    // Même chose ici : la clé étrangère s'appelle user_id
    await PushToken.create({
      userId: user.id,   // ← user_id
      token,
    })
console.log("new token created")
    return { success: true, message: 'Token saved' }
  } catch (error) {
    // En production, ne renvoie jamais l'erreur brute au front
    console.error('PushToken store error:', error)
    return { success: false, message: 'Failed to save token' }
  }
}



public async export({ response }: HttpContextContract) {
  const users = await User.all()

  // console.log("users export")
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Users')

  // En-têtes
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'First Name', key: 'firstName', width: 30 },
    { header: 'Phone', key: 'phone', width: 30 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Created At', key: 'created_at', width: 20 }
  ]

  // Données
  users.forEach(user => {
    worksheet.addRow({
      id: user.id,
      firstName: user.firstName,
      phone: user.phone,
      role: user.role,
      created_at: DateTime.fromJSDate(user.createdAt.toJSDate()).toFormat('yyyy-MM-dd HH:mm'),
    })
  })

  response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.header('Content-Disposition', 'attachment; filename="users_export.xlsx"')

  const buffer = await workbook.xlsx.writeBuffer()
  return response.send(buffer)
}


public async getDriver({response}:HttpContextContract){
  const users =  await User.query().where('role', 'driver')
        .andWhere('vehicule_type', 'moto-taxi')

  //  console.log("users" ,users)
   return   response.send({success:true , data:users  ,message:"driver get succefully"})
}

}