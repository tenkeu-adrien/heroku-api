// app/Models/Ride.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo, hasOne, HasOne, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import Review from './Review'
import Message from './Message'
import PromoCode from './PromoCode'

export default class Ride extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public clientId: number

  @column()
  public driverId: number


  @column()
  public reason?: string | null

  @column()
  public vehicleType: 'moto-taxi' | 'tricycle'

  @column()
  public pickupLocation: string

  @column()
  public destinationLocation: string

  @column()
  public distance?: number

  @column()
  public price?: number

  @column()
  public paymentMethod?: string

  @column()
  public promoCodeId: number | null

  @column()
  public recipient?: string

  @column()
  public duration?: string

  @column.dateTime()
  public endedAt?: DateTime

  @column()
  public status: string | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

  @belongsTo(() => PromoCode)
  public promoCode: BelongsTo<typeof PromoCode>

  @column.dateTime({ autoCreate: false })
  public startedAt: DateTime | null

  @column.dateTime({ autoCreate: false })
  public scheduledAt: DateTime | null

  @column.dateTime({ autoCreate: false })
  public completedAt: DateTime | null

  // Nouveaux champs ajoutés
  @column()
  public driverLatitude?: string | null

  @column()
  public driverLongitude?: string | null

  @column.dateTime()
  public lastPositionUpdate?: DateTime | null

  @column()
  public routeCoordinates?: any | null // Type JSON

  @column()
  public driverToPickupRoute?: any | null // Type JSON


  @belongsTo(() => User, { foreignKey: 'clientId' })
  public client: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'driverId' })
  public driver: BelongsTo<typeof User>

  @column()
  public isPaid: boolean

  @hasOne(() => Review)
  public review: HasOne<typeof Review>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @hasMany(() => Message, { 
    foreignKey: 'ride_id' // Doit correspondre exactement au nom de colonne dans la table messages
  })
  public messages: HasMany<typeof Message>

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}