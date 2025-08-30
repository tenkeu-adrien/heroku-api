/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => {
  return { hello: 'ok c\'est bien ' }
}).prefix('/api/v1')

Route.get('/messagess/', 'MessagesController.getMessages').prefix("/api/v1")


Route.group(() => {
  Route.post('/register', 'AuthControllers.register')
  Route.post('/login/', 'AuthControllers.login')
  Route.post('/logout', 'AuthControllers.logout')
  Route.get('/me', 'AuthControllers.me')

  Route.get('pricing', 'AuthControllers.index')
  Route.put('pricing/:id', 'AuthControllers.update')
    Route.get('pricing/:vehicule_id', 'AuthControllers.show')

Route.get('/finance/stats', 'UsersController.getFinancialStats');
  Route.get('/users', 'UsersController.index')
   Route.get('/user/profile', 'AuthControllers.profile')
  // Route.get('/users/:id', 'UsersController.indexx')
  Route.get('/dashboard/financial-stats', 'AuthControllers.financialStats')
  Route.get('/users/show/:id', 'UsersController.show')
  Route.patch('/users/delete', 'UsersController.destroy').middleware('auth')
  Route.patch('/users/update/:id', 'UsersController.updated')
  Route.post('/users/:user_id/promo-codes', 'UsersController.promo')
  Route.post('/users/:id/fcm-token', 'UsersController.updateFcmToken')
  Route.get('/ratings/me', 'RatingsController.getUserRatings').middleware('auth')
  Route.post('/users/check-active-promos', 'UsersController.checkActivePromos').middleware('auth')
  // Route.get('/drivers/available', 'UsersController.availableDrivers')
  Route.get('/users/export', 'UsersController.export')
  Route.get('user/:id/transactions', 'TransactionsController.getUserTransactions')
  Route.get('drivers/:id/stats', 'StatsController.index')
  Route.get('/users/:id/completed-rides', 'RideController.getUserCompletedRides');
  Route.get("/drivers/available" , 'UsersController.getDriver')
    // Récupérer la promo active d'un utilisateur spécifique
    Route.get('/users/:id/rides-stats', 'RidesController.getUserRidesStats').middleware('auth');
    Route.get('/:id/active-promo', 'UsersController.getActivePromo')
  Route.post('/refresh', 'AuthControllers.refresh').middleware('auth')
  Route.post('/forgot-password', 'AuthControllers.forgotPassword')
  Route.post('/reset-password', 'AuthControllers.resetPassword')
  // Route.get('/restaurants', 'RestaurantsController.index')
  // Route.get('/restaurants/:id', 'RestaurantsController.show')
  // Dishes
  Route.patch('/dishes/:id/like', 'DishesController.like')
  Route.patch('/dishes/:id/dislike', 'DishesController.dislike')
  Route.post('/dishes/:id', 'RestaurantsController.addDish')
  // Orders
  Route.post('/orders', 'OrdersController.store').middleware('auth')
  Route.get('/orders', 'OrdersController.index')
  Route.post('/ratings', 'RatingsController.store').middleware('auth')

  Route.get('/orders/:id', 'OrdersController.show')
  // Route.get('/orders/export', 'OrdersController.export')
  Route.patch('/orders/:id/delivered', 'OrdersController.markAsDelivered')
  Route.get('/restaurants', 'RestaurantsController.index')
  Route.post('/restaurants', 'RestaurantsController.store')
  Route.patch('/restaurants/:id', 'RestaurantsController.update')
  Route.get('/restaurants/export', 'RestaurantsController.export')
  Route.post('/restaurants/:id/toggle-favorite', 'RestaurantsController.toggleFavorite')
  Route.get('/restaurants/:id/dishes', 'DishesController.index')
  Route.delete("/restaurants/:id/dishes/:dish_id", "RestaurantsController.destroy")
  Route.delete('/restaurants/:id', 'RestaurantsController.destroy')
  Route.patch("/restaurants/:id/toggle-active", "RestaurantsController.toggleActive")
  Route.delete("dishes/:id", "RestaurantsController.deleteDish")
  Route.patch("dishes/:id", "RestaurantsController.updateDish")
  Route.get('/drivers/:id/ratings', 'RidesController.getDriverRatings')
}).prefix('/api/v1')




Route.group(() => {
  Route.get('/messages', 'MessagesController.index')
  Route.get('/messages/contacts', 'MessagesController.getContacts').middleware('auth')
  Route.post('/messages', 'MessagesController.store')

  Route.get('/rides/:rideId/messages', 'MessagesController.indexx')
  Route.post('/rides/:rideId/messages', 'MessagesController.storee')
  Route.patch('/rides/:rideId/messages/read', 'MessagesController.markMessagesAsRead')
}).prefix('/api/v1').middleware('auth')


