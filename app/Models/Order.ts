import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import Restaurant from './Restaurant'
import OrderItem from './OrderItem'

export default class Order extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public clientId: number

  @column()
  public restaurantId: number | null

  @column()
  public deliveryAddress: string

  @column()
  public status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

  @column()
  public totalPrice: number

  @column()
  public paymentMethod: 'cash' | 'orange_money' | 'mobile_money'

  @belongsTo(() => User, {
    foreignKey: 'clientId',
  })
  public client: BelongsTo<typeof User>

  @belongsTo(() => Restaurant)
  public restaurant: BelongsTo<typeof Restaurant>

  @hasMany(() => OrderItem)
  public items: HasMany<typeof OrderItem>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}