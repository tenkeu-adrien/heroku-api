import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import { DateTime } from 'luxon'
import Order from './Order'

export default class WegoMessage extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public orderId: number

  @column()
  public senderId: number

  @column()
  public receiverId: number

  @column()
public isRead: boolean

  @column()
  public content: string

  // @belongsTo(() => User, { foreignKey: 'senderId' })
  // public sender: BelongsTo<typeof User>

  // @belongsTo(() => User, { foreignKey: 'receiverId' })
  // public receiver: BelongsTo<typeof User>

  // @belongsTo(() => Ride)
  // public ride: BelongsTo<typeof Ride>

  @belongsTo(() => Order, { foreignKey: 'order_id' })
  public order: BelongsTo<typeof Order>

  @belongsTo(() => User, { foreignKey: 'sender_id' })
  public sender: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'receiver_id' })
  public receiver: BelongsTo<typeof User>


  

   @column.dateTime({ autoCreate: true })
    public createdAt: DateTime
}