Route.group(() => {
  // Authentification

  // Client routes
  Route.group(() => {
    // Courses
    Route.patch('/rides/:id/status', 'RidesController.updateStatus').middleware("auth")
    Route.patch("/rides/:id/complete" ,"RidesController.complete").middleware('auth')
    Route.post('/rides', 'RidesController.store').middleware('auth')
    Route.get('/rides', 'RidesController.indexx').middleware('auth')
    Route.get('/rides/history', 'RidesController.index')
    Route.get('/rides/historyy', 'RidesController.history')
    Route.get('/ridess/', 'RidesController.indexx').middleware('auth')
    Route.patch('/rides/:id/cancel', 'RidesController.cancelRide').middleware('auth')
    Route.get('/rides/:id/stats', 'RidesController.getRideById')
    Route.get('/rides/user/:id', 'RidesController.show')
   
    // Route.get('/rides/:rideId/messages', 'MessagesController.getRideMessages')
    // Route.put('/rides/:rideId/messages/read', 'MessagesController.markMessagesAsRead')
    Route.get('/rides/export', 'RidesController.export')

    //  Route.patch('/rides/:id/status', 'RideController.updateStatus').middleware('auth')
  Route.patch('/rides/:id/position', 'RidesController.updatePosition').middleware('auth')


Route.post('/drivers/available-notify', 'RidesController.notifyAvailableDrivers')

// start/routes.ts
Route.post('/notifications/token', 'UsersController.store').middleware('auth');

    Route.get('/rides/revenue-stats', 'RidesController.revenueStats');
Route.get('/rides/payment-distribution', 'RidesController.paymentDistribution');

     Route.group(() => { Route.get('/mee', 'AuthControllers.me').middleware('auth')

    Route.get('/orders/current', 'OrdersController.current')
    Route.patch('/orders/:id/cancel', 'OrdersController.cancel')
    Route.patch("orders/:id" ,'OrdersController.update')
    
  })
  // .middleware('auth:api')
  // .middleware(['auth', 'deliveryMan'])
  // Admin routes
  // Route.group(() => {
  //   // Route.get('/orders', 'OrdersController.index')
  //   Route.get('/orders/:id/stats', 'OrdersController.getRideById')
  //   Route.patch('/orders/:id/status', 'OrdersController.updateStatus')
  // })
  // .middleware(['auth', 'admin'])


  Route.group(() => {
  Route.get('/drivers/top', 'RidesController.topDrivers')
  Route.get('/clients/top', 'RidesController.topClients')
  Route.get('/rides/stats', 'RidesController.rideStats')
})



// Transactions
Route.get('/transactions', 'TransactionsController.index')
Route.post('/transactions', 'TransactionsController.store')
Route.get('/transactions/:id', 'TransactionsController.show')

// Driver Payouts
Route.get('/driver-payouts', 'DriverPayoutsController.index')
Route.post('/driver-payouts', 'DriverPayoutsController.store')
Route.patch('/driver-payouts/:id/status', 'DriverPayoutsController.updateStatus')








    // Paiements
    Route.post('/payments/initiate', 'PaymentController.initiate')
    Route.get('/payments/:id/verify', 'PaymentController.verify')
  })


  // .middleware(['auth', 'checkRole:client'])
  // Driver routes
  Route.group(() => {
    Route.get('/rides/available', 'RidesController.get')
    Route.post('/rides/:id/accept', 'RidesController.accept')
    Route.post('/rides/:id/complete', 'RidesController.complete')
  })
  // .middleware(['auth', 'checkRole:driver'])
  // Delivery man routes

  // .middleware(['auth', 'checkRole:delivery_man'])
  // Admin routes
// start/routes.ts





// start/routes.ts
// Route.group(() => {
//   // Routes pour les évaluations
//   Route.post('/ratings', 'RatingsController.store')
//   Route.get('/ratings', 'RatingsController.index')
//   Route.get('/ratings/:id', 'RatingsController.show')
// })




Route.group(() => {
  Route.get('/dashboard/admin-stats', 'AdminDashboard.getDashboardStats')
  Route.get('/dashboard/driver-performance', 'AdminDashboard.driverPerformance')
  Route.get('/dashboard/platform-stats', 'AdminDashboard.platformStats')
  Route.get('/export', 'AdminDashboard.exportData')
  Route.get('/dashboard/ride-metrics', 'AdminDashboard.rideMetrics')
})
  // .middleware(['auth', 'checkRole:admin'])
  // Callback Orange Money
  Route.post('/om/callback', 'PaymentController.callback')


}).prefix('/api/v1')






Route.group(() => {
  // Litiges
  Route.get('/litiges', 'LitigesController.index')
  Route.get('/litiges/:id', 'LitigesController.show')
  Route.put('/litiges/:id', 'LitigesController.update')

  // Support
  Route.get('/tickets', 'SupportController.index')
  Route.post('/tickets', 'SupportController.store')
  Route.post('/tickets/:id/assign', 'SupportController.assign')

  // Rapports
  Route.post('/rapports/generate', 'RapportsController.generate')
}).prefix('api/v1').middleware(['auth'])