import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Restaurant from './Restaurant'

export default class Dish extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public description: string

  @column()
  public price: number

  @column()
  public likes: number = 0

  @column()
  public dislikes: number = 0

  @column()
  public restaurantId: number

  @column()
  public images: string // Stocker les URLs en JSON

  @belongsTo(() => Restaurant)
  public restaurant: BelongsTo<typeof Restaurant>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}