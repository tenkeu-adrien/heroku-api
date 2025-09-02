// app/Models/Rating.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Ride from './Ride'
import User from './User'

export default class Rating extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public rideId: number

    @column({ columnName: 'user_id' })
  public userId: number

  @column()
  public rating: number

  @column()
  public comment: string | null


  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  // Relations
  @belongsTo(() => Ride)
  public ride: BelongsTo<typeof Ride>

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

}   