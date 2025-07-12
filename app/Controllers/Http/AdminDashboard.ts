import ExcelJS from 'exceljs';
// app/Controllers/Http/StatsController.ts

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Ride from 'App/Models/Ride'
import { DateTime } from 'luxon'

export default class StatsController {
 public async getDashboardStats({ response }: HttpContextContract) {
  try {
    const today = DateTime.now().toSQLDate()
    const currentMonthStart = DateTime.now().startOf('month').toSQLDate()

    const activeUsers = await Database.from('users')
      .where('is_deleted', false)
      .count('* as count')
      .first()

    const activeDrivers = await Database.from('users')
      .where('role', 'driver')
      .andWhere('is_deleted', false)
      .count('* as count')
      .first()

    const todayRides = await Database.from('rides')
      .where('created_at', '>=', today)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .count('* as count')
      .first()

    const todayRevenue = await Database.from('rides')
      .where('created_at', '>=', today)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .sum('price as total')
      .first()

    // ✅ Moyenne durée en minutes (extrait le nombre depuis la string)
    const avgRideDuration = await Database.from('rides')
      .where('created_at', '>=', today)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .select(Database.raw(`
        AVG(CAST(SUBSTRING_INDEX(duration, ' ', 1) AS UNSIGNED)) as avg_minutes
      `))
      .first()

    // ✅ Moyenne distance
    const avgDistance = await Database.from('rides')
      .where('created_at', '>=', today)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .avg('distance as avg')
      .first()

    // ✅ Total distance
    const totalDistance = await Database.from('rides')
      .where('created_at', '>=', currentMonthStart)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .sum('distance as total')
      .first()

    // ✅ Total durée
    const totalDuration = await Database.from('rides')
      .where('created_at', '>=', currentMonthStart)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .select(Database.raw(`
        SUM(CAST(SUBSTRING_INDEX(duration, ' ', 1) AS UNSIGNED)) as total_minutes
      `))
      .first()

    const cancelledRides = await Database.from('rides')
      .where('created_at', '>=', currentMonthStart)
      .andWhere('status', 'cancelled')
      .count('* as count')
      .first()

    const totalRides = await Database.from('rides')
      .where('created_at', '>=', currentMonthStart)
      .count('* as count')
      .first()

    const cancellationRate = cancelledRides.count && totalRides.count
      ? (cancelledRides.count / totalRides.count) * 100
      : 0

    const vehicleDistribution = await Database.from('rides')
      .where('created_at', '>=', currentMonthStart)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .select('vehicle_type')
      .count('* as count')
      .groupBy('vehicle_type')

    const deliveryRides = await Database.from('rides')
      .where('created_at', '>=', currentMonthStart)
      .andWhere('status', 'completed')
      .andWhere('is_paid', true)
      .andWhereNotNull('recipient')
      .count('* as count')
      .first()

    const deliveryRate = deliveryRides.count && totalRides.count
      ? (deliveryRides.count / totalRides.count) * 100
      : 0

    const recentRides = await Database.from('rides')
      .join('users', 'rides.client_id', 'users.id')
      .where('rides.status', 'completed')
      .where('rides.is_paid', true)
      .orderBy('rides.completed_at', 'desc')
      .limit(5)
      .select([
        'rides.id',
        'rides.price',
        'rides.vehicle_type',
        'users.first_name',
        Database.raw("TIMESTAMPDIFF(MINUTE, rides.created_at, NOW()) as minutes_ago"),
        Database.raw("CASE WHEN rides.recipient IS NOT NULL THEN 'Livraison' ELSE 'Course' END as ride_type")
      ])

    const pendingDrivers = await Database.from('users')
      .where('role', 'driver')
      .andWhere('is_verified', false)
      .count('* as count')
      .first()

    const pendingComplaints = await Database.from('rides')
      .whereNotNull('rating_comment')
      .andWhere('rating', '<', 3)
      .count('* as count')
      .first()

    const stats = {
      mainStats: {
        activeUsers: activeUsers.count || 0,
        activeDrivers: activeDrivers.count || 0,
        todayRides: todayRides.count || 0,
        todayRevenue: todayRevenue.total || 0,
        avgRideDuration: avgRideDuration.avg_minutes || 0,
        avgDistance: avgDistance.avg || 0,
        totalDistance: totalDistance.total || 0,
        totalDuration: totalDuration.total_minutes || 0,
        occupationRate: vehicleDistribution.find(v => v.vehicle_type === 'moto-taxi')?.count || 0,
        cancellationRate: cancellationRate,
        deliveryRate: deliveryRate
      },
      vehicleDistribution: vehicleDistribution.map(v => ({
        type: v.vehicle_type,
        count: v.count
      })),
      recentActivities: recentRides.map(ride => ({
        id: ride.id,
        type: ride.ride_type,
        description: `${ride.first_name} - ${ride.vehicle_type}`,
        time: `Il y a ${ride.minutes_ago} min`,
        amount: ride.price
      })),
      alerts: [
        {
          title: `${pendingDrivers.count} chauffeurs en attente`,
          description: "Validation des documents requis",
          type: "driver_validation"
        },
        {
          title: `${pendingComplaints.count} réclamations`,
          description: "À traiter",
          type: "complaints"
        }
      ]
    }

    return response.ok(stats)
  } catch (error) {
    console.error(error)
    return response.internalServerError({
      message: 'Une erreur est survenue lors de la récupération des statistiques',
      error: error.message
    })
  }
}










// app/Controllers/Http/DashboardController.ts

public async exportData({ response }: HttpContextContract) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Courses');

