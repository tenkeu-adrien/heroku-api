import { DateTime } from 'luxon'
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Ride from './Ride'

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public rideId: number

  @column()
  public commission: number

  @column.dateTime()
  public transactionDate: DateTime

  @belongsTo(() => Ride)
  public ride: BelongsTo<typeof Ride>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}






















