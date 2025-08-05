// app/Controllers/Http/RidesController.ts
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Ride from 'App/Models/Ride'
import { schema } from '@ioc:Adonis/Core/Validator'
import { DateTime } from 'luxon'
import Database from '@ioc:Adonis/Lucid/Database'
import Ws from 'App/Services/Ws'
import ExcelJS from 'exceljs'
import NotificationService from 'App/Services/NotificationService'
import PushToken from 'App/Models/PushToken'
import axios from 'axios'
import User from 'App/Models/User'
import Rating from 'App/Models/Rating'
export default class RidesController {
  public async index({ request,response }: HttpContextContract) {
    // const user = auth.user!
    console.log("request per_page" ,request.params)
    const page = request.input('page', 1)
    const limit = request.input('per_page', 10)
   const user={
    id:1,
    role:"admin"
   }
    const query = Ride.query()
      .preload('client')
      .preload('driver')
  
    if (user.role === 'client') {
      query.where('client_id', user.id)
    } else if (user.role === 'driver') {
      query.where('driver_id', user.id)
    } else if (user.role === 'admin') {
      // Ne filtre pas, il verra tout
    }
  
    if (request.input('status')) {
      query.where('status', request.input('status'))
    }
  
    let  rides = await query.paginate(page, limit)
   return  response.send({"message" :"rides get success" ,rides})
    
  }

  public async history({ request, response }: HttpContextContract) {
    const page = request.input('page', 1)
    const perPage = request.input('per_page', 8)
    const search = request.input('search', '')
    const status = request.input('status')
    const paymentMethod = request.input('payment_method')
    const vehicleType = request.input('vehicle_type')
    const rideType = request.input('ride_type') // '1' pour livraison, '0' pour normal
    const startDate = request.input('start_date')
    const endDate = request.input('end_date')

    const query = Ride.query()
      .preload('client', (clientQuery) => {
        clientQuery.select(['id', 'first_name', 'phone'])
      })
      .preload('driver', (driverQuery) => {
        driverQuery.select(['id', 'first_name'])
      })
      .orderBy('created_at', 'desc')

    // Filtre par statut
    if (status) {
      query.where('status', status)
    }

    // Filtre par méthode de paiement
    if (paymentMethod) {
      query.where('payment_method', paymentMethod)
    }

    // Filtre par type de véhicule
    if (vehicleType) {
      query.where('vehicle_type', vehicleType)
    }

    // Filtre par type de course (livraison ou normale)
    if (rideType !== undefined) {
      if (rideType === '1') {
        query.whereNotNull('recipient')
      } else {
        query.whereNull('recipient')
      }
    }

    // Filtre par période
    if (startDate && endDate) {
      query.whereBetween('created_at', [
        DateTime.fromISO(startDate).toSQL(),
        DateTime.fromISO(endDate).toSQL()
      ])
    }

    // Recherche
    if (search) {
      query.where((builder) => {
        builder
          .where('id', 'like', `%${search}%`)
          .orWhereHas('client', (clientBuilder) => {
            clientBuilder
              .where('first_name', 'like', `%${search}%`)
              .orWhere('phone', 'like', `%${search}%`)
          })
          .orWhereHas('driver', (driverBuilder) => {
            driverBuilder.where('first_name', 'like', `%${search}%`)
          })
          .orWhere('recipient', 'like', `%${search}%`)
      })
    }

    const rides = await query.paginate(page, perPage)

    return response.json({
      message: 'Rides retrieved successfully',
      rides
    })
  }



  
  public async indexx({ auth, request, response }: HttpContextContract) {
    await auth.authenticate()
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = 10
    const status = request.input('status', 'pending')

    let query = Ride.query()
      .orderBy('created_at', 'desc')
      .preload('driver')
      // .preload('client')

    if (user.role === 'client') {
      query = query.where('client_id', user.id)
    } else if (user.role === 'driver') {
      if (status.includes('pending')) {
        // Si le statut contient 'pending', on applique les filtres spécifiques
        query = query
          .whereIn('status', ['pending' ,'accepted'])
          .where('vehicle_type', user.vehicule_type) // Filtrer par type de véhicule du driver
      } else {
        // Pour les autres statuts, on filtre par driver_id
        query = query.where('driver_id', user.id)
      }
    }

    if (status !== 'all') {
      // Si le statut contient plusieurs valeurs séparées par des virgules
      if (status.includes(',')) {
        const statuses = status.split(',')
        query = query.whereIn('status', statuses)
      } else {
        query = query.where('status', status)
      }
    }

    const rides = await query.paginate(page, limit)

    // Sérialisation manuelle
    const serializedRides = rides.serialize().data.map(ride => ({
      ...ride,
      pickup_location: typeof ride.pickup_location === 'string' 
        ? ride.pickup_location 
        : JSON.stringify(ride.pickup_location),
      destination_location: typeof ride.destination_location === 'string'
        ? ride.destination_location
        : JSON.stringify(ride.destination_location),
      driver: ride.driver ? {
        ...ride.driver
      } : null,
      client: ride.client ? {
        ...ride.client
      } : null
    }))

    return response.json({
      success: true,
      message: "rides get success",
      rides: {
        data: serializedRides,
        meta: rides.serialize().meta
      }
    })
}