    // En-têtes
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Chauffeur', key: 'driver', width: 20 },
      { header: 'Véhicule', key: 'vehicle', width: 15 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Prix (FCFA)', key: 'price', width: 15 },
      { header: 'Méthode Paiement', key: 'payment', width: 20 }
    ];

    // Remplissez avec vos données
    const rides = await Database.from('rides')
      .join('users as clients', 'rides.client_id', 'clients.id')
      .leftJoin('users as drivers', 'rides.driver_id', 'drivers.id')
      .select([
        'rides.id',
        'rides.created_at',
        'rides.status',
        'rides.vehicle_type',
        'rides.price',
        'rides.payment_method',
        'clients.first_name as client_name',
        'drivers.first_name as driver_name'
      ]);

    rides.forEach(ride => {
      worksheet.addRow({
        id: ride.id,
        date: DateTime.fromSQL(ride.created_at).toFormat('dd/MM/yyyy HH:mm'),
        client: ride.client_name,
        driver: ride.driver_name || 'Non assigné',
        vehicle: ride.vehicle_type === 'moto-taxi' ? 'Moto-taxi' : 'Tricycle',
        status: ride.status,
        price: ride.price,
        payment: ride.payment_method
      });
    });

    // Configurez la réponse
    response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.header('Content-Disposition', 'attachment; filename="dashboard_export.xlsx"');
    response.header('Access-Control-Allow-Origin', '*'); // Autoriser toutes les origines (à ajuster en production)

    const buffer = await workbook.xlsx.writeBuffer();
    return response.send(buffer);
    
  } catch (error) {
    console.error(error);
    return response.status(500).send({
      message: "Erreur lors de l'exportation",
      error: error.message
    });
  }
}








public async driverPerformance({ response }: HttpContextContract) {
  const currentYear = DateTime.now().year
  
  // Requête pour les moto-taxis
  const motoTaxiRides = await Database.rawQuery(`
    SELECT MONTH(created_at) as month, COUNT(*) as count 
    FROM rides 
    WHERE vehicle_type = 'moto-taxi' 
      AND status = 'completed' 
      AND YEAR(created_at) = ?
    GROUP BY MONTH(created_at)
    ORDER BY month ASC
  `, [currentYear])

  // Requête pour les tricycles
  const tricycleRides = await Database.rawQuery(`
    SELECT MONTH(created_at) as month, COUNT(*) as count 
    FROM rides 
    WHERE vehicle_type = 'tricycle' 
      AND status = 'completed' 
      AND YEAR(created_at) = ?
    GROUP BY MONTH(created_at)
    ORDER BY month ASC
  `, [currentYear])

  // Formatage des données pour avoir un tableau de 12 mois
  const motoTaxiData = Array(12).fill(0)
  const tricycleData = Array(12).fill(0)

  // Traitement des résultats pour les moto-taxis
  motoTaxiRides[0].forEach((ride: any) => {
    motoTaxiData[ride.month - 1] = ride.count
  })

  // Traitement des résultats pour les tricycles
  tricycleRides[0].forEach((ride: any) => {
    tricycleData[ride.month - 1] = ride.count
  })

  return response.json({
    data: {
      motoTaxi: motoTaxiData,
      tricycle: tricycleData
    }
  })
}

}