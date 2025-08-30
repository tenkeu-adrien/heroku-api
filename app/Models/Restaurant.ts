import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import Dish from './Dish'

export default class Restaurant extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public cuisine: string

    @column()
  public phone: string

    @column()
  public address: string

  @column()
  public rating: number

  @column()
  public isFavorite: boolean

  @column()
  public createdBy: number

  @column()
  public isActive: boolean

  @column()
  public deliveryTime: string

  @column()
  public image: string

  @hasMany(() => Dish)
  public dishes: HasMany<typeof Dish>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}