  public async get({ response }: HttpContextContract) {
  const rides = await Ride.query()
    .where('status', 'completed')
  
    .orderBy('completed_at', 'desc') // tri facultatif, mais utile

  return response.json({
    message: 'Completed rides fetched successfully',
    data: rides.map(ride => ride.serialize())
  })
}


// Controller corrigé
public async store({ request, response , auth}: HttpContextContract) {
  // console.log("request", request.body())

  // Récupération des données brutes pour vérifier le type de véhicule
  const rawData = request.all()
  let vehicleType = rawData.vehicleType
// console.log("auth dans le controller" ,auth)
  // Transformation de "livraison" en "moto-taxi"
  if (vehicleType === 'livraison') {
    vehicleType = 'moto-taxi'
  }

  const schemaRide = schema.create({
    vehicleType: schema.enum(['moto-taxi', 'tricycle'] as const),
    paymentMethod: schema.enum(['cash', 'orange_money', 'mobile_money'] as const),
    duration: schema.string.optional(),
    distance: schema.number.optional(),
    price: schema.number(),
    pickupLocation: schema.object().members({
      address: schema.string(),
      coordinates: schema.object().members({
        latitude: schema.number(),
        longitude: schema.number()
      })
    }),
    destinationLocation: schema.object().members({
      address: schema.string(),
      coordinates: schema.object().members({
        latitude: schema.number(),
        longitude: schema.number()
      })
    }),
    scheduled_at: schema.date.optional()
  })

  // On fusionne les données modifiées avec les données originales
  const payload = {
    ...request.all(),
    vehicleType
  }

  try {
    const data = await request.validate({ 
      schema: schemaRide,
      data: payload // On utilise les données modifiées pour la validation
    })

    // console.log("data après validation", data)

    const ride = await Ride.create({
      vehicleType: data.vehicleType,
      paymentMethod: data.paymentMethod,
      duration: data.duration,
      distance: data.distance,
      price: data.price,
      recipient: request.input("recipientInfo") || null,
      pickupLocation: JSON.stringify(data.pickupLocation),
      destinationLocation: JSON.stringify(data.destinationLocation),
      scheduledAt: data.scheduled_at,
      clientId: auth?.user?.id,
      status: 'pending'
    })

    // Emit new ride event

//     await NotificationService.sendToDrivers(
//   'Nouvelle course disponible',
//   'Une nouvelle course est en attente.',
//   { rideId: ride}
// );

    const io = Ws.io
    io.emit('ride:new', {
      rideId: ride.id,
      id:ride.id,
      clientId: ride.clientId,
      pickup_location: ride.pickupLocation,
      destination_location: ride.destinationLocation,
      status: ride.status,
      price:ride.price,
      vehicle_type: ride.vehicleType ,
      duration:ride.duration || null,
      distance:ride.distance || null,
      payment_method :ride.paymentMethod,
      created_at:ride.createdAt,
    })


// console.log("ride dans le controllers " ,ride.destinationLocation)

    return response.send({
      message: "Ride created successfully",
      ride
    })
  } catch (error) {
    // console.error('Validation error:', error.messages)
    return response.status(422).send(error.messages)
  }
}


