import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Orders extends BaseSchema {
  protected tableName = 'orders'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('client_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('delivery_address').notNullable()
      table.enum('status', ['pending', 'preparing', 'delivering', 'delivered', 'cancelled']).defaultTo('pending')
      table.decimal('total_price', 10, 2).notNullable()
      table.timestamps(true)
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}