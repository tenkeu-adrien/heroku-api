import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Orders extends BaseSchema {
  protected tableName = 'orders'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('client_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
       table.integer('driver_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.integer('restaurant_id').unsigned().references('id').inTable('restaurants').onDelete('CASCADE')
      table.string('delivery_address').notNullable()
      table.enum('status', ['pending', 'preparing', 'delivering', 'delivered', 'cancelled']).defaultTo('pending')
      table.float('total_price').notNullable()
      table.boolean('is_paid').defaultTo(false)
      table.enum('payment_method', ['cash', 'orange_money', 'mobile_money']).notNullable()
     table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}