 public async updatePosition({ request, response, params }: HttpContextContract) {
    const { id } = params
 

    // console.log("position" , request.body())
    // console.log("nous sommes dans position")
    const ride = await Ride.findOrFail(id)
    // console.log("ma position" ,position)
    // Mettre à jour la position
    ride.merge({
      driverLatitude: request.input("driver_latitude"),
      driverLongitude: request.input("driver_longitude")
    })

    await ride.save()

    // Informer le client
      const io = Ws.io
    io.to(`ride-${ride.id}-client`).emit('driver:position', {
      rideId: ride.id,
    })

    return response.noContent()
  }


  public  async getDriverRatings({request}) {
const {id:driverId} = request.params("id")
    console.log("averageQuery" ,driverId)
    const averageQuery = await Rating.query()
      .where('driver_id', driverId)
      // .andWhere('is_driver_rating', true)
      .avg('rating as avg')
      .first()
  
  
    const averageRating = averageQuery?.$extras.avg ? parseFloat(averageQuery.$extras.avg).toFixed(1) : '0.0'
  
    const ratings = await Rating.query()
      .where('driver_id', driverId)
      // .andWhere('is_driver_rating', true)
      .select(['rating', 'comment', 'created_at'])
      .orderBy('created_at', 'desc')
      .limit(10) // pour éviter d'envoyer trop de data, on limite aux 10 derniers
  
    return {
      averageRating,
      ratings,
    }
  }

 public async updateStatus({ params, request, auth, response }: HttpContextContract) {
  // 1. Validation des données
  const user = await auth.authenticate()
  const statusSchema = schema.create({
    status: schema.enum(['requested', 'accepted', 'in_progress', 'completed', 'cancelled'] as const),
    // position: schema.object.optional().members({
    //   latitude: schema.number(),
    //   longitude: schema.number()
    // }),
    driver_latitude: schema.string.optional(),
    driver_longitude: schema.string.optional(),
    // last_position_update: schema.string.optional()
  })

  const payload = await request.validate({ schema: statusSchema })
  const { status ,driver_latitude,driver_longitude} = payload


  // 2. Récupération de la course
  const ride = await Ride.findOrFail(params.id)
  
  // 3. Vérification si le statut est déjà 'accepted'
  if (status === 'accepted' && ride.status === 'accepted') {
    return response.conflict({ 
      success: false,
      message: 'Cette course a déjà été acceptée par un autre chauffeur.' 
    })
  }

  // 4. Authentification
 
  // 5. Gestion des statuts
  switch (status) {
    case 'accepted':
      // Vérification du rôle
      if (user.role !== 'driver') {
        return response.unauthorized({ 
          success: false,
          message: 'Seuls les chauffeurs peuvent accepter des courses.' 
        })
      }

      // Mise à jour des informations
      ride.merge({
        driverId: user.id,
        status: 'accepted',
        startedAt: DateTime.now(),
        driverLatitude: driver_latitude || undefined,
        driverLongitude: driver_longitude || undefined,
        lastPositionUpdate: DateTime.now(),
        updatedAt: DateTime.now()
      })
      await ride.save()
      break

    case 'in_progress':
      if (user.role !== 'driver' || ride.driverId !== user.id) {
        return response.unauthorized({ 
          success: false,
          message: 'Seul le chauffeur assigné peut démarrer la course.' 
        })
      }
      ride.status = 'in_progress'
      break

    case 'completed':
      if (user.role !== 'driver' || ride.driverId !== user.id) {
        return response.unauthorized({ 
          success: false,
          message: 'Seul le chauffeur assigné peut terminer la course.' 
        })
      }
      ride.merge({
        status: 'completed',
        endedAt: DateTime.now()
      })
      await ride.save()
      break

    case 'cancelled':
      return response.badRequest({ 
        success: false,
        message: 'Veuillez utiliser la route dédiée pour annuler une course.' 
      })

    case 'requested':
      return response.badRequest({ 
        success: false,
        message: 'Impossible de réinitialiser le statut d\'une course.' 
      })
  }

  // 6. Sauvegarde de la course
   await ride.load('driver')



  // 7. Envoi de notification et mise à jour en temps réel
  if (status === 'accepted') {
    // Récupération des infos complètes du chauffeur
    const driver = await User.query()
      .where('id', user?.id)
      .select(['id', 'first_name', 'phone', 'vehicule_type'])
      .firstOrFail()

    // Envoi de notification
    await NotificationService.sendToUser(
      ride.clientId,
      'Course acceptée',
      `Le chauffeur ${driver.firstName} a accepté votre course.`,
      { rideId: ride.id }
    )


    // Émission socket.io
    const io = Ws.io
    io.to(`ride_${ride.id}`).emit('ride:accepted', {
      rideId: ride.id,
      driverInfo: {
        id: ride.driver.id,
        first_name: ride.driver.firstName,
        vehicule_type: ride.driver.vehiculeType,
        phone: ride.driver.phone
      },
      driverPosition: {
        latitude: ride.driverLatitude,
        longitude: ride.driverLongitude
      }
     
    })

  } else {
    // Émission standard pour les autres statuts
    Ws.io.to(`ride_${ride.id}`).emit('ride:status', {
      rideId: ride.id,
      status: ride.status
    })
  }

  // 8. Réponse API
  return response.ok({ 
    success: true,
    message: `Statut de la course mis à jour: ${status}`,
    data: {
      ride: ride.serialize(),
      driverInfo: status === 'accepted' ? {
        name: user.firstName,
        rating: user.averageRating,
        vehicle: user.vehiculeType
      } : undefined
    }
  })
}
  




  // Dans votre contrôleur RidesController.js

public async revenueStats({ response }) {
  try {
    const revenueStats = await Database
      .query()
      .select(
        Database.raw('EXTRACT(MONTH FROM completed_at) as month'),
        Database.raw('SUM(price) as total_revenue')
      )
      .from('rides')
      .where('status', 'completed')
      .whereRaw('EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM NOW())')
      .groupByRaw('EXTRACT(MONTH FROM completed_at)')
      .orderBy('month');

    const monthlyData = Array(12).fill(0);
    revenueStats.forEach(row => {
      monthlyData[row.month - 1] = parseFloat(row.total_revenue);
    });

    return response.ok(monthlyData);
  } catch (error) {
    return response.status(500).send({
      message: 'Erreur lors de la récupération des statistiques de revenus',
      error: error.message
    });
  }
}
_formatPaymentMethod(method) {
  const methods = {
    'cash': 'Espèces',
    'orange_money': 'Orange Money',
    'mobile_money': 'Mobile Money'
  };
  return methods[method] || method;
}

async paymentDistribution({ response }) {
  try {
    const distribution = await Database
      .query()
      .select(
        'payment_method as method',
        Database.raw('COUNT(*) as count'),
        Database.raw('SUM(price) as amount')
      )
      .from('rides')
      .where('status', 'completed')
      .where("is_paid" ,true)
      .groupBy('payment_method');

    const formattedData = distribution.map(row => ({
      method: this._formatPaymentMethod(row.method),
      count: parseInt(row.count),
      amount: parseFloat(row.amount)
    }));

    return response.ok(formattedData);
  } catch (error) {
    return response.status(500).send({
      message: 'Erreur lors de la récupération de la répartition des paiements',
      error: error.message
    });
  }
}





  

  public async getRideById({ params, auth, response }: HttpContextContract) {
    const ride = await Ride.findOrFail(params.id)
  
    const user = auth.user!
  
    if (user.role === 'client' && ride.clientId !== user.id) {
      return response.unauthorized({success:false , message: 'Accès interdit à cette course.' })
    }
  
    if (user.role === 'driver' && ride.driverId !== user.id) {
      return response.unauthorized({ success:false , message: 'Accès interdit à cette course.' })
    }
  
    // Si admin ou autorisé, on retourne la course
    return response.ok({succcess:true, message: 'ride  envoyer avec success', ride })
  }
  


