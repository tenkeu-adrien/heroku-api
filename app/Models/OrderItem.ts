import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Order from './Order'
import Dish from './Dish'

export default class OrderItem extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public orderId: number

  @column()
  public dishId: number

  @column()
  public quantity: number

  @column()
  public unitPrice: number

  @belongsTo(() => Order)
  public order: BelongsTo<typeof Order>

  @belongsTo(() => Dish)
  public dish: BelongsTo<typeof Dish>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}