  public async cancelRide({ params, auth, response }: HttpContextContract) {
    const ride = await Ride.findOrFail(params.id)
    const user = auth.user!

    // Admin peut toujours annuler
    if (user.role === 'admin') {
      ride.status = 'cancelled'
      await ride.save()
      return response.ok({ success:true, message: 'Course annulée par l\'admin.', ride })
    }

    // Client peut annuler seulement s'il est le propriétaire
    if (user.role === 'client') {
      if (ride.clientId !== user.id) {
        return response.unauthorized({ success:false, message: 'Vous n\'êtes pas le propriétaire de cette course.' })
      }

      // Ne peut pas annuler si déjà annulée, complétée ou en cours
      if (ride.status === 'cancelled') {
        return response.badRequest({ success:false, message: 'Cette course est déjà annulée.' })
      }
      if (ride.status === 'completed') {
        return response.badRequest({ success:false, message: 'Impossible d\'annuler une course déjà complétée.' })
      }
      if (ride.status === 'in_progress') {
        return response.badRequest({ success:false, message: 'Impossible d\'annuler une course en cours.' })
      }

      // Peut annuler si pending ou accepted
      ride.status = 'cancelled'
      await ride.save()
      return response.ok({ success:true, message: 'Course annulée.', ride })
    }

    // Chauffeur ne peut pas annuler (selon vos nouvelles exigences)
    if (user.role === 'driver') {
      return response.unauthorized({ success:false, message: 'Les chauffeurs ne peuvent pas annuler les courses.' })
    }

    return response.badRequest({ success:false, message: 'Annulation non autorisée pour ce rôle.' })
  }








 public async show({ params, response }: HttpContextContract) {
  const userId = params.id // L'ID de l'utilisateur passé dans les paramètres

  const rides = await Ride.query()
    .where((query) => {
      query.where('client_id', userId) // Rides où l'utilisateur est client
           .orWhere('driver_id', userId) // Ou rides où l'utilisateur est driver
    })
    .preload('client') // Charge les données du client
    .preload('driver') // Charge les données du driver
    .exec() // Récupère tous les résultats (sans pagination)

  return response.send({
    message: "User rides retrieved successfully",
    data: rides // Retourne tous les rides en une seule fois
  })
}



public async export({ response }: HttpContextContract) {
  const rides = await Ride.query()
    .preload('client')
    .preload('driver')

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Rides')

  // En-têtes
  worksheet.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Client', key: 'client' },
    { header: 'Chauffeur', key: 'driver' },
    { header: 'Type de véhicule', key: 'vehicleType' },
    { header: 'Départ', key: 'pickupLocation' },
    { header: 'Destination', key: 'destinationLocation' },
    { header: 'Distance (km)', key: 'distance' },
    { header: 'Durée', key: 'duration' },
    { header: 'Prix (FCFA)', key: 'price' },
    { header: 'Méthode de paiement', key: 'paymentMethod' },
    { header: 'Statut', key: 'status' },
    { header: 'Date de création', key: 'createdAt' },
  ]

  // Contenu
  rides.forEach((ride) => {
    worksheet.addRow({
      id: ride.id,
      client: ride.client ? ride.client.firstName || `${ride.client.firstName} ${ride.client.phone}` : 'Inconnu',
      driver: ride.driver ? ride.driver.firstName || `${ride.driver.firstName} ${ride.driver.phone}` : 'Aucun',
      vehicleType: ride.vehicleType,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      distance: ride.distance,
      duration: ride.duration,
      price: ride.price,
      paymentMethod: ride.paymentMethod,
      status: ride.status,
      createdAt: ride.createdAt.toFormat('yyyy-MM-dd HH:mm'),
    })
  })

  // Générer le buffer Excel
  const buffer = await workbook.xlsx.writeBuffer()

  response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.header('Content-Disposition', 'attachment; filename="rides_export.xlsx"')
  return response.send(buffer)
}

 public async notifyAvailableDrivers({ request, response }: HttpContextContract) {
    const { ride } = request.only(['ride'])

    if (!ride) {
      return response.status(400).send({ error: 'Ride data is required' })
    }
// console.log("ride new" ,ride)
    const vehicleType = ride.vehicle_type

    const tokens = await PushToken
      .query()
      .preload('user', q => {
        q.where('role', 'driver')
         .where('vehicule_type', vehicleType)
        //  .where('is_available', true) // ton flag de connexion
        //  .where('is_on_ride', false)  // ton flag de course
      })

    const messages: any[] = [];


    for (const t of tokens) {
      const pushRes = await axios.post('https://exp.host/--/api/v2/push/send', {
        to: t.token,
        sound: 'default',
        title: 'Nouvelle course disponible',
        body: 'Une nouvelle course est en attente.',
        data: {
          rideId: ride
        }
      })

      messages.push({
        token: t.token,
        response: pushRes.data
      })

    }

    return response.send({ status: 'ok', sent: messages.length })
  